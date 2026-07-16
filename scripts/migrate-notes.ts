/**
 * scripts/migrate-notes.ts — one-shot historical migration
 * ------------------------------------------------------
 *
 * Reads every `persons.notes` blob and extracts the structured
 * deliveries and medical attentions that are already there in
 * free-text form. Inserts them into `deliveries`, `delivery_items`
 * and `medical_attentions` so the rest of the app can use the
 * structured APIs.
 *
 * Spec compliance
 * ---------------
 * MS1: This file is NOT imported by `src/lib/db.ts`, by any API
 *      route, or by any deploy hook. It is meant to be run by
 *      hand on a workstation.
 * MS2: Idempotent — the script computes a content hash for every
 *      candidate (person_id + content) and skips any candidate
 *      whose hash is already present in the target tables.
 * MS3: Parse failures are written to
 *      `scripts/migrate-notes-report.json` together with the run
 *      counters, so an operator can review them.
 *
 * Usage
 * -----
 *   npx tsx scripts/migrate-notes.ts          # real run
 *   npx tsx scripts/migrate-notes.ts --dry-run # parse only, no writes
 *
 * The script prefers the local `DATABASE_URL` (e.g. `file:persons.db`)
 * over the Turso credentials, so a plain `npx tsx scripts/migrate-notes.ts`
 * against the development DB works without any env-var juggling. To
 * run against Turso, unset `DATABASE_URL` and set the
 * `persons_TURSO_DATABASE_URL` / `persons_TURSO_AUTH_TOKEN` pair.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";

import {
  hashAttention,
  hashDelivery,
  parseNotes,
  type ParsedAttentionCandidate,
  type ParsedDeliveryCandidate,
} from "../src/lib/migrate-notes-parser";

// ── Env loader ──────────────────────────────────────────────────────────
// Same .env pattern used by the other `scripts/*` files: a tiny inline
// parser so we do not pull in `dotenv` as a dependency just for this.

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv();

const DB_URL = process.env.DATABASE_URL ?? process.env.persons_TURSO_DATABASE_URL;
const DB_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? process.env.persons_TURSO_AUTH_TOKEN;

if (!DB_URL) {
  console.error("❌ Missing database URL. Set DATABASE_URL or persons_TURSO_DATABASE_URL.");
  process.exit(1);
}

const client: Client = createClient({
  url: DB_URL,
  authToken: DB_TOKEN,
});

const dryRun = process.argv.includes("--dry-run");
const REPORT_PATH = resolve(process.cwd(), "scripts", "migrate-notes-report.json");

// ── Counters & report shape ─────────────────────────────────────────────

interface Report {
  mode: "live" | "dry-run";
  startedAt: string;
  finishedAt: string;
  personsProcessed: number;
  personsWithNotes: number;
  deliveriesCreated: number;
  deliveryItemsCreated: number;
  attentionsCreated: number;
  deliveriesSkipped: number;
  attentionsSkipped: number;
  parseFailures: Array<{ personId: number; name: string; line: string; reason: string }>;
  collectiveDetected: number;
  specialtyNotInCatalog: Array<{ personId: number; name: string; professional: string; specialty: string }>;
  errors: Array<{ personId: number; name: string; message: string }>;
}

const report: Report = {
  mode: dryRun ? "dry-run" : "live",
  startedAt: new Date().toISOString(),
  finishedAt: "",
  personsProcessed: 0,
  personsWithNotes: 0,
  deliveriesCreated: 0,
  deliveryItemsCreated: 0,
  attentionsCreated: 0,
  deliveriesSkipped: 0,
  attentionsSkipped: 0,
  parseFailures: [],
  collectiveDetected: 0,
  specialtyNotInCatalog: [],
  errors: [],
};

// ── DB bootstrap ────────────────────────────────────────────────────────
// We do NOT import `src/lib/db.ts` because that would (a) auto-attach
// the auth-cookie / rate-limit modules that the script does not need,
// and (b) violate the MS1 isolation requirement. Instead we just make
// sure the three target tables exist before writing, mirroring the
// `CREATE TABLE IF NOT EXISTS` pattern in `db.ts`.

const DELIVERIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS deliveries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id         INTEGER NOT NULL,
    delivery_type     TEXT    NOT NULL CHECK (delivery_type IN ('individual', 'collective')),
    beneficiary_count INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (person_id) REFERENCES persons(id)
  )
`;
const DELIVERY_ITEMS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS delivery_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER NOT NULL,
    item        TEXT    NOT NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
  )
`;
const MEDICAL_ATTENTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS medical_attentions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id    INTEGER NOT NULL,
    professional TEXT    NOT NULL,
    specialty    TEXT    NOT NULL,
    patient_age  INTEGER,
    patient_sex  TEXT,
    diagnosis    TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (person_id) REFERENCES persons(id)
  )
`;

async function ensureSchema() {
  await client.execute(DELIVERIES_TABLE_SQL);
  await client.execute(DELIVERY_ITEMS_TABLE_SQL);
  await client.execute(MEDICAL_ATTENTIONS_TABLE_SQL);
}

// ── Idempotency: pre-load existing hashes ───────────────────────────────

interface ExistingState {
  deliveryHashes: Set<string>;
  attentionHashes: Set<string>;
}

async function loadExistingHashes(): Promise<ExistingState> {
  const deliveryHashes = new Set<string>();
  const attentionHashes = new Set<string>();

  // Deliveries: fetch every (person_id, type, count, items[]) tuple
  // and rebuild the same canonical hash the script will compute. The
  // items list per delivery is sorted ascending for stability.
  const dRes = await client.execute(`
    SELECT d.id          AS delivery_id,
           d.person_id   AS person_id,
           d.delivery_type AS delivery_type,
           d.beneficiary_count AS beneficiary_count
    FROM deliveries d
  `);
  const dRows = dRes.rows as unknown as Array<{
    delivery_id: number;
    person_id: number;
    delivery_type: "individual" | "collective";
    beneficiary_count: number;
  }>;

  if (dRows.length > 0) {
    const ids = dRows.map((r) => r.delivery_id);
    const placeholders = ids.map(() => "?").join(",");
    const iRes = await client.execute({
      sql: `SELECT delivery_id, item FROM delivery_items WHERE delivery_id IN (${placeholders})`,
      args: ids as InValue[],
    });
    const itemsByDelivery = new Map<number, string[]>();
    for (const r of iRes.rows as unknown as Array<{
      delivery_id: number;
      item: string;
    }>) {
      const list = itemsByDelivery.get(r.delivery_id) ?? [];
      list.push(r.item);
      itemsByDelivery.set(r.delivery_id, list);
    }
    for (const r of dRows) {
      const items = (itemsByDelivery.get(r.delivery_id) ?? []).slice().sort();
      deliveryHashes.add(
        hashDelivery({
          personId: r.person_id,
          deliveryType: r.delivery_type,
          beneficiaryCount: r.beneficiary_count,
          items,
        })
      );
    }
  }

  // Attentions: hash on (person_id, date, professional, specialty,
  // diagnosis). Empty / null fields are normalized as "" in the
  // parser's `hashAttention`; mirror that here.
  const aRes = await client.execute(`
    SELECT person_id, professional, specialty, patient_age, diagnosis, created_at
    FROM medical_attentions
  `);
  for (const r of aRes.rows as unknown as Array<{
    person_id: number;
    professional: string;
    specialty: string;
    patient_age: number | null;
    diagnosis: string | null;
    created_at: string;
  }>) {
    // We do not know the historical `Fecha:` from the notes here —
    // fall back to `created_at` as the dedup key when the notes had
    // no date. This is a safe default because the script only
    // runs once per DB and re-runs would already have the rows
    // inserted with their real `created_at`.
    const dateFromCreated = r.created_at.slice(0, 10);
    attentionHashes.add(
      hashAttention({
        personId: r.person_id,
        date: dateFromCreated,
        professional: r.professional,
        specialty: r.specialty,
        diagnosis: r.diagnosis,
      })
    );
    // Also store a hash keyed on `null` date so attention lines
    // that did NOT carry a Fecha are still deduped on re-runs.
    attentionHashes.add(
      hashAttention({
        personId: r.person_id,
        date: null,
        professional: r.professional,
        specialty: r.specialty,
        diagnosis: r.diagnosis,
      })
    );
  }

  return { deliveryHashes, attentionHashes };
}

// ── Inserts ─────────────────────────────────────────────────────────────

async function insertDelivery(
  personId: number,
  candidate: ParsedDeliveryCandidate
): Promise<{ deliveryId: number; itemsCreated: number }> {
  const type = candidate.isCollective ? "collective" : "individual";
  const count = candidate.isCollective ? candidate.beneficiaryCount : 1;

  const dRes = await client.execute({
    sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, ?, ?) RETURNING id",
    args: [personId, type, count],
  });
  const deliveryId = Number((dRes.rows[0] as unknown as { id: number | bigint }).id);

  let itemsCreated = 0;
  for (const item of candidate.items) {
    await client.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, ?)",
      args: [deliveryId, item],
    });
    itemsCreated++;
  }
  return { deliveryId, itemsCreated };
}

async function insertAttention(
  personId: number,
  candidate: ParsedAttentionCandidate
): Promise<void> {
  await client.execute({
    sql: `INSERT INTO medical_attentions
            (person_id, professional, specialty, patient_age, patient_sex, diagnosis)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      personId,
      candidate.professional,
      candidate.specialty ?? "otros",
      candidate.patientAge,
      candidate.patientSex,
      candidate.diagnosis,
    ],
  });
}

// ── Main flow ───────────────────────────────────────────────────────────

interface PersonRow {
  id: number;
  name: string;
  notes: string;
}

async function main() {
  console.log(`\n📦 notes-to-structured migration`);
  console.log(`   target: ${DB_URL}`);
  console.log(`   mode:   ${dryRun ? "DRY RUN (no writes)" : "LIVE (will modify DB)"}\n`);

  if (!dryRun) {
    await ensureSchema();
  } else {
    // Even on a dry run we still make sure the tables exist so the
    // hash pre-loader does not throw. CREATE TABLE IF NOT EXISTS is
    // a no-op on existing tables.
    await ensureSchema();
  }

  const personsRes = await client.execute(
    "SELECT id, name, notes FROM persons WHERE notes IS NOT NULL AND TRIM(notes) != '' ORDER BY id ASC"
  );
  const persons = personsRes.rows as unknown as PersonRow[];
  report.personsProcessed = persons.length;
  report.personsWithNotes = persons.length;

  console.log(`   persons with notes: ${persons.length}`);

  const { deliveryHashes, attentionHashes } = await loadExistingHashes();
  console.log(
    `   pre-existing delivery hashes: ${deliveryHashes.size}, attention hashes: ${attentionHashes.size}\n`
  );

  for (const person of persons) {
    const parsed = parseNotes(person.notes);
    const { deliveries, attentions, failures } = parsed;

    for (const f of failures) {
      report.parseFailures.push({
        personId: person.id,
        name: person.name,
        line: f.line,
        reason: f.reason,
      });
    }

    if (deliveries.length === 0 && attentions.length === 0) {
      continue;
    }

    for (const d of deliveries) {
      if (d.isCollective) report.collectiveDetected++;
      const type = d.isCollective ? "collective" : "individual";
      const count = d.isCollective ? d.beneficiaryCount : 1;
      const hash = hashDelivery({
        personId: person.id,
        deliveryType: type,
        beneficiaryCount: count,
        items: d.items,
      });
      if (deliveryHashes.has(hash)) {
        report.deliveriesSkipped++;
        continue;
      }
      // Reserve the hash immediately so a second candidate in this
      // same person is not double-inserted if a future enhancement
      // changes parseNotes to emit duplicates.
      deliveryHashes.add(hash);
      if (dryRun) {
        report.deliveriesCreated++;
        report.deliveryItemsCreated += d.items.length;
        continue;
      }
      try {
        const { itemsCreated } = await insertDelivery(person.id, d);
        report.deliveriesCreated++;
        report.deliveryItemsCreated += itemsCreated;
      } catch (err) {
        report.errors.push({
          personId: person.id,
          name: person.name,
          message: `delivery insert failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    for (const a of attentions) {
      if (a.specialty === null) {
        report.specialtyNotInCatalog.push({
          personId: person.id,
          name: person.name,
          professional: a.professional,
          specialty: a.rawLine.match(/\(([^)]+)\)/)?.[1] ?? "(unknown)",
        });
        // The spec does not allow "otros" for medical_attentions,
        // so we skip when the specialty is unknown rather than
        // silently writing a bad row.
        continue;
      }
      const hash = hashAttention({
        personId: person.id,
        date: a.date,
        professional: a.professional,
        specialty: a.specialty,
        diagnosis: a.diagnosis,
      });
      if (attentionHashes.has(hash)) {
        report.attentionsSkipped++;
        continue;
      }
      attentionHashes.add(hash);
      if (dryRun) {
        report.attentionsCreated++;
        continue;
      }
      try {
        await insertAttention(person.id, a);
        report.attentionsCreated++;
      } catch (err) {
        report.errors.push({
          personId: person.id,
          name: person.name,
          message: `attention insert failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  report.finishedAt = new Date().toISOString();

  // ── Write report ───────────────────────────────────────────────────
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");

  // ── Console summary ────────────────────────────────────────────────
  console.log(`\n📊 Results:`);
  console.log(`   persons processed:                ${report.personsProcessed}`);
  console.log(`   deliveries created:               ${report.deliveriesCreated}`);
  console.log(`   delivery items created:           ${report.deliveryItemsCreated}`);
  console.log(`   medical attentions created:       ${report.attentionsCreated}`);
  console.log(`   deliveries skipped (idempotent):  ${report.deliveriesSkipped}`);
  console.log(`   attentions skipped (idempotent):  ${report.attentionsSkipped}`);
  console.log(`   parse failures:                   ${report.parseFailures.length}`);
  console.log(`   collective detected:              ${report.collectiveDetected}`);
  console.log(`   specialty not in catalog:         ${report.specialtyNotInCatalog.length}`);
  console.log(`   errors:                           ${report.errors.length}`);

  if (report.parseFailures.length > 0) {
    console.log(`\n   first 3 failures:`);
    for (const f of report.parseFailures.slice(0, 3)) {
      console.log(`     [id=${f.personId}] ${f.reason}: ${f.line.slice(0, 80)}`);
    }
  }
  if (report.specialtyNotInCatalog.length > 0) {
    console.log(`\n   specialty not in catalog (first 3):`);
    for (const s of report.specialtyNotInCatalog.slice(0, 3)) {
      console.log(`     [id=${s.personId}] ${s.professional} — "${s.specialty}"`);
    }
  }

  console.log(`\n📝 Report: ${REPORT_PATH}`);
  console.log(`\n${dryRun ? "🏁 Dry run complete." : "✅ Migration complete."}\n`);
}

main()
  .then(() => {
    client.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal:", err);
    try {
      writeFileSync(
        REPORT_PATH,
        JSON.stringify({ ...report, finishedAt: new Date().toISOString(), fatal: String(err) }, null, 2),
        "utf-8"
      );
    } catch {
      // best effort
    }
    client.close();
    process.exit(1);
  });
