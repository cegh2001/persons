/**
 * Scan-specific DB operations for the Gemini handwritten-list ingestion flow.
 *
 * Provides fuzzy match lookup used by the scan preview endpoint and a
 * transactional batch commit used by the commit endpoint. Both functions
 * run against the shared libsql client from `@/lib/db`.
 */

import { getDb, type PersonRow } from "@/lib/db";
import type { ScanCommitRow } from "@/lib/validation";

// ── Match classification ───────────────────────────────────────────────

export type MatchStatus = "exact" | "partial" | "none";

export interface MatchResult {
  status: MatchStatus;
  existingPerson?: PersonRow;
}

/**
 * Fuzzy lookup used by the scan preview endpoint.
 *
 * Returns ALL rows where either the name contains `name` (case-insensitive
 * substring via LIKE) OR the document_id matches exactly. Callers classify
 * each result in JavaScript to keep the logic transparent:
 *   - exact:    one row where name matches AND document_id matches (or
 *               document_id is empty on the extracted side)
 *   - partial:  one or more rows where name OR document_id matches, but
 *               not both
 *   - none:     no rows matched
 *
 * Returns the raw rows so the caller can decide.
 */
export async function matchPersonRecord(
  name: string,
  docId: string
): Promise<PersonRow[]> {
  await getDb();
  const trimmedName = name.trim();
  const trimmedDoc = docId.trim();

  // If both inputs are empty, there's nothing meaningful to match against.
  if (!trimmedName && !trimmedDoc) return [];

  const client = await getDb();
  const res = await client.execute({
    sql: "SELECT * FROM persons WHERE name LIKE '%' || ? || '%' OR document_id = ?",
    args: [trimmedName, trimmedDoc]
  });
  return res.rows as unknown as PersonRow[];
}

/**
 * Convenience: classify a set of match candidates against the extracted
 * name + document_id. Pure function — no DB access.
 */
export function classifyMatch(
  name: string,
  docId: string,
  candidates: PersonRow[]
): MatchResult {
  const trimmedName = name.trim().toLowerCase();
  const trimmedDoc = docId.trim();

  if (candidates.length === 0) {
    return { status: "none" };
  }

  const exact = candidates.find(
    (p) =>
      p.name.toLowerCase() === trimmedName &&
      (trimmedDoc === "" || p.document_id === trimmedDoc)
  );
  if (exact) {
    return { status: "exact", existingPerson: exact };
  }

  // Any candidate is a "partial" — we surface the first one for the UI.
  return { status: "partial", existingPerson: candidates[0] };
}

// ── Batch commit ───────────────────────────────────────────────────────

export interface CommitResult {
  committed: number;
}

/**
 * Commit a batch of scan rows in a single SQLite transaction.
 *
 * For each row:
 *   - action = "update" (exact match):  UPDATE the existing row — append
 *                                       notes with " | ", set flags to
 *                                       the row's values, preserve other
 *                                       fields.
 *   - action = "merge" (partial match):  UPDATE the existing row with the
 *                                       row's full set of values,
 *                                       appending notes.
 *   - action = "create" (new / partial): INSERT a new row.
 *
 * The transaction rolls back on ANY failure so partial writes never
 * reach the database. Returns the count of successful operations.
 */
export async function commitScanBatch(rows: ScanCommitRow[]): Promise<CommitResult> {
  if (rows.length === 0) {
    return { committed: 0 };
  }

  const client = await getDb();
  let committed = 0;

  try {
    await client.execute("BEGIN IMMEDIATE");

    for (const row of rows) {
      const docId = row.document_id || null;
      const isVulnerable = row.is_vulnerable ? 1 : 0;
      // If flags are explicitly set, use them. Otherwise fall back to `type`
      // so the Zod-validated `type` field is never dead — it drives the DB
      // flags when the client doesn't send the booleans directly.
      const receivedSupplies =
        (row.received_supplies || row.type === "supplies" || row.type === "both") ? 1 : 0;
      const receivedMedical =
        (row.received_medical || row.type === "medical" || row.type === "both") ? 1 : 0;
      const trimmedNotes = (row.notes ?? "").trim();
      const rawName = docId ? `${row.name} ${docId}` : row.name;

      if (row.action === "update" || row.action === "merge") {
        if (row.existingPersonId === undefined) {
          throw new Error(
            `Row with action "${row.action}" requires existingPersonId.`
          );
        }
        // Re-read existing row — we need current notes (for append) AND
        // current location (which we preserve; the extracted sector is
        // recorded as context inside the notes instead of overwriting).
        const existingRes = await client.execute({
          sql: "SELECT notes, location FROM persons WHERE id = ?",
          args: [row.existingPersonId]
        });
        if (existingRes.rows.length === 0) {
          throw new Error(
            `Existing person not found for id ${row.existingPersonId}.`
          );
        }
        const existingNotes = String(existingRes.rows[0].notes ?? "");
        const existingLocation = String(existingRes.rows[0].location ?? "");

        // If the extracted sector differs from the stored one, append it
        // as context to the delivery note (e.g. "Entrega de suministros (San Julian)").
        const extractedLocation = row.location.trim();
        const locationSuffix =
          extractedLocation && extractedLocation !== existingLocation
            ? ` (${extractedLocation})`
            : "";

        const noteWithLocation = trimmedNotes
          ? `${trimmedNotes}${locationSuffix}`
          : locationSuffix
            ? locationSuffix.slice(1) // drop leading space: "(San Julian)"
            : "";

        const finalNotes =
          noteWithLocation === ""
            ? existingNotes
            : existingNotes === ""
              ? noteWithLocation
              : `${existingNotes} | ${noteWithLocation}`;

        await client.execute({
          sql: "UPDATE persons SET raw_name = ?, name = ?, document_id = ?, location = ?, is_vulnerable = ?, notes = ?, received_supplies = ?, received_medical = ? WHERE id = ?",
          args: [
            rawName,
            row.name,
            docId,
            existingLocation,
            isVulnerable,
            finalNotes,
            receivedSupplies,
            receivedMedical,
            row.existingPersonId
          ]
        });
      } else {
        // action === "create"
        await client.execute({
          sql: "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [
            rawName,
            row.name,
            docId,
            row.location,
            isVulnerable,
            trimmedNotes,
            receivedSupplies,
            receivedMedical
          ]
        });
      }
      committed += 1;
    }

    await client.execute("COMMIT");
    return { committed };
  } catch (err) {
    try {
      await client.execute("ROLLBACK");
    } catch (rollbackErr) {
      // Log the rollback failure but propagate the original error.
      console.error("Rollback failed after commit error:", rollbackErr);
    }
    throw err;
  }
}
