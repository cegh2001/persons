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
const TEST_DB_PATH = "./persons-deliveries.test.db";
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

// vi.hoisted runs before module-load-time const initializers, so the
// env vars must use an inline literal here (cannot reference TEST_DB_URL).
vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./persons-deliveries.test.db";
  process.env.persons_TURSO_DATABASE_URL = "file:./persons-deliveries.test.db";
  process.env.SESSION_SECRET = "test-secret-for-deliveries-tests-only-12345";
  process.env.AUTH_USERS = JSON.stringify([
    {
      email: "admin@test",
      role: "admin",
      // not used in these tests; the auth module is mocked
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

// Reset rate-limit module state between tests by re-importing. We track
// each module reference as a `let` and re-import in beforeAll so every
// test sees a fresh tree.
let verifyClient: Client;
let dbModule: typeof import("@/lib/db");
let dbDeliveries: typeof import("@/lib/db-deliveries");
let validationModule: typeof import("@/lib/validation");
let routeList: typeof import("@/app/api/deliveries/route");
let routeById: typeof import("@/app/api/deliveries/[id]/route");
let routeItems: typeof import("@/app/api/deliveries/[id]/items/route");
let routeItemById: typeof import("@/app/api/deliveries/[id]/items/[itemId]/route");
let routeSplit: typeof import("@/app/api/deliveries/[id]/split/route");

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
  seed.close();

  // Import the full module tree fresh so the module-level `client` in
  // db.ts is bound to the test DB.
  vi.resetModules();
  dbModule = await import("@/lib/db");
  await dbModule.migrateDb();

  dbDeliveries = await import("@/lib/db-deliveries");
  validationModule = await import("@/lib/validation");
  routeList = await import("@/app/api/deliveries/route");
  routeById = await import("@/app/api/deliveries/[id]/route");
  routeItems = await import("@/app/api/deliveries/[id]/items/route");
  routeItemById = await import("@/app/api/deliveries/[id]/items/[itemId]/route");
  routeSplit = await import("@/app/api/deliveries/[id]/split/route");

  verifyClient = createClient({ url: TEST_DB_URL });
});

afterAll(() => {
  verifyClient.close();
  cleanupTestDb();
});

beforeEach(async () => {
  // Wipe deliveries + delivery_items between tests so cross-test state
  // does not leak (e.g. global count assertions). Persons are kept
  // because most tests create their own persons but some queries count
  // globally; we delete only deliveries tables.
  await verifyClient.execute("DELETE FROM delivery_items");
  await verifyClient.execute("DELETE FROM deliveries");
  await verifyClient.execute(
    "DELETE FROM sqlite_sequence WHERE name IN ('deliveries', 'delivery_items')"
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

describe("deliveries: Zod validation schemas", () => {
  it("createDeliverySchema accepts a minimal valid payload", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "individual",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.beneficiary_count).toBe(1);
      expect(r.data.items).toEqual([]);
    }
  });

  it("createDeliverySchema accepts payload with items", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "collective",
      beneficiary_count: 5,
      items: ["agua", "kit_alimento"],
    });
    expect(r.success).toBe(true);
  });

  it("createDeliverySchema rejects unknown delivery_type", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "weekly",
    });
    expect(r.success).toBe(false);
  });

  it("createDeliverySchema rejects missing person_id", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      delivery_type: "individual",
    });
    expect(r.success).toBe(false);
  });

  it("createDeliverySchema rejects invalid item in items array", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "individual",
      items: ["agua", "combustible"],
    });
    expect(r.success).toBe(false);
  });

  it("createDeliverySchema rejects beneficiary_count < 1", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "collective",
      beneficiary_count: 0,
    });
    expect(r.success).toBe(false);
  });

  it("createDeliverySchema rejects beneficiary_count > 10000", () => {
    const r = validationModule.createDeliverySchema.safeParse({
      person_id: 1,
      delivery_type: "collective",
      beneficiary_count: 100_000,
    });
    expect(r.success).toBe(false);
  });

  it("splitDeliverySchema accepts valid person_ids array", () => {
    const r = validationModule.splitDeliverySchema.safeParse({
      person_ids: [1, 2, 3],
    });
    expect(r.success).toBe(true);
  });

  it("splitDeliverySchema rejects empty person_ids array", () => {
    const r = validationModule.splitDeliverySchema.safeParse({
      person_ids: [],
    });
    expect(r.success).toBe(false);
  });

  it("splitDeliverySchema rejects non-positive person_id", () => {
    const r = validationModule.splitDeliverySchema.safeParse({
      person_ids: [1, -2, 3],
    });
    expect(r.success).toBe(false);
  });

  it("splitDeliverySchema rejects non-array person_ids", () => {
    const r = validationModule.splitDeliverySchema.safeParse({
      person_ids: "not-an-array",
    });
    expect(r.success).toBe(false);
  });

  it("patchDeliverySchema rejects empty body", () => {
    const r = validationModule.patchDeliverySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("patchDeliverySchema accepts type change", () => {
    const r = validationModule.patchDeliverySchema.safeParse({
      delivery_type: "individual",
    });
    expect(r.success).toBe(true);
  });

  it("createDeliveryItemSchema accepts catalog items", () => {
    for (const item of ["agua", "medicamentos", "otros"]) {
      const r = validationModule.createDeliveryItemSchema.safeParse({ item });
      expect(r.success).toBe(true);
    }
  });

  it("createDeliveryItemSchema rejects unknown items", () => {
    const r = validationModule.createDeliveryItemSchema.safeParse({
      item: "no-existe",
    });
    expect(r.success).toBe(false);
  });

  it("listDeliveriesQuerySchema applies defaults", () => {
    const r = validationModule.listDeliveriesQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.pageSize).toBe(20);
    }
  });

  it("listDeliveriesQuerySchema parses type filter", () => {
    const r = validationModule.listDeliveriesQuerySchema.safeParse({
      type: "collective",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("collective");
  });
});

// ── 2. Data layer — CRUD (against test DB) ───────────────────────────

describe("deliveries: data layer CRUD", () => {
  it("createDelivery + getDelivery round-trip with items", async () => {
    const personId = await seedPerson("CRUD A", "Sector A");
    const created = await dbDeliveries.createDelivery(personId, "individual", 1, [
      "agua",
      "kit_alimento",
    ]);
    expect(created.person_id).toBe(personId);
    expect(created.delivery_type).toBe("individual");
    expect(created.beneficiary_count).toBe(1);

    const full = await dbDeliveries.getDelivery(created.id);
    expect(full).toBeDefined();
    expect(full?.items.length).toBe(2);
    expect(full?.items.map((i) => i.item).sort()).toEqual(["agua", "kit_alimento"]);
  });

  it("createDelivery forces beneficiary_count=1 for individual", async () => {
    const personId = await seedPerson("CRUD B", "Sector B");
    const created = await dbDeliveries.createDelivery(
      personId,
      "individual",
      99, // ignored for individual
      []
    );
    expect(created.beneficiary_count).toBe(1);
  });

  it("createDelivery respects beneficiary_count for collective", async () => {
    const personId = await seedPerson("CRUD C", "Sector C");
    const created = await dbDeliveries.createDelivery(
      personId,
      "collective",
      5,
      ["agua"]
    );
    expect(created.beneficiary_count).toBe(5);
  });

  it("getDelivery returns undefined for missing id", async () => {
    const r = await dbDeliveries.getDelivery(999_999);
    expect(r).toBeUndefined();
  });

  it("listDeliveries filters by person_id", async () => {
    const p1 = await seedPerson("List P1", "Sector");
    const p2 = await seedPerson("List P2", "Sector");
    await dbDeliveries.createDelivery(p1, "individual", 1, []);
    await dbDeliveries.createDelivery(p1, "individual", 1, []);
    await dbDeliveries.createDelivery(p2, "individual", 1, []);

    const r1 = await dbDeliveries.listDeliveries(p1, {});
    expect(r1.deliveries.length).toBe(2);
    expect(r1.deliveries.every((d) => d.person_id === p1)).toBe(true);

    const r2 = await dbDeliveries.listDeliveries(p2, {});
    expect(r2.deliveries.length).toBe(1);
  });

  it("listDeliveries filters by type", async () => {
    const p = await seedPerson("List T", "Sector");
    await dbDeliveries.createDelivery(p, "individual", 1, []);
    await dbDeliveries.createDelivery(p, "collective", 5, []);

    const ind = await dbDeliveries.listDeliveries(p, { type: "individual" });
    expect(ind.deliveries.length).toBe(1);
    expect(ind.deliveries[0].delivery_type).toBe("individual");

    const col = await dbDeliveries.listDeliveries(p, { type: "collective" });
    expect(col.deliveries.length).toBe(1);
    expect(col.deliveries[0].delivery_type).toBe("collective");
  });

  it("listDeliveries paginates", async () => {
    const p = await seedPerson("List Pag", "Sector");
    for (let i = 0; i < 5; i++) {
      await dbDeliveries.createDelivery(p, "individual", 1, []);
    }
    const page1 = await dbDeliveries.listDeliveries(p, { page: 1, pageSize: 2 });
    const page2 = await dbDeliveries.listDeliveries(p, { page: 2, pageSize: 2 });
    const page3 = await dbDeliveries.listDeliveries(p, { page: 3, pageSize: 2 });
    expect(page1.deliveries.length).toBe(2);
    expect(page2.deliveries.length).toBe(2);
    expect(page3.deliveries.length).toBe(1);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
  });

  it("updateDelivery changes type and count", async () => {
    const p = await seedPerson("Upd", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);
    const updated = await dbDeliveries.updateDelivery(created.id, {
      delivery_type: "collective",
      beneficiary_count: 10,
    });
    expect(updated?.delivery_type).toBe("collective");
    expect(updated?.beneficiary_count).toBe(10);
  });

  it("updateDelivery clamps count to 1 for individual", async () => {
    const p = await seedPerson("Upd Ind", "Sector");
    const created = await dbDeliveries.createDelivery(p, "collective", 5, []);
    const updated = await dbDeliveries.updateDelivery(created.id, {
      delivery_type: "individual",
    });
    expect(updated?.delivery_type).toBe("individual");
    expect(updated?.beneficiary_count).toBe(1);
  });

  it("updateDelivery returns undefined for missing id", async () => {
    const r = await dbDeliveries.updateDelivery(999_999, { delivery_type: "individual" });
    expect(r).toBeUndefined();
  });

  it("deleteDelivery cascades to items", async () => {
    const p = await seedPerson("Del", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, ["agua", "ropa"]);
    const deleted = await dbDeliveries.deleteDelivery(created.id);
    expect(deleted).toBe(true);

    const items = await verifyClient.execute({
      sql: "SELECT * FROM delivery_items WHERE delivery_id = ?",
      args: [created.id],
    });
    expect(items.rows.length).toBe(0);
  });

  it("deleteDelivery returns false for missing id", async () => {
    const r = await dbDeliveries.deleteDelivery(999_999);
    expect(r).toBe(false);
  });

  it("addDeliveryItem + removeDeliveryItem round-trip", async () => {
    const p = await seedPerson("Item", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);

    const added = await dbDeliveries.addDeliveryItem(created.id, "agua");
    expect(added.delivery_id).toBe(created.id);
    expect(added.item).toBe("agua");

    const removed = await dbDeliveries.removeDeliveryItem(added.id);
    expect(removed).toBe(true);

    const items = await dbDeliveries.getDeliveryItems(created.id);
    expect(items.length).toBe(0);
  });

  it("removeDeliveryItem returns false for missing id", async () => {
    const r = await dbDeliveries.removeDeliveryItem(999_999);
    expect(r).toBe(false);
  });
});

// ── 3. Split collective delivery (D5) — the critical transaction ──────

describe("deliveries: splitCollectiveDelivery", () => {
  it("happy path: full split deletes the collective", async () => {
    const personA = await seedPerson("Split A", "Sector");
    const personB = await seedPerson("Split B", "Sector");
    const personC = await seedPerson("Split C", "Sector");

    const collective = await dbDeliveries.createDelivery(personA, "collective", 3, [
      "agua",
      "kit_alimento",
    ]);

    const result = await dbDeliveries.splitCollectiveDelivery(collective.id, [
      personA,
      personB,
      personC,
    ]);

    expect(result.individualDeliveries.length).toBe(3);
    expect(result.remainingCount).toBe(0);
    expect(result.individualDeliveries.every((d) => d.delivery_type === "individual")).toBe(
      true
    );
    expect(result.individualDeliveries.every((d) => d.beneficiary_count === 1)).toBe(true);

    // Collective row should be gone.
    const after = await dbDeliveries.getDelivery(collective.id);
    expect(after).toBeUndefined();
  });

  it("partial split decrements beneficiary_count and keeps collective", async () => {
    const p1 = await seedPerson("Partial 1", "Sector");
    const p2 = await seedPerson("Partial 2", "Sector");
    const p3 = await seedPerson("Partial 3", "Sector");

    const collective = await dbDeliveries.createDelivery(p1, "collective", 5, ["agua"]);

    const result = await dbDeliveries.splitCollectiveDelivery(collective.id, [p1, p2, p3]);

    expect(result.individualDeliveries.length).toBe(3);
    expect(result.remainingCount).toBe(2);

    const after = await dbDeliveries.getDelivery(collective.id);
    expect(after).toBeDefined();
    expect(after?.beneficiary_count).toBe(2);
  });

  it("copies the collective's items to each new individual", async () => {
    const p1 = await seedPerson("Items 1", "Sector");
    const p2 = await seedPerson("Items 2", "Sector");
    const collective = await dbDeliveries.createDelivery(p1, "collective", 2, [
      "agua",
      "medicamentos",
      "ropa",
    ]);

    await dbDeliveries.splitCollectiveDelivery(collective.id, [p1, p2]);

    const d1 = await dbDeliveries.listDeliveries(p1, {});
    const d2 = await dbDeliveries.listDeliveries(p2, {});
    expect(d1.deliveries[0].items.map((i) => i.item).sort()).toEqual([
      "agua",
      "medicamentos",
      "ropa",
    ]);
    expect(d2.deliveries[0].items.map((i) => i.item).sort()).toEqual([
      "agua",
      "medicamentos",
      "ropa",
    ]);
  });

  it("rejects split when person_ids.length > beneficiary_count", async () => {
    const p1 = await seedPerson("Exc 1", "Sector");
    const p2 = await seedPerson("Exc 2", "Sector");
    const p3 = await seedPerson("Exc 3", "Sector");
    const p4 = await seedPerson("Exc 4", "Sector");
    const collective = await dbDeliveries.createDelivery(p1, "collective", 2, []);

    await expect(
      dbDeliveries.splitCollectiveDelivery(collective.id, [p1, p2, p3, p4])
    ).rejects.toBeInstanceOf(dbDeliveries.DeliveryValidationError);

    // The collective must be unchanged.
    const after = await dbDeliveries.getDelivery(collective.id);
    expect(after?.beneficiary_count).toBe(2);
  });

  it("rejects split on a non-collective delivery", async () => {
    const p = await seedPerson("NonCol", "Sector");
    const ind = await dbDeliveries.createDelivery(p, "individual", 1, []);

    await expect(
      dbDeliveries.splitCollectiveDelivery(ind.id, [p])
    ).rejects.toBeInstanceOf(dbDeliveries.DeliveryValidationError);
  });

  it("rejects split on a missing delivery", async () => {
    await expect(
      dbDeliveries.splitCollectiveDelivery(999_999, [1])
    ).rejects.toBeInstanceOf(dbDeliveries.DeliveryValidationError);
  });

  it("rejects empty person_ids array", async () => {
    const p = await seedPerson("Empty Split", "Sector");
    const collective = await dbDeliveries.createDelivery(p, "collective", 3, []);
    await expect(
      dbDeliveries.splitCollectiveDelivery(collective.id, [])
    ).rejects.toBeInstanceOf(dbDeliveries.DeliveryValidationError);
  });

  it("rolls back on FK failure (person_id does not exist)", async () => {
    const p = await seedPerson("FK Test", "Sector");
    const collective = await dbDeliveries.createDelivery(p, "collective", 3, ["agua"]);

    // Person 999_999 does not exist; the INSERT will violate the FK.
    await expect(
      dbDeliveries.splitCollectiveDelivery(collective.id, [p, 999_999])
    ).rejects.toThrow();

    // Collective must still be at count 3 and still exist.
    const after = await dbDeliveries.getDelivery(collective.id);
    expect(after).toBeDefined();
    expect(after?.beneficiary_count).toBe(3);

    // No new individual rows should have been committed. We only created
    // the one collective, so the entire deliveries table should still
    // contain just that single row.
    const all = await verifyClient.execute({
      sql: "SELECT * FROM deliveries WHERE delivery_type = 'individual'",
      args: [],
    });
    expect(all.rows.length).toBe(0);

    // The collective's items should also still be intact.
    const items = await verifyClient.execute({
      sql: "SELECT * FROM delivery_items WHERE delivery_id = ?",
      args: [collective.id],
    });
    expect(items.rows.length).toBe(1);
  });

  it("splits exactly when person_ids.length == beneficiary_count", async () => {
    const p1 = await seedPerson("Eq 1", "Sector");
    const p2 = await seedPerson("Eq 2", "Sector");
    const collective = await dbDeliveries.createDelivery(p1, "collective", 2, []);

    const result = await dbDeliveries.splitCollectiveDelivery(collective.id, [p1, p2]);
    expect(result.remainingCount).toBe(0);

    const after = await dbDeliveries.getDelivery(collective.id);
    expect(after).toBeUndefined();
  });
});

// ── 4. Item distribution queries (I4 / I5) ────────────────────────────

describe("deliveries: item distribution queries", () => {
  it("personsByItem returns distinct persons who received the item", async () => {
    const p1 = await seedPerson("Item P1", "Sector");
    const p2 = await seedPerson("Item P2", "Sector");
    const p3 = await seedPerson("Item P3", "Sector");

    await dbDeliveries.createDelivery(p1, "individual", 1, ["agua"]);
    await dbDeliveries.createDelivery(p2, "individual", 1, ["agua", "ropa"]);
    await dbDeliveries.createDelivery(p3, "individual", 1, ["ropa"]);

    const personsWithAgua = await dbDeliveries.personsByItem("agua");
    expect(personsWithAgua.sort()).toEqual([p1, p2].sort());

    const personsWithRopa = await dbDeliveries.personsByItem("ropa");
    expect(personsWithRopa.sort()).toEqual([p2, p3].sort());
  });

  it("personsMissingItem returns persons who never received it", async () => {
    const p1 = await seedPerson("Miss P1", "Sector");
    const p2 = await seedPerson("Miss P2", "Sector");
    const p3 = await seedPerson("Miss P3", "Sector");

    await dbDeliveries.createDelivery(p1, "individual", 1, ["agua"]);
    await dbDeliveries.createDelivery(p2, "individual", 1, ["agua"]);

    const missing = await dbDeliveries.personsMissingItem("agua");
    expect(missing).toContain(p3);
    expect(missing).not.toContain(p1);
    expect(missing).not.toContain(p2);
  });
});

// ── 5. API routes — auth gating ───────────────────────────────────────

describe("API: auth gating", () => {
  it("GET /api/deliveries returns 401 when no session", async () => {
    mockGetServerSession.mockReturnValueOnce(null);
    const req = makeRequest("http://localhost/api/deliveries");
    const res = await routeList.GET(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/deliveries returns 200 for any authenticated session", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const req = makeRequest("http://localhost/api/deliveries");
    const res = await routeList.GET(req);
    expect(res.status).toBe(200);
  });

  it("POST /api/deliveries returns 403 for visor", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const req = makeRequest("http://localhost/api/deliveries", {
      method: "POST",
      body: { person_id: 1, delivery_type: "individual" },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/deliveries returns 400 for invalid body", async () => {
    const req = makeRequest("http://localhost/api/deliveries", {
      method: "POST",
      body: { person_id: -1, delivery_type: "weekly" },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/deliveries returns 404 when person does not exist", async () => {
    const req = makeRequest("http://localhost/api/deliveries", {
      method: "POST",
      body: { person_id: 999_999, delivery_type: "individual" },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(404);
  });

  it("POST /api/deliveries creates a delivery with items", async () => {
    const p = await seedPerson("API Create", "Sector");
    const req = makeRequest("http://localhost/api/deliveries", {
      method: "POST",
      body: {
        person_id: p,
        delivery_type: "collective",
        beneficiary_count: 3,
        items: ["agua", "medicamentos"],
      },
    });
    const res = await routeList.POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.person_id).toBe(p);
    expect(json.delivery_type).toBe("collective");
    expect(json.beneficiary_count).toBe(3);
    expect(json.items.length).toBe(2);
  });

  it("GET /api/deliveries/[id] returns 404 for missing delivery", async () => {
    const req = makeRequest("http://localhost/api/deliveries/999999");
    const res = await routeById.GET(req, {
      params: Promise.resolve({ id: "999999" }),
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/deliveries/[id] returns the delivery with items", async () => {
    const p = await seedPerson("API Get", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, ["ropa"]);

    const req = makeRequest(`http://localhost/api/deliveries/${created.id}`);
    const res = await routeById.GET(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(created.id);
    expect(json.items.length).toBe(1);
  });

  it("DELETE /api/deliveries/[id] returns 403 for visor", async () => {
    mockGetServerSession.mockReturnValueOnce({
      email: "visor@test",
      role: "visor",
    });
    const p = await seedPerson("API Del Forbidden", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);
    const req = makeRequest(`http://localhost/api/deliveries/${created.id}`, {
      method: "DELETE",
    });
    const res = await routeById.DELETE(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/deliveries/[id] cascades items", async () => {
    const p = await seedPerson("API Del", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, ["agua", "ropa"]);
    const req = makeRequest(`http://localhost/api/deliveries/${created.id}`, {
      method: "DELETE",
    });
    const res = await routeById.DELETE(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);

    const items = await verifyClient.execute({
      sql: "SELECT * FROM delivery_items WHERE delivery_id = ?",
      args: [created.id],
    });
    expect(items.rows.length).toBe(0);
  });

  it("POST /api/deliveries/[id]/items rejects invalid catalog item", async () => {
    const p = await seedPerson("API Item Bad", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);
    const req = makeRequest(`http://localhost/api/deliveries/${created.id}/items`, {
      method: "POST",
      body: { item: "no-existe" },
    });
    const res = await routeItems.POST(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/deliveries/[id]/items adds a valid item", async () => {
    const p = await seedPerson("API Item Good", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);
    const req = makeRequest(`http://localhost/api/deliveries/${created.id}/items`, {
      method: "POST",
      body: { item: "medicamentos" },
    });
    const res = await routeItems.POST(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item).toBe("medicamentos");
  });

  it("DELETE /api/deliveries/[id]/items/[itemId] removes the item", async () => {
    const p = await seedPerson("API Item Del", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, ["agua"]);
    const items = await dbDeliveries.getDeliveryItems(created.id);
    const itemId = items[0].id;

    const req = makeRequest(
      `http://localhost/api/deliveries/${created.id}/items/${itemId}`,
      { method: "DELETE" }
    );
    const res = await routeItemById.DELETE(req, {
      params: Promise.resolve({ id: String(created.id), itemId: String(itemId) }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/deliveries/[id]/split returns 400 when person_ids > count", async () => {
    const p = await seedPerson("API Split Over", "Sector");
    const created = await dbDeliveries.createDelivery(p, "collective", 2, []);

    const req = makeRequest(`http://localhost/api/deliveries/${created.id}/split`, {
      method: "POST",
      body: { person_ids: [1, 2, 3, 4] },
    });
    const res = await routeSplit.POST(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/deliveries/[id]/split performs a full split", async () => {
    const p1 = await seedPerson("API Split 1", "Sector");
    const p2 = await seedPerson("API Split 2", "Sector");
    const created = await dbDeliveries.createDelivery(p1, "collective", 2, ["agua"]);

    const req = makeRequest(`http://localhost/api/deliveries/${created.id}/split`, {
      method: "POST",
      body: { person_ids: [p1, p2] },
    });
    const res = await routeSplit.POST(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.individualDeliveries.length).toBe(2);
    expect(json.remainingCount).toBe(0);
  });

  it("POST /api/deliveries/[id]/split returns 400 for non-collective", async () => {
    const p = await seedPerson("API Split Ind", "Sector");
    const created = await dbDeliveries.createDelivery(p, "individual", 1, []);

    const req = makeRequest(`http://localhost/api/deliveries/${created.id}/split`, {
      method: "POST",
      body: { person_ids: [p] },
    });
    const res = await routeSplit.POST(req, {
      params: Promise.resolve({ id: String(created.id) }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/deliveries filters by person_id and type via query string", async () => {
    const p = await seedPerson("API List", "Sector");
    await dbDeliveries.createDelivery(p, "individual", 1, []);
    await dbDeliveries.createDelivery(p, "collective", 5, []);

    const req = makeRequest(
      `http://localhost/api/deliveries?person_id=${p}&type=collective`
    );
    const res = await routeList.GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deliveries.length).toBe(1);
    expect(json.deliveries[0].delivery_type).toBe("collective");
  });
});

// Suppress the unused-import warning for ZodError — it's referenced in
// type-guard instanceof checks inside the route handlers but not directly
// here. This keeps the import for clarity that ZodError is part of the
// error surface we test.
void ZodError;
