import { createClient, type Client, type InValue } from "@libsql/client";

const dbUrl = process.env.persons_TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:persons.db";
const dbAuthToken = process.env.persons_TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

let initialized = false;

export async function getDb(): Promise<Client> {
  if (!initialized) {
    await initSchema();
    initialized = true;
  }
  return client;
}

async function initSchema() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS persons (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name          TEXT    NOT NULL,
      name              TEXT    NOT NULL,
      document_id       TEXT,
      location          TEXT    NOT NULL,
      is_vulnerable     INTEGER NOT NULL DEFAULT 0,
      notes             TEXT    NOT NULL DEFAULT '',
      received_supplies INTEGER NOT NULL DEFAULT 1,
      received_medical  INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_document_id ON persons(document_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_location ON persons(location)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_vulnerable ON persons(is_vulnerable)");
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_supplies ON persons(received_supplies)");
  } catch (e) {}
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_medical ON persons(received_medical)");
  } catch (e) {}
}

export async function migrateDb() {
  try {
    const colsRes = await client.execute("PRAGMA table_info(persons)");
    const cols = colsRes.rows;
    const hasVulnerable = cols.some((c) => c.name === "is_vulnerable");
    const hasNotes = cols.some((c) => c.name === "notes");
    const hasSupplies = cols.some((c) => c.name === "received_supplies");
    const hasMedical = cols.some((c) => c.name === "received_medical");

    if (!hasVulnerable) {
      await client.execute("ALTER TABLE persons ADD COLUMN is_vulnerable INTEGER NOT NULL DEFAULT 0");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_vulnerable ON persons(is_vulnerable)");
    }
    if (!hasNotes) {
      await client.execute("ALTER TABLE persons ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
    }
    if (!hasSupplies) {
      await client.execute("ALTER TABLE persons ADD COLUMN received_supplies INTEGER NOT NULL DEFAULT 1");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_supplies ON persons(received_supplies)");
    }
    if (!hasMedical) {
      await client.execute("ALTER TABLE persons ADD COLUMN received_medical INTEGER NOT NULL DEFAULT 0");
      await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_medical ON persons(received_medical)");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

export interface PersonRow {
  id: number;
  raw_name: string;
  name: string;
  document_id: string | null;
  location: string;
  is_vulnerable: number;
  notes: string;
  received_supplies: number;
  received_medical: number;
  created_at: string;
}

export interface PersonInput {
  raw_name?: string;
  name: string;
  document_id?: string | null;
  location: string;
  is_vulnerable?: number;
  notes?: string;
  received_supplies?: number;
  received_medical?: number;
}

export interface PersonFilters {
  search?: string;
  location?: string;
  is_vulnerable?: number;
  received_supplies?: number;
  received_medical?: number;
  page?: number;
  pageSize?: number;
}

export async function listPersons(filters: PersonFilters = {}) {
  await getDb();
  const conditions: string[] = [];
  const params: InValue[] = [];

  if (filters.location && filters.location !== "all") {
    conditions.push("location = ?");
    params.push(filters.location);
  }

  if (filters.is_vulnerable !== undefined) {
    conditions.push("is_vulnerable = ?");
    params.push(filters.is_vulnerable);
  }

  if (filters.received_supplies !== undefined) {
    conditions.push("received_supplies = ?");
    params.push(filters.received_supplies);
  }

  if (filters.received_medical !== undefined) {
    conditions.push("received_medical = ?");
    params.push(filters.received_medical);
  }

  if (filters.search && filters.search.trim() !== "") {
    // Escape SQLite LIKE wildcards so users can search for literal % and _
    const escaped = filters.search.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const searchVal = `%${escaped}%`;
    conditions.push(
      "(name LIKE ? ESCAPE '\\' OR document_id LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\' OR raw_name LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\')"
    );
    params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const countRes = await client.execute({
    sql: `SELECT COUNT(*) as total FROM persons ${where}`,
    args: params
  });
  const total = Number(countRes.rows[0]?.total ?? 0);

  const rowsRes = await client.execute({
    sql: `SELECT * FROM persons ${where} ORDER BY name ASC, id ASC LIMIT ? OFFSET ?`,
    args: [...params, pageSize, offset]
  });
  const rows = rowsRes.rows as unknown as PersonRow[];

  return {
    persons: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPerson(id: number): Promise<PersonRow | undefined> {
  await getDb();
  const res = await client.execute({
    sql: "SELECT * FROM persons WHERE id = ?",
    args: [id]
  });
  return res.rows[0] as unknown as PersonRow | undefined;
}

export async function createPerson(input: PersonInput): Promise<PersonRow> {
  await getDb();
  const rawName = input.raw_name ?? (input.document_id ? `${input.name} ${input.document_id}` : input.name);
  const docId = input.document_id || null;
  const isVulnerable = input.is_vulnerable ?? 0;
  const notes = input.notes ?? "";
  const receivedSupplies = input.received_supplies ?? 1;
  const receivedMedical = input.received_medical ?? 0;

  const res = await client.execute({
    sql: "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    args: [rawName, input.name, docId, input.location, isVulnerable, notes, receivedSupplies, receivedMedical]
  });
  return res.rows[0] as unknown as PersonRow;
}

export async function updatePerson(id: number, input: Partial<PersonInput>): Promise<PersonRow | undefined> {
  const existing = await getPerson(id);
  if (!existing) return undefined;

  await getDb();
  const name = input.name ?? existing.name;
  const document_id = input.document_id !== undefined ? (input.document_id || null) : existing.document_id;
  const location = input.location ?? existing.location;
  const is_vulnerable = input.is_vulnerable !== undefined ? input.is_vulnerable : existing.is_vulnerable;
  const notes = input.notes !== undefined ? input.notes : existing.notes;
  const received_supplies = input.received_supplies !== undefined ? input.received_supplies : existing.received_supplies;
  const received_medical = input.received_medical !== undefined ? input.received_medical : existing.received_medical;
  const raw_name = input.raw_name ?? (document_id ? `${name} ${document_id}` : name);

  await client.execute({
    sql: "UPDATE persons SET raw_name = ?, name = ?, document_id = ?, location = ?, is_vulnerable = ?, notes = ?, received_supplies = ?, received_medical = ? WHERE id = ?",
    args: [raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical, id]
  });

  return getPerson(id);
}

/**
 * Partial update with PATCH semantics:
 * - `notes`: APPENDED to existing notes with " | " separator (not replaced).
 *            If existing is empty, the new value is used as-is.
 * - `received_supplies` / `received_medical`: SET to the provided value
 *            (not toggled — caller decides the target state).
 * - `name` / `document_id` / `location` / `is_vulnerable`: replaced if provided.
 * - Any field NOT provided is preserved unchanged.
 *
 * Returns the updated row, or `undefined` if the person does not exist.
 */
export async function patchPerson(
  id: number,
  partial: {
    name?: string;
    document_id?: string | null;
    location?: string;
    is_vulnerable?: number;
    notes?: string;
    received_supplies?: number;
    received_medical?: number;
  }
): Promise<PersonRow | undefined> {
  const existing = await getPerson(id);
  if (!existing) return undefined;

  await getDb();

  // Notes: append with " | " separator (preserves history).
  const trimmedNew = partial.notes?.trim() ?? "";
  const notes =
    trimmedNew === ""
      ? existing.notes
      : existing.notes === ""
        ? trimmedNew
        : `${existing.notes} | ${trimmedNew}`;

  const name = partial.name ?? existing.name;
  const document_id =
    partial.document_id !== undefined ? (partial.document_id || null) : existing.document_id;
  const location = partial.location ?? existing.location;
  const is_vulnerable =
    partial.is_vulnerable !== undefined ? partial.is_vulnerable : existing.is_vulnerable;
  const received_supplies =
    partial.received_supplies !== undefined ? partial.received_supplies : existing.received_supplies;
  const received_medical =
    partial.received_medical !== undefined ? partial.received_medical : existing.received_medical;
  const raw_name = document_id ? `${name} ${document_id}` : name;

  await client.execute({
    sql: "UPDATE persons SET raw_name = ?, name = ?, document_id = ?, location = ?, is_vulnerable = ?, notes = ?, received_supplies = ?, received_medical = ? WHERE id = ?",
    args: [raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical, id]
  });

  return getPerson(id);
}

export async function deletePerson(id: number): Promise<boolean> {
  await getDb();
  const res = await client.execute({
    sql: "DELETE FROM persons WHERE id = ?",
    args: [id]
  });
  return Number(res.rowsAffected) > 0;
}

export async function getStats() {
  await getDb();

  // Total overall
  const totalRes = await client.execute("SELECT COUNT(*) as count FROM persons");
  const total = Number(totalRes.rows[0]?.count ?? 0);

  // Total vulnerable
  const vulnRes = await client.execute("SELECT COUNT(*) as count FROM persons WHERE is_vulnerable = 1");
  const vulnerableTotal = Number(vulnRes.rows[0]?.count ?? 0);

  // Total supplies
  const suppliesRes = await client.execute("SELECT COUNT(*) as count FROM persons WHERE received_supplies = 1");
  const suppliesTotal = Number(suppliesRes.rows[0]?.count ?? 0);

  // Total medical
  const medicalRes = await client.execute("SELECT COUNT(*) as count FROM persons WHERE received_medical = 1");
  const medicalTotal = Number(medicalRes.rows[0]?.count ?? 0);

  // Breakdown by location
  const locationRes = await client.execute(
    "SELECT location, COUNT(*) as count, SUM(CASE WHEN is_vulnerable = 1 THEN 1 ELSE 0 END) as vulnerable_count FROM persons GROUP BY location ORDER BY count DESC"
  );

  return {
    total,
    vulnerableTotal,
    suppliesTotal,
    medicalTotal,
    byLocation: locationRes.rows.map(r => ({
      location: r.location as string,
      count: Number(r.count ?? 0),
      vulnerableCount: Number(r.vulnerable_count ?? 0)
    }))
  };
}
