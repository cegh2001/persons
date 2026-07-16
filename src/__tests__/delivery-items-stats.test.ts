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
import { NextRequest } from "next/server";

// ── Test DB setup ──────────────────────────────────────────────────────
const TEST_DB_PATH = "./persons-items-stats.test.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./persons-items-stats.test.db";
  process.env.persons_TURSO_DATABASE_URL = "file:./persons-items-stats.test.db";
  process.env.SESSION_SECRET = "test-secret-items-stats-12345";
  process.env.AUTH_USERS = JSON.stringify([
    { email: "admin@test", role: "admin", passwordHash: "salt:hash" },
    { email: "visor@test", role: "visor", passwordHash: "salt:hash" },
  ]);
});

const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  COOKIE_OPTIONS: {},
  authenticateUser: vi.fn(),
}));

let db: Client;

beforeAll(async () => {
  // Clean old test DB
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);

  db = createClient({ url: `file:${TEST_DB_PATH}` });

  // Create schema (same as migrateDb)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name TEXT NOT NULL,
      name TEXT NOT NULL,
      document_id TEXT,
      location TEXT NOT NULL,
      is_vulnerable INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      received_supplies INTEGER NOT NULL DEFAULT 1,
      received_medical INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      delivery_type TEXT NOT NULL DEFAULT 'individual',
      beneficiary_count INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
      item TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medical_attentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      professional TEXT NOT NULL,
      specialty TEXT NOT NULL,
      patient_age INTEGER,
      patient_sex TEXT,
      diagnosis TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed test data
  await db.execute(
    "INSERT INTO persons (id, raw_name, name, document_id, location) VALUES (1, 'Alice 111', 'Alice', '111', 'L1')"
  );
  await db.execute(
    "INSERT INTO persons (id, raw_name, name, document_id, location) VALUES (2, 'Bob 222', 'Bob', '222', 'L2')"
  );
  await db.execute(
    "INSERT INTO persons (id, raw_name, name, document_id, location) VALUES (3, 'Carol 333', 'Carol', '333', 'L3')"
  );

  // Alice received agua + kit_aseo
  await db.execute(
    "INSERT INTO deliveries (id, person_id, delivery_type) VALUES (1, 1, 'individual')"
  );
  await db.execute(
    "INSERT INTO delivery_items (delivery_id, item) VALUES (1, 'agua')"
  );
  await db.execute(
    "INSERT INTO delivery_items (delivery_id, item) VALUES (1, 'kit_aseo')"
  );

  // Bob received only kit_aseo
  await db.execute(
    "INSERT INTO deliveries (id, person_id, delivery_type) VALUES (2, 2, 'individual')"
  );
  await db.execute(
    "INSERT INTO delivery_items (delivery_id, item) VALUES (2, 'kit_aseo')"
  );

  // Carol: no deliveries

  // Medical: Alice had a medical attention
  await db.execute(
    "INSERT INTO medical_attentions (person_id, professional, specialty) VALUES (1, 'Dr. Juan', 'medicina_general')"
  );
  // Bob had two attentions
  await db.execute(
    "INSERT INTO medical_attentions (person_id, professional, specialty) VALUES (2, 'Dr. Juan', 'medicina_general')"
  );
  await db.execute(
    "INSERT INTO medical_attentions (person_id, professional, specialty) VALUES (2, 'Ft. Catherin', 'fisioterapia')"
  );
});

afterAll(async () => {
  // Windows may hold a file lock; attempt deletion but don't fail the suite.
  try {
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  } catch {
    // File locked — will be overwritten on next run.
  }
});

// ── Reset mocks between tests ──────────────────────────────────────────
beforeEach(() => {
  mockGetServerSession.mockReset();
  vi.resetModules();
});

// ── Helpers ────────────────────────────────────────────────────────────
function replicaNextUrl(url: string): URL {
  return {
    href: `http://localhost${url}`,
    origin: "http://localhost",
    protocol: "http:",
    username: "",
    password: "",
    host: "localhost",
    hostname: "localhost",
    port: "",
    pathname: url.split("?")[0],
    search: url.includes("?") ? `?${url.split("?")[1]}` : "",
    searchParams: new URL(`http://localhost${url}`).searchParams,
    hash: "",
  } as unknown as URL;
}

function mockReq(url: string, method = "GET", body?: unknown): NextRequest {
  return {
    method,
    nextUrl: replicaNextUrl(url),
    json: () => Promise.resolve(body),
    headers: new Headers(),
    cookies: {} as unknown,
  } as unknown as NextRequest;
}

function setSession(role: "admin" | "visor" | null) {
  if (!role) {
    mockGetServerSession.mockReturnValue(null);
  } else {
    mockGetServerSession.mockReturnValue({ email: `${role}@test`, role });
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("GET /api/delivery-items", () => {
  it("I4: returns persons who received a given item", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items?item=agua");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item).toBe("agua");
    expect(body.missing).toBe(false);
    expect(body.count).toBe(1);
    expect(body.person_ids).toEqual([1]); // Only Alice
  });

  it("I4: returns empty when no one received the item", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items?item=electrolit");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item).toBe("electrolit");
    expect(body.count).toBe(0);
    expect(body.person_ids).toEqual([]);
  });

  it("I5: returns persons who have NOT received a given item", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items?item=agua&missing=true");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item).toBe("agua");
    expect(body.missing).toBe(true);
    // Bob and Carol have NOT received agua
    expect(body.person_ids).toContain(2);
    expect(body.person_ids).toContain(3);
    expect(body.person_ids).not.toContain(1);
  });

  it("returns 400 when item param is missing", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("item");
  });

  it("returns 400 for invalid item (not in catalog)", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items?item=invalid_item");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("catálogo");
  });

  it("returns 401 without session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/delivery-items/route");
    const req = mockReq("/api/delivery-items?item=agua");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("No autorizado");
  });
});

describe("GET /api/medical-attentions/stats", () => {
  it("M6: returns total attentions count", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/medical-attentions/stats/route");
    const req = mockReq("/api/medical-attentions/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalAttentions).toBe(3);
  });

  it("M7: returns breakdown by specialty", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/medical-attentions/stats/route");
    const req = mockReq("/api/medical-attentions/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(body.bySpecialty).toEqual({
      medicina_general: 2,
      fisioterapia: 1,
    });
  });

  it("M7: returns breakdown by professional", async () => {
    setSession("visor");
    const { GET } = await import("@/app/api/medical-attentions/stats/route");
    const req = mockReq("/api/medical-attentions/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(body.byProfessional).toEqual({
      "Dr. Juan": 2,
      "Ft. Catherin": 1,
    });
  });

  it("returns 401 without session", async () => {
    setSession(null);
    const { GET } = await import("@/app/api/medical-attentions/stats/route");
    const req = mockReq("/api/medical-attentions/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("No autorizado");
  });
});
