/**
 * Scan-specific DB operations for the Gemini handwritten-list ingestion flow.
 *
 * Provides fuzzy match lookup used by the scan preview endpoint and a
 * transactional batch commit used by the commit endpoint. Both functions
 * run against the shared libsql client from `@/lib/db`.
 */

import { getDb, type PersonRow } from "@/lib/db";
import type { ScanCommitRow } from "@/lib/validation";
import type { InValue } from "@libsql/client";

// ── Error classification (shared by scan + commit endpoints) ────────────

export interface ScanErrorInfo {
  status: number;
  userMessage: string;
  code: string;
}

/**
 * Inspect a thrown error and return a safe, client-friendly diagnostic.
 * Never leaks stack traces or raw error messages to the client.
 */
export function classifyScanError(err: unknown): ScanErrorInfo {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";

  // Business-logic validation errors — surface to the user as 400.
  if (
    message.includes("requires existingPersonId") ||
    message.includes("Existing person not found") ||
    message.includes("validation") ||
    message.includes("invalid")
  ) {
    return {
      status: 400,
      userMessage: message,
      code: "VALIDATION",
    };
  }

  // DB connection / query failures (libsql / Turso / SQLite)
  if (
    name === "LibsqlError" ||
    /turso|libsql|database|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection/i.test(message)
  ) {
    return {
      status: 502,
      userMessage: "Error de conexión a la base de datos. Reintentá en unos segundos.",
      code: "DB_CONNECTION",
    };
  }

  // Timeout / abort
  if (name === "AbortError" || /timeout|timed\s*out/i.test(message)) {
    return {
      status: 504,
      userMessage: "El servidor tardó demasiado. Intentá de nuevo con menos datos.",
      code: "TIMEOUT",
    };
  }

  // Catch-all — log the real error server-side but don't leak to client
  console.error("Unclassified scan error:", name, message);
  return {
    status: 500,
    userMessage: "Error interno. Si persiste, contactá al administrador.",
    code: "INTERNAL",
  };
}

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

  // ── Pre-read existing rows for update/merge actions ──────────────
  // We need current notes (for append) and location (to preserve it).
  // These reads happen BEFORE the transaction so the batch stays pure writes.
  const updateRows = rows.filter((r) => r.action === "update" || r.action === "merge");
  const existingMap = new Map<number, { notes: string; location: string }>();

  await Promise.all(
    updateRows.map(async (row) => {
      if (row.existingPersonId === undefined) return;
      try {
        const res = await client.execute({
          sql: "SELECT notes, location FROM persons WHERE id = ?",
          args: [row.existingPersonId],
        });
        if (res.rows.length > 0) {
          existingMap.set(row.existingPersonId, {
            notes: String(res.rows[0].notes ?? ""),
            location: String(res.rows[0].location ?? ""),
          });
        }
      } catch {
        // If the pre-read fails, we'll throw during batch execution
        // when the UPDATE fails with 0 rows affected.
      }
    })
  );

  // ── Build batch statements ───────────────────────────────────────
  // All writes go into a single batch for atomic execution.
  // Turso HTTP: batch() sends all statements in one pipeline request.
  // SQLite local: batch() executes sequentially in the same connection.
  const statements: Array<string | { sql: string; args: InValue[] }> = [
    "BEGIN IMMEDIATE",
  ];

  for (const row of rows) {
    const docId = row.document_id || null;
    const isVulnerable = row.is_vulnerable ? 1 : 0;
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

      const existing = existingMap.get(row.existingPersonId);
      if (!existing) {
        throw new Error(
          `Existing person not found for id ${row.existingPersonId}.`
        );
      }

      const extractedLocation = row.location.trim();
      const locationSuffix =
        extractedLocation && extractedLocation !== existing.location
          ? ` (${extractedLocation})`
          : "";

      const noteWithLocation = trimmedNotes
        ? `${trimmedNotes}${locationSuffix}`
        : locationSuffix
          ? locationSuffix.slice(1)
          : "";

      const finalNotes =
        noteWithLocation === ""
          ? existing.notes
          : existing.notes === ""
            ? noteWithLocation
            : `${existing.notes} | ${noteWithLocation}`;

      statements.push({
        sql: "UPDATE persons SET raw_name = ?, name = ?, document_id = ?, location = ?, is_vulnerable = ?, notes = ?, received_supplies = ?, received_medical = ? WHERE id = ?",
        args: [
          rawName,
          row.name,
          docId,
          existing.location, // preserve existing location
          isVulnerable,
          finalNotes,
          receivedSupplies,
          receivedMedical,
          row.existingPersonId,
        ],
      });
    } else {
      // action === "create"
      statements.push({
        sql: "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          rawName,
          row.name,
          docId,
          row.location,
          isVulnerable,
          trimmedNotes,
          receivedSupplies,
          receivedMedical,
        ],
      });
    }
  }

  statements.push("COMMIT");

  // ── Execute batch ────────────────────────────────────────────────
  try {
    const results = await client.batch(statements, "write");
    // batch() returns results for all statements; the first is BEGIN,
    // last is COMMIT. The middle results are our writes.
    // Count successful writes (each should affect 1 row).
    let committed = 0;
    for (let i = 1; i < results.length - 1; i++) {
      if (Number(results[i].rowsAffected) > 0) {
        committed++;
      }
    }
    return { committed };
  } catch (err) {
    throw err; // Let the caller classify the error
  }
}
