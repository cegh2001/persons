import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { existsSync, unlinkSync } from "node:fs";

// Use a dedicated file for migration tests so we never touch the real DB.
const TEST_DB_PATH = "./persons-migration.test.db";
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

// vi.hoisted runs before module-load-time const initializers, so the
// env vars must use an inline literal here (cannot reference TEST_DB_URL).
vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./persons-migration.test.db";
  process.env.persons_TURSO_DATABASE_URL = "file:./persons-migration.test.db";
});

let verifyClient: Client;
let dbModule: typeof import("@/lib/db");

function cleanupTestDb() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* best-effort */ }
    }
  }
}

beforeAll(async () => {
  // Start with a clean file and pre-seed it with the *old* schema
  // (persons only, no new tables). This simulates an existing DB that
  // needs the structured-deliveries migration applied.
  cleanupTestDb();
  const seed = createClient({ url: TEST_DB_URL });
  await seed.execute(`
    CREATE TABLE persons (
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
  seed.close();

  // Import db.ts fresh so its module-level `client` is bound to the test DB.
  vi.resetModules();
  dbModule = await import("@/lib/db");

  // Separate client used only for verification queries.
  verifyClient = createClient({ url: TEST_DB_URL });
});

afterAll(() => {
  verifyClient.close();
  cleanupTestDb();
});

async function tableExists(name: string) {
  const res = await verifyClient.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [name],
  });
  return res.rows.length === 1;
}

async function indexExists(name: string) {
  const res = await verifyClient.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
    args: [name],
  });
  return res.rows.length === 1;
}

describe("structured-deliveries: migrateDb() foundation", () => {
  it("creates the deliveries table", async () => {
    await dbModule.migrateDb();
    expect(await tableExists("deliveries")).toBe(true);
  });

  it("creates the delivery_items table", async () => {
    expect(await tableExists("delivery_items")).toBe(true);
  });

  it("creates the medical_attentions table", async () => {
    expect(await tableExists("medical_attentions")).toBe(true);
  });

  it("is idempotent — running twice does not error and tables remain", async () => {
    await dbModule.migrateDb();
    await dbModule.migrateDb();
    expect(await tableExists("deliveries")).toBe(true);
    expect(await tableExists("delivery_items")).toBe(true);
    expect(await tableExists("medical_attentions")).toBe(true);
  });
});

describe("structured-deliveries: persons columns are preserved", () => {
  it("keeps all existing persons columns unchanged", async () => {
    const res = await verifyClient.execute("PRAGMA table_info(persons)");
    const colNames = res.rows.map((r) => r.name as string);
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "raw_name",
        "name",
        "document_id",
        "location",
        "is_vulnerable",
        "notes",
        "received_supplies",
        "received_medical",
        "created_at",
      ])
    );
  });

  it("does not add new columns to persons", async () => {
    const res = await verifyClient.execute("PRAGMA table_info(persons)");
    const colNames = res.rows.map((r) => r.name as string);
    // Strict equality — no extra columns leaked into persons.
    expect(colNames).toEqual([
      "id",
      "raw_name",
      "name",
      "document_id",
      "location",
      "is_vulnerable",
      "notes",
      "received_supplies",
      "received_medical",
      "created_at",
    ]);
  });
});

describe("structured-deliveries: new table columns", () => {
  it("deliveries has the expected columns", async () => {
    const res = await verifyClient.execute("PRAGMA table_info(deliveries)");
    const colNames = res.rows.map((r) => r.name as string);
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "person_id",
        "delivery_type",
        "beneficiary_count",
        "created_at",
      ])
    );
  });

  it("delivery_items has the expected columns", async () => {
    const res = await verifyClient.execute("PRAGMA table_info(delivery_items)");
    const colNames = res.rows.map((r) => r.name as string);
    expect(colNames).toEqual(
      expect.arrayContaining(["id", "delivery_id", "item"])
    );
  });

  it("medical_attentions has the expected columns", async () => {
    const res = await verifyClient.execute("PRAGMA table_info(medical_attentions)");
    const colNames = res.rows.map((r) => r.name as string);
    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "person_id",
        "professional",
        "specialty",
        "patient_age",
        "patient_sex",
        "diagnosis",
        "created_at",
      ])
    );
  });
});

describe("structured-deliveries: indexes", () => {
  it("creates the 7 expected indexes on FK and query fields", async () => {
    const expected = [
      "idx_deliveries_person_id",
      "idx_deliveries_type",
      "idx_delivery_items_delivery_id",
      "idx_delivery_items_item",
      "idx_medical_person_id",
      "idx_medical_specialty",
      "idx_medical_professional",
    ];
    for (const name of expected) {
      expect(await indexExists(name)).toBe(true);
    }
  });
});

describe("structured-deliveries: integrity constraints", () => {
  it("rejects deliveries with non-existent person_id (FK enforcement)", async () => {
    await expect(
      verifyClient.execute({
        sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, ?)",
        args: [999_999, "individual"],
      })
    ).rejects.toThrow();
  });

  it("rejects medical_attentions with non-existent person_id (FK enforcement)", async () => {
    await expect(
      verifyClient.execute({
        sql: "INSERT INTO medical_attentions (person_id, professional, specialty) VALUES (?, ?, ?)",
        args: [999_999, "Dr. Test", "medicina_general"],
      })
    ).rejects.toThrow();
  });

  it("rejects delivery_type outside the allowed enum (CHECK enforcement)", async () => {
    // First insert a real person so the FK passes.
    const personId = await insertPerson("FK Test", "Test Sector");

    await expect(
      verifyClient.execute({
        sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, ?)",
        args: [personId, "weekly"],
      })
    ).rejects.toThrow();
  });

  it("CASCADEs delivery_items when parent delivery is deleted", async () => {
    const personId = await insertPerson("Cascade Test", "Test Sector");

    const deliveryRes = await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, ?) RETURNING id",
      args: [personId, "individual"],
    });
    const deliveryId = Number(deliveryRes.rows[0].id);

    await verifyClient.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, ?)",
      args: [deliveryId, "agua"],
    });

    await verifyClient.execute({
      sql: "DELETE FROM deliveries WHERE id = ?",
      args: [deliveryId],
    });

    const items = await verifyClient.execute({
      sql: "SELECT * FROM delivery_items WHERE delivery_id = ?",
      args: [deliveryId],
    });
    expect(items.rows.length).toBe(0);
  });
});

describe("structured-deliveries: data flow sanity", () => {
  it("beneficiary_count defaults to 1 when omitted", async () => {
    const personId = await insertPerson("Default Test", "Test Sector");

    const res = await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, ?) RETURNING beneficiary_count",
      args: [personId, "individual"],
    });
    expect(Number(res.rows[0].beneficiary_count)).toBe(1);
  });

  it("created_at defaults to the current time on insert", async () => {
    const personId = await insertPerson("Time Test", "Test Sector");

    const res = await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, ?) RETURNING created_at",
      args: [personId, "individual"],
    });
    const createdAt = res.rows[0].created_at as string;
    expect(createdAt).toBeTruthy();
    // SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" UTC
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

async function insertPerson(name: string, location: string): Promise<number> {
  const res = await verifyClient.execute({
    sql: "INSERT INTO persons (raw_name, name, location) VALUES (?, ?, ?) RETURNING id",
    args: [name, name, location],
  });
  return Number(res.rows[0].id);
}
