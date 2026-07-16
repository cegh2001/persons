import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { createClient, type Client } from "@libsql/client";
import { existsSync, unlinkSync } from "node:fs";
import { ZodError } from "zod";
import { NextRequest } from "next/server";

// ── Test DB setup ──────────────────────────────────────────────────────
// Use a dedicated file for these tests so the real DB is never touched.
const TEST_DB_PATH = "./persons-medical.test.db";
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./persons-medical.test.db";
  process.env.persons_TURSO_DATABASE_URL = "file:./persons-medical.test.db";
  process.env.SESSION_SECRET = "test-secret-for-medical-tests-only-12345";
  process.env.AUTH_USERS = JSON.stringify([
    {
      email: "admin@test",
      role: "admin",
      passwordHash: "salt:hash",
    },
    {
      email: "visor@test",
      role: "visor",
      passwordHash: "salt:hash",
    },
  ]);
});

// Mock the auth module so we control the session per test.
const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  COOKIE_OPTIONS: {},
  authenticateUser: vi.fn(),
}));

let verifyClient: Client;
let dbModule: typeof import("@/lib/db");
let dbMedical: typeof import("@/lib/db-medical");
let validationModule: typeof import("@/lib/validation");
let routeList: typeof import("@/app/api/medical-attentions/route");
let routeById: typeof import("@/app/api/medical-attentions/[id]/route");
let routeStats: typeof import("@/app/api/stats/route");

function cleanupTestDb() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (existsSync(p)) {
      try { unlinkSync(p); } catch { /* best-effort */ }
    }
  }
}

async function seedPerson(name: string, location: string): Promise<number> {
  const res = await verifyClient.execute({
    sql: "INSERT INTO persons (raw_name, name, location) VALUES (?, ?, ?) RETURNING id",
    args: [name, name, location],
  });
  return Number(res.rows[0].id);
}

beforeAll(async () => {
  cleanupTestDb();
  // Pre-seed a clean persons table so the new tables can be applied
  // through migrateDb().
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
  await seed.execute(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id         INTEGER NOT NULL,
      delivery_type     TEXT    NOT NULL CHECK (delivery_type IN ('individual', 'collective')),
      beneficiary_count INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )
  `);
  await seed.execute(`
    CREATE TABLE IF NOT EXISTS delivery_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL,
      item        TEXT    NOT NULL,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
    )
  `);
  await seed.execute(`
    CREATE TABLE IF NOT EXISTS medical_attentions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id    INTEGER NOT NULL,
      professional TEXT    NOT NULL,
      specialty    TEXT    NOT NULL,
      patient_age  INTEGER,
      patient_sex  TEXT,
      diagnosis    TEXT,
      notes        TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id)
    )
  `);
  seed.close();

  // Import the full module tree fresh so the module-level `client` in
  // db.ts is bound to the test DB.
  vi.resetModules();
  dbModule = await import("@/lib/db");
  await dbModule.migrateDb();

  dbMedical = await import("@/lib/db-medical");
  validationModule = await import("@/lib/validation");
  routeList = await import("@/app/api/medical-attentions/route");
  routeById = await import("@/app/api/medical-attentions/[id]/route");
  routeStats = await import("@/app/api/stats/route");

  verifyClient = createClient({ url: TEST_DB_URL });
});

afterAll(() => {
  verifyClient.close();
  cleanupTestDb();
});

beforeEach(async () => {
  // Wipe medical_attentions, deliveries, and delivery_items between
  // tests so cross-test state does not leak. Persons are kept because
  // most tests create their own persons but some queries count globally;
  // we delete only the domain tables and the stats-touching tables.
  await verifyClient.execute("DELETE FROM medical_attentions");
  await verifyClient.execute("DELETE FROM delivery_items");
  await verifyClient.execute("DELETE FROM deliveries");
  await verifyClient.execute("DELETE FROM persons");
  await verifyClient.execute(
    "DELETE FROM sqlite_sequence WHERE name IN ('medical_attentions', 'deliveries', 'delivery_items', 'persons')"
  );

  // Default: admin session for every test, override per-test with
  // mockGetServerSession.mockReturnValueOnce.
  mockGetServerSession.mockReset();
  mockGetServerSession.mockReturnValue({ email: "admin@test", role: "admin" });
});

// ── Test helpers ───────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): NextRequest {
  const { method = "GET", body, headers = {} } = options;
  // NextRequest's RequestInit type is a slight superset of the DOM one
  // (its `signal` field does not allow `null`). We construct with the
  // minimal fields the tests need and cast at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init: any = { method, headers };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers = { ...headers, "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

// ── 1. Zod validation schemas (unit) ──────────────────────────────────

describe("medical: Zod validation schemas", () => {
  it("createMedicalAttentionSchema accepts a minimal valid payload", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "medicina_general",
    });
    expect(r.success).toBe(true);
  });

  it("createMedicalAttentionSchema accepts full optional fields", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "pediatria",
      patient_age: 7,
      patient_sex: "F",
      diagnosis: "control rutinario",
      notes: "sin alergias",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.patient_age).toBe(7);
      expect(r.data.diagnosis).toBe("control rutinario");
    }
  });

  it("createMedicalAttentionSchema rejects missing person_id", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      professional: "Dr. Test",
      specialty: "medicina_general",
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects missing professional", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      specialty: "medicina_general",
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects unknown specialty", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "cirugia",
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects empty professional", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "   ",
      specialty: "medicina_general",
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects patient_age < 0", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "medicina_general",
      patient_age: -1,
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects patient_age > 150", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "medicina_general",
      patient_age: 200,
    });
    expect(r.success).toBe(false);
  });

  it("createMedicalAttentionSchema rejects diagnosis over 2000 chars", () => {
    const r = validationModule.createMedicalAttentionSchema.safeParse({
      person_id: 1,
      professional: "Dr. Test",
      specialty: "medicina_general",
      diagnosis: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });

  it("patchMedicalAttentionSchema accepts single field updates", () => {
    const r = validationModule.patchMedicalAttentionSchema.safeParse({
      diagnosis: "nuevo diagnóstico",
    });
    expect(r.success).toBe(true);
  });

  it("patchMedicalAttentionSchema accepts specialty change", () => {
    const r = validationModule.patchMedicalAttentionSchema.safeParse({
      specialty: "psicologia",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.specialty).toBe("psicologia");
  });

  it("patchMedicalAttentionSchema rejects empty body", () => {
    const r = validationModule.patchMedicalAttentionSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("listMedicalAttentionsQuerySchema applies defaults", () => {
    const r = validationModule.listMedicalAttentionsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.pageSize).toBe(20);
    }
  });

  it("listMedicalAttentionsQuerySchema parses specialty filter", () => {
    const r = validationModule.listMedicalAttentionsQuerySchema.safeParse({
      specialty: "pediatria",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.specialty).toBe("pediatria");
  });

  it("listMedicalAttentionsQuerySchema rejects invalid specialty", () => {
    const r = validationModule.listMedicalAttentionsQuerySchema.safeParse({
      specialty: "cardiologia",
    });
    expect(r.success).toBe(false);
  });

  it("listMedicalAttentionsQuerySchema parses person_id as int", () => {
    const r = validationModule.listMedicalAttentionsQuerySchema.safeParse({
      person_id: "42",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.person_id).toBe(42);
  });
});

// ── 2. Data layer — CRUD (against test DB) ───────────────────────────

describe("medical: data layer CRUD", () => {
  it("createAttention + getAttention round-trip with optional fields", async () => {
    const personId = await seedPerson("Med A", "Sector A");
    const created = await dbMedical.createAttention(
      personId,
      "Dr. Test",
      "medicina_general",
      35,
      "M",
      "control",
      "sin novedad"
    );
    expect(created.person_id).toBe(personId);
    expect(created.professional).toBe("Dr. Test");
    expect(created.specialty).toBe("medicina_general");
    expect(created.patient_age).toBe(35);
    expect(created.patient_sex).toBe("M");
    expect(created.diagnosis).toBe("control");
    expect(created.notes).toBe("sin novedad");
    expect(created.created_at).toBeTruthy();

    const full = await dbMedical.getAttention(created.id);
    expect(full?.id).toBe(created.id);
  });

  it("createAttention stores NULL for omitted optional fields", async () => {
    const personId = await seedPerson("Med B", "Sector B");
    const created = await dbMedical.createAttention(
      personId,
      "Dr. X",
      "traumatologia"
    );
    expect(created.patient_age).toBeNull();
    expect(created.patient_sex).toBeNull();
    expect(created.diagnosis).toBeNull();
    expect(created.notes).toBeNull();
  });

  it("getAttention returns undefined for missing id", async () => {
    const r = await dbMedical.getAttention(999_999);
    expect(r).toBeUndefined();
  });

  it("listAttentions filters by person_id", async () => {
    const p1 = await seedPerson("List P1", "Sector");
    const p2 = await seedPerson("List P2", "Sector");
    await dbMedical.createAttention(p1, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p1, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p2, "Dr. B", "traumatologia");

    const r1 = await dbMedical.listAttentions(p1, {});
    expect(r1.attentions.length).toBe(2);
    expect(r1.attentions.every((a) => a.person_id === p1)).toBe(true);

    const r2 = await dbMedical.listAttentions(p2, {});
    expect(r2.attentions.length).toBe(1);
  });

  it("listAttentions filters by specialty", async () => {
    const p = await seedPerson("Spec P", "Sector");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. B", "pediatria");

    const r = await dbMedical.listAttentions(undefined, {
      specialty: "pediatria",
    });
    expect(r.attentions.length).toBe(1);
    expect(r.attentions[0].specialty).toBe("pediatria");
  });

  it("listAttentions filters by professional", async () => {
    const p = await seedPerson("Prof P", "Sector");
    await dbMedical.createAttention(p, "Dr. X", "medicina_general");
    await dbMedical.createAttention(p, "Dr. Y", "medicina_general");

    const r = await dbMedical.listAttentions(undefined, {
      professional: "Dr. X",
    });
    expect(r.attentions.length).toBe(1);
    expect(r.attentions[0].professional).toBe("Dr. X");
  });

  it("listAttentions paginates", async () => {
    const p = await seedPerson("Pag P", "Sector");
    for (let i = 0; i < 5; i++) {
      await dbMedical.createAttention(p, `Dr. ${i}`, "medicina_general");
    }
    const page1 = await dbMedical.listAttentions(p, { page: 1, pageSize: 2 });
    const page2 = await dbMedical.listAttentions(p, { page: 2, pageSize: 2 });
    const page3 = await dbMedical.listAttentions(p, { page: 3, pageSize: 2 });
    expect(page1.attentions.length).toBe(2);
    expect(page2.attentions.length).toBe(2);
    expect(page3.attentions.length).toBe(1);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
  });

  it("updateAttention changes specialty", async () => {
    const p = await seedPerson("Upd Spec", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    const updated = await dbMedical.updateAttention(created.id, {
      specialty: "psicologia",
    });
    expect(updated?.specialty).toBe("psicologia");
  });

  it("updateAttention preserves fields not in the partial", async () => {
    const p = await seedPerson("Upd Keep", "Sector");
    const created = await dbMedical.createAttention(
      p,
      "Dr. A",
      "medicina_general",
      30,
      "F",
      "control"
    );
    const updated = await dbMedical.updateAttention(created.id, {
      diagnosis: "nuevo",
    });
    expect(updated?.professional).toBe("Dr. A");
    expect(updated?.specialty).toBe("medicina_general");
    expect(updated?.patient_age).toBe(30);
    expect(updated?.patient_sex).toBe("F");
    expect(updated?.diagnosis).toBe("nuevo");
  });

  it("updateAttention returns undefined for missing id", async () => {
    const r = await dbMedical.updateAttention(999_999, {
      specialty: "psicologia",
    });
    expect(r).toBeUndefined();
  });

  it("deleteAttention removes the row", async () => {
    const p = await seedPerson("Del P", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    const deleted = await dbMedical.deleteAttention(created.id);
    expect(deleted).toBe(true);

    const after = await dbMedical.getAttention(created.id);
    expect(after).toBeUndefined();
  });

  it("deleteAttention returns false for missing id", async () => {
    const r = await dbMedical.deleteAttention(999_999);
    expect(r).toBe(false);
  });
});

// ── 3. Aggregate stats (M6 / M7) ─────────────────────────────────────

describe("medical: getAttentionStats", () => {
  it("returns empty groups when no attentions exist", async () => {
    const stats = await dbMedical.getAttentionStats();
    expect(stats.totalAttentions).toBe(0);
    expect(stats.bySpecialty).toEqual({});
    expect(stats.byProfessional).toEqual({});
  });

  it("groups attentions by specialty and professional", async () => {
    const p = await seedPerson("Stats P", "Sector");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. B", "traumatologia");
    await dbMedical.createAttention(p, "Dr. C", "pediatria");

    const stats = await dbMedical.getAttentionStats();
    expect(stats.totalAttentions).toBe(4);
    expect(stats.bySpecialty).toEqual({
      medicina_general: 2,
      traumatologia: 1,
      pediatria: 1,
    });
    expect(stats.byProfessional).toEqual({
      "Dr. A": 2,
      "Dr. B": 1,
      "Dr. C": 1,
    });
  });
});

// ── 4. /api/stats — extended fields + backward compat ────────────────

describe("api/stats: extended fields (S1-S6)", () => {
  it("returns new fields even with empty structured-deliveries tables", async () => {
    const res = await routeStats.GET(
      makeRequest("http://localhost/api/stats")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    // New fields present.
    expect(body).toHaveProperty("totalDeliveries", 0);
    expect(body).toHaveProperty("personsReached", 0);
    expect(body).toHaveProperty("itemsDistributed");
    expect(body).toHaveProperty("totalMedicalAttentions", 0);
    expect(body).toHaveProperty("medicalBySpecialty");
    expect(body).toHaveProperty("medicalByProfessional");

    expect(body.itemsDistributed).toEqual({});
    expect(body.medicalBySpecialty).toEqual({});
    expect(body.medicalByProfessional).toEqual({});
  });

  it("S1+S2: totalDeliveries and personsReached combine individual and collective", async () => {
    const p1 = await seedPerson("S1 P1", "Sector");
    const p2 = await seedPerson("S1 P2", "Sector");
    // 2 individual deliveries for p1, 1 collective with beneficiary_count=5
    await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, 'individual', 1)",
      args: [p1],
    });
    await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, 'individual', 1)",
      args: [p1],
    });
    await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, 'collective', 5)",
      args: [p2],
    });

    const res = await routeStats.GET(
      makeRequest("http://localhost/api/stats")
    );
    const body = await res.json();
    expect(body.totalDeliveries).toBe(3);
    // 1+1 (individual) + 5 (collective) = 7
    expect(body.personsReached).toBe(7);
  });

  it("S3: itemsDistributed returns the count per item, sorted by count DESC", async () => {
    const p = await seedPerson("S3 P", "Sector");
    const d1Res = await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, 'individual') RETURNING id",
      args: [p],
    });
    const d1 = Number(d1Res.rows[0].id);
    const d2Res = await verifyClient.execute({
      sql: "INSERT INTO deliveries (person_id, delivery_type) VALUES (?, 'individual') RETURNING id",
      args: [p],
    });
    const d2 = Number(d2Res.rows[0].id);
    // 3 of agua across 2 deliveries
    await verifyClient.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, 'agua')",
      args: [d1],
    });
    await verifyClient.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, 'agua')",
      args: [d1],
    });
    await verifyClient.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, 'agua')",
      args: [d2],
    });
    await verifyClient.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, 'medicamentos')",
      args: [d2],
    });

    const res = await routeStats.GET(
      makeRequest("http://localhost/api/stats")
    );
    const body = await res.json();
    expect(body.itemsDistributed).toEqual({
      agua: 3,
      medicamentos: 1,
    });
  });

  it("S4+S5+S6: medical stats reflect inserted attentions", async () => {
    const p = await seedPerson("S4 P", "Sector");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. B", "traumatologia");

    const res = await routeStats.GET(
      makeRequest("http://localhost/api/stats")
    );
    const body = await res.json();
    expect(body.totalMedicalAttentions).toBe(3);
    expect(body.medicalBySpecialty).toEqual({
      medicina_general: 2,
      traumatologia: 1,
    });
    expect(body.medicalByProfessional).toEqual({
      "Dr. A": 2,
      "Dr. B": 1,
    });
  });

  it("S7: existing fields are unchanged (backward compat)", async () => {
    const p = await seedPerson("S7 P", "Sector");
    // Existing-shape: persons table with vuln/supplies/medical flags.
    await verifyClient.execute({
      sql: "UPDATE persons SET is_vulnerable = 1, received_supplies = 1, received_medical = 1, location = ? WHERE id = ?",
      args: ["Backcompat Location", p],
    });

    const res = await routeStats.GET(
      makeRequest("http://localhost/api/stats")
    );
    const body = await res.json();

    // Old fields preserved exactly.
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("vulnerableTotal");
    expect(body).toHaveProperty("suppliesTotal");
    expect(body).toHaveProperty("medicalTotal");
    expect(body).toHaveProperty("byLocation");
    expect(typeof body.total).toBe("number");
    expect(typeof body.vulnerableTotal).toBe("number");
    expect(typeof body.suppliesTotal).toBe("number");
    expect(typeof body.medicalTotal).toBe("number");
    expect(Array.isArray(body.byLocation)).toBe(true);
    expect(body.total).toBe(1);
    expect(body.vulnerableTotal).toBe(1);
    expect(body.suppliesTotal).toBe(1);
    expect(body.medicalTotal).toBe(1);
    // New fields co-exist.
    expect(body).toHaveProperty("totalDeliveries");
    expect(body).toHaveProperty("totalMedicalAttentions");
  });
});

// ── 5. API routes — auth gating & happy paths ─────────────────────────

describe("API: auth gating", () => {
  it("GET /api/medical-attentions returns 401 when no session", async () => {
    mockGetServerSession.mockReturnValueOnce(null);
    const req = makeRequest("http://localhost/api/medical-attentions");
    const res = await routeList.GET(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/medical-attentions returns 200 for any authenticated session", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const req = makeRequest("http://localhost/api/medical-attentions");
    const res = await routeList.GET(req);
    expect(res.status).toBe(200);
  });

  it("POST /api/medical-attentions returns 403 for visor", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const req = makeRequest("http://localhost/api/medical-attentions", {
      method: "POST",
      body: {
        person_id: 1,
        professional: "Dr. A",
        specialty: "medicina_general",
      },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/medical-attentions returns 400 for invalid body", async () => {
    const req = makeRequest("http://localhost/api/medical-attentions", {
      method: "POST",
      body: { person_id: -1, professional: "Dr. A", specialty: "cirugia" },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/medical-attentions returns 404 when person does not exist", async () => {
    const req = makeRequest("http://localhost/api/medical-attentions", {
      method: "POST",
      body: {
        person_id: 999_999,
        professional: "Dr. A",
        specialty: "medicina_general",
      },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(404);
  });

  it("POST /api/medical-attentions creates a record with optional fields", async () => {
    const p = await seedPerson("API Create", "Sector");
    const req = makeRequest("http://localhost/api/medical-attentions", {
      method: "POST",
      body: {
        person_id: p,
        professional: "Dr. A",
        specialty: "pediatria",
        patient_age: 5,
        patient_sex: "F",
        diagnosis: "control",
      },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.person_id).toBe(p);
    expect(json.specialty).toBe("pediatria");
    expect(json.patient_age).toBe(5);
  });

  it("GET /api/medical-attentions filters by person_id and specialty", async () => {
    const p = await seedPerson("API List", "Sector");
    await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    await dbMedical.createAttention(p, "Dr. B", "pediatria");

    const req = makeRequest(
      `http://localhost/api/medical-attentions?person_id=${p}&specialty=pediatria`
    );
    const res = await routeList.GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attentions.length).toBe(1);
    expect(json.attentions[0].specialty).toBe("pediatria");
  });

  it("GET /api/medical-attentions/[id] returns 404 for missing id", async () => {
    const req = makeRequest("http://localhost/api/medical-attentions/999999");
    const res = await routeById.GET(req, {
      params: Promise.resolve({ id: "999999" }),
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/medical-attentions/[id] returns the attention", async () => {
    const p = await seedPerson("API Get", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");

    const req = makeRequest(`http://localhost/api/medical-attentions/${created.id}`);
    const res = await routeById.GET(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(created.id);
  });

  it("PATCH /api/medical-attentions/[id] updates fields", async () => {
    const p = await seedPerson("API Patch", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");

    const req = makeRequest(
      `http://localhost/api/medical-attentions/${created.id}`,
      {
        method: "PATCH",
        body: { specialty: "psicologia", diagnosis: "nuevo" },
      }
    );
    const res = await routeById.PATCH(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.specialty).toBe("psicologia");
    expect(json.diagnosis).toBe("nuevo");
  });

  it("PATCH /api/medical-attentions/[id] returns 403 for visor", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const p = await seedPerson("API Patch Forbidden", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    const req = makeRequest(
      `http://localhost/api/medical-attentions/${created.id}`,
      {
        method: "PATCH",
        body: { specialty: "psicologia" },
      }
    );
    const res = await routeById.PATCH(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/medical-attentions/[id] removes the row", async () => {
    const p = await seedPerson("API Del", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");

    const req = makeRequest(
      `http://localhost/api/medical-attentions/${created.id}`,
      { method: "DELETE" }
    );
    const res = await routeById.DELETE(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);

    const after = await dbMedical.getAttention(created.id);
    expect(after).toBeUndefined();
  });

  it("DELETE /api/medical-attentions/[id] returns 403 for visor", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const p = await seedPerson("API Del Forbidden", "Sector");
    const created = await dbMedical.createAttention(p, "Dr. A", "medicina_general");
    const req = makeRequest(
      `http://localhost/api/medical-attentions/${created.id}`,
      { method: "DELETE" }
    );
    const res = await routeById.DELETE(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(403);
  });
});

// Suppress the unused-import warning for ZodError.
void ZodError;
