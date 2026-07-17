/**
 * Deliveries data layer — CRUD + collective split transaction.
 *
 * Implements the `deliveries` and `delivery_items` tables introduced by
 * the `structured-deliveries` change. The collective-to-individual split
 * uses a `BEGIN IMMEDIATE` transaction with a `batch` of statements and
 * a post-write verify step, so a half-applied split cannot leave the
 * beneficiary_count inconsistent with the individual rows.
 *
 * All functions take a libsql `Client` (via `getDb()`) — there is no
 * module-level state other than the shared client, so the same
 * functions can be exercised under the real DB or a test DB.
 */

import type { InValue } from "@libsql/client";
import { getDb } from "@/lib/db";

// ── Row types ──────────────────────────────────────────────────────────

export interface DeliveryRow {
  id: number;
  person_id: number;
  delivery_type: "individual" | "collective";
  beneficiary_count: number;
  created_at: string;
}

export interface DeliveryItemRow {
  id: number;
  delivery_id: number;
  item: string;
}

/**
 * A delivery with its items joined in. Returned by `getDelivery` and the
 * `listDeliveries` rows (each row has its items inlined).
 */
export interface DeliveryWithItems extends DeliveryRow {
  items: DeliveryItemRow[];
}

export interface DeliveryFilters {
  person_id?: number;
  type?: "individual" | "collective";
  page?: number;
  pageSize?: number;
}

export interface PaginatedDeliveries {
  deliveries: DeliveryWithItems[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SplitResult {
  individualDeliveries: DeliveryRow[];
  remainingCount: number;
}

/**
 * Domain error raised by the data layer when the caller-supplied input
 * violates a server-side invariant (e.g. splitting more people than the
 * collective's beneficiary_count allows). Route handlers map this to a
 * 400 response; FK and connection failures propagate as-is.
 */
export class DeliveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryValidationError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

async function fetchItemsForDeliveries(
  db: Awaited<ReturnType<typeof getDb>>,
  deliveryIds: number[]
): Promise<Map<number, DeliveryItemRow[]>> {
  const map = new Map<number, DeliveryItemRow[]>();
  if (deliveryIds.length === 0) return map;

  // Single round-trip instead of N+1.
  const placeholders = deliveryIds.map(() => "?").join(",");
  const res = await db.execute({
    sql: `SELECT id, delivery_id, item FROM delivery_items WHERE delivery_id IN (${placeholders}) ORDER BY id ASC`,
    args: deliveryIds,
  });

  for (const row of res.rows as unknown as DeliveryItemRow[]) {
    const list = map.get(row.delivery_id) ?? [];
    list.push(row);
    map.set(row.delivery_id, list);
  }
  return map;
}

async function fetchItemsForDelivery(
  db: Awaited<ReturnType<typeof getDb>>,
  deliveryId: number
): Promise<DeliveryItemRow[]> {
  const res = await db.execute({
    sql: "SELECT id, delivery_id, item FROM delivery_items WHERE delivery_id = ? ORDER BY id ASC",
    args: [deliveryId],
  });
  return res.rows as unknown as DeliveryItemRow[];
}

function rowToDeliveryWithItems(
  row: DeliveryRow,
  items: DeliveryItemRow[]
): DeliveryWithItems {
  return { ...row, items };
}

// ── Delivery CRUD ──────────────────────────────────────────────────────

/**
 * Create a delivery for an existing person, optionally with items.
 * Items are validated against the catalog by the caller (Zod).
 * Returns the created row.
 */
export async function createDelivery(
  personId: number,
  deliveryType: "individual" | "collective",
  beneficiaryCount?: number,
  items?: string[]
): Promise<DeliveryRow> {
  const count = beneficiaryCount ?? 1;
  // Sanity cap: collective deliveries cannot exceed 10000 persons.
  if (deliveryType === "collective" && count > 10000) {
    throw new DeliveryValidationError(
      `El número de personas alcanzadas (${count}) excede el límite permitido (10 000).`
    );
  }
  const safeCount = type === "individual" ? 1 : count;
  const itemList = items ?? [];

  const insertRes = await db.execute({
    sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, ?, ?) RETURNING *",
    args: [personId, type, safeCount],
  });
  const row = insertRes.rows[0] as unknown as DeliveryRow;

  for (const item of itemList) {
    await db.execute({
      sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, ?)",
      args: [row.id, item],
    });
  }

  return row;
}

export async function getDelivery(
  id: number
): Promise<DeliveryWithItems | undefined> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM deliveries WHERE id = ?",
    args: [id],
  });
  const row = res.rows[0] as unknown as DeliveryRow | undefined;
  if (!row) return undefined;
  const items = await fetchItemsForDelivery(db, id);
  return rowToDeliveryWithItems(row, items);
}

export async function listDeliveries(
  personId: number | undefined,
  filters: DeliveryFilters = {}
): Promise<PaginatedDeliveries> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: InValue[] = [];

  const effectivePersonId =
    personId !== undefined ? personId : filters.person_id;

  if (effectivePersonId !== undefined) {
    conditions.push("person_id = ?");
    params.push(effectivePersonId);
  }

  if (filters.type !== undefined) {
    conditions.push("delivery_type = ?");
    params.push(filters.type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as total FROM deliveries ${where}`,
    args: params,
  });
  const total = Number(countRes.rows[0]?.total ?? 0);

  const rowsRes = await db.execute({
    sql: `SELECT * FROM deliveries ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...params, pageSize, offset],
  });
  const rows = rowsRes.rows as unknown as DeliveryRow[];

  const itemsByDelivery = await fetchItemsForDeliveries(
    db,
    rows.map((r) => r.id)
  );

  const deliveries: DeliveryWithItems[] = rows.map((r) =>
    rowToDeliveryWithItems(r, itemsByDelivery.get(r.id) ?? [])
  );

  return {
    deliveries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateDelivery(
  id: number,
  partial: { delivery_type?: "individual" | "collective"; beneficiary_count?: number }
): Promise<DeliveryRow | undefined> {
  const db = await getDb();
  const existingRes = await db.execute({
    sql: "SELECT * FROM deliveries WHERE id = ?",
    args: [id],
  });
  const existing = existingRes.rows[0] as unknown as DeliveryRow | undefined;
  if (!existing) return undefined;

  const delivery_type = partial.delivery_type ?? existing.delivery_type;
  // Individual deliveries are always beneficiary_count = 1 — the API
  // rejects count edits on individual rows by passing only type changes.
  const beneficiary_count =
    delivery_type === "individual"
      ? 1
      : partial.beneficiary_count ?? existing.beneficiary_count;

  if (delivery_type === "collective" && beneficiary_count > 10000) {
    throw new DeliveryValidationError(
      `El número de personas alcanzadas (${beneficiary_count}) excede el límite permitido (10 000).`
    );
  }

  await db.execute({
    sql: "UPDATE deliveries SET delivery_type = ?, beneficiary_count = ? WHERE id = ?",
    args: [delivery_type, beneficiary_count, id],
  });
  const res = await db.execute({
    sql: "SELECT * FROM deliveries WHERE id = ?",
    args: [id],
  });
  return res.rows[0] as unknown as DeliveryRow | undefined;
}

export async function deleteDelivery(id: number): Promise<boolean> {
  const db = await getDb();
  // delivery_items cascades via FK ON DELETE CASCADE, so a single DELETE
  // removes both the delivery and any items linked to it.
  const res = await db.execute({
    sql: "DELETE FROM deliveries WHERE id = ?",
    args: [id],
  });
  return Number(res.rowsAffected) > 0;
}

// ── Delivery items ─────────────────────────────────────────────────────

export async function addDeliveryItem(
  deliveryId: number,
  item: string
): Promise<DeliveryItemRow> {
  const db = await getDb();
  const res = await db.execute({
    sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, ?) RETURNING *",
    args: [deliveryId, item],
  });
  return res.rows[0] as unknown as DeliveryItemRow;
}

export async function removeDeliveryItem(itemId: number): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "DELETE FROM delivery_items WHERE id = ?",
    args: [itemId],
  });
  return Number(res.rowsAffected) > 0;
}

export async function getDeliveryItems(
  deliveryId: number
): Promise<DeliveryItemRow[]> {
  const db = await getDb();
  return fetchItemsForDelivery(db, deliveryId);
}

// ── Item distribution queries (delivery-items spec I4 / I5) ────────────

/**
 * Return distinct persons that received the given item at least once.
 */
export async function personsByItem(item: string): Promise<number[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT DISTINCT d.person_id AS person_id
          FROM delivery_items di
          INNER JOIN deliveries d ON d.id = di.delivery_id
          WHERE di.item = ?`,
    args: [item],
  });
  return res.rows.map((r) => Number(r.person_id));
}

/**
 * Return distinct persons that have never received the given item.
 * Implemented as an anti-join: persons that do not appear in the
 * delivery_items subquery for the given item.
 */
export async function personsMissingItem(item: string): Promise<number[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT p.id AS person_id
          FROM persons p
          WHERE NOT EXISTS (
            SELECT 1 FROM delivery_items di
            INNER JOIN deliveries d ON d.id = di.delivery_id
            WHERE d.person_id = p.id AND di.item = ?
          )
          ORDER BY p.id ASC`,
    args: [item],
  });
  return res.rows.map((r) => Number(r.person_id));
}

// ── Split collective delivery (D5) ─────────────────────────────────────

/**
 * Split a collective delivery into individual deliveries for each
 * personId in `personIds`.
 *
 * The split must happen atomically: either all individual rows are
 * created AND the collective's beneficiary_count is decremented, or
 * nothing changes. The flow is:
 *
 *   db.transaction("write")  ── opens a write transaction (BEGIN
 *                                 IMMEDIATE under the hood for the
 *                                 local SQLite driver).
 *     │
 *     ▼
 *   SELECT collective (under the write lock)
 *     │
 *     ▼
 *   For each personId, INSERT a new individual delivery and capture
 *   its `id` via RETURNING. This is needed to copy the collective's
 *   items into the new rows.
 *     │
 *     ▼
 *   tx.batch([ INSERT delivery_items rows using the captured ids,
 *              UPDATE collective beneficiary_count
 *              (or DELETE if exhausted) ])
 *     │
 *     ▼
 *   verify: SELECT the new individual rows and the collective's new
 *           count. If either is wrong, ROLLBACK and throw.
 *     │
 *     ▼
 *   tx.commit()
 *
 * The libsql `transaction()` API is used (not raw `BEGIN`/`COMMIT`)
 * because `client.batch(..., "write")` on a connection that already
 * has a transaction throws "cannot start a transaction within a
 * transaction". By going through the transaction object, `tx.batch()`
 * runs inside the existing transaction.
 *
 * On any thrown error (validation, FK failure, batch error) we issue
 * a best-effort rollback before re-throwing so the client never sees
 * a half-applied split.
 *
 * @throws DeliveryValidationError when the input is invalid
 *         (e.g. personIds.length > beneficiary_count, delivery not
 *         collective, or inserted rows missing after the split).
 */
export async function splitCollectiveDelivery(
  deliveryId: number,
  personIds: number[]
): Promise<SplitResult> {
  if (!Array.isArray(personIds) || personIds.length === 0) {
    throw new DeliveryValidationError(
      "Se requiere al menos un person_id para dividir."
    );
  }

  const db = await getDb();

  // Use the libsql `transaction()` API so that subsequent `tx.batch()`
  // calls run inside this transaction instead of starting a new one.
  const tx = await db.transaction("write");

  try {
    // Read the collective under the lock so we know its real count.
    const lookupRes = await tx.execute({
      sql: "SELECT * FROM deliveries WHERE id = ?",
      args: [deliveryId],
    });
    const collective = lookupRes.rows[0] as unknown as DeliveryRow | undefined;
    if (!collective) {
      throw new DeliveryValidationError("La entrega colectiva no existe.");
    }
    if (collective.delivery_type !== "collective") {
      throw new DeliveryValidationError(
        "Solo se pueden dividir entregas colectivas."
      );
    }
    if (personIds.length > collective.beneficiary_count) {
      throw new DeliveryValidationError(
        `beneficiary_count exceeded: no se pueden dividir ${personIds.length} cuando solo quedan ${collective.beneficiary_count}.`
      );
    }

    // Read the items that belong to the collective so we can copy them
    // onto every newly-created individual row.
    const itemsRes = await tx.execute({
      sql: "SELECT item FROM delivery_items WHERE delivery_id = ?",
      args: [deliveryId],
    });
    const collectiveItems = (itemsRes.rows as unknown as { item: string }[]).map(
      (r) => r.item
    );

    const remaining = collective.beneficiary_count - personIds.length;

    // ── Insert each individual delivery, capture id via RETURNING ─────
    // Sequential because libsql's `batch` does not surface the
    // RETURNING row for each statement on the version pinned in this
    // project. The TX still keeps the whole flow atomic.
    const newDeliveryIds: number[] = [];
    for (const personId of personIds) {
      const r = await tx.execute({
        sql: "INSERT INTO deliveries (person_id, delivery_type, beneficiary_count) VALUES (?, 'individual', 1) RETURNING id",
        args: [personId],
      });
      const newId = Number((r.rows[0] as unknown as { id: number | bigint }).id);
      newDeliveryIds.push(newId);
    }

    // ── Build the batch: insert items for each new delivery, then
    //    either update the collective's count or delete it.
    const statements: { sql: string; args: InValue[] }[] = [];
    for (let i = 0; i < newDeliveryIds.length; i++) {
      const newId = newDeliveryIds[i];
      for (const item of collectiveItems) {
        statements.push({
          sql: "INSERT INTO delivery_items (delivery_id, item) VALUES (?, ?)",
          args: [newId, item],
        });
      }
    }

    if (remaining > 0) {
      statements.push({
        sql: "UPDATE deliveries SET beneficiary_count = ? WHERE id = ?",
        args: [remaining, deliveryId],
      });
    } else {
      // All beneficiaries accounted for — delete the collective so it
      // does not show up with count 0 in lists/stats.
      statements.push({
        sql: "DELETE FROM deliveries WHERE id = ?",
        args: [deliveryId],
      });
    }

    await tx.batch(statements);

    // ── Verify ──────────────────────────────────────────────────────
    // Read the individual rows we just inserted. We have the exact ids,
    // so we can SELECT them directly to confirm they exist with the
    // expected shape.
    const verifyRes = await tx.execute({
      sql: `SELECT * FROM deliveries WHERE id IN (${newDeliveryIds.map(() => "?").join(",")}) ORDER BY id ASC`,
      args: newDeliveryIds,
    });
    const inserted = verifyRes.rows as unknown as DeliveryRow[];

    if (inserted.length !== newDeliveryIds.length) {
      throw new DeliveryValidationError(
        `Split verification failed: expected ${newDeliveryIds.length} new deliveries, found ${inserted.length}.`
      );
    }
    for (const row of inserted) {
      if (row.delivery_type !== "individual" || row.beneficiary_count !== 1) {
        throw new DeliveryValidationError(
          `Split verification failed: row ${row.id} has unexpected shape.`
        );
      }
    }

    // Confirm the items were actually copied.
    if (collectiveItems.length > 0) {
      const itemCountRes = await tx.execute({
        sql: `SELECT COUNT(*) AS cnt FROM delivery_items WHERE delivery_id IN (${newDeliveryIds.map(() => "?").join(",")})`,
        args: newDeliveryIds,
      });
      const expected = newDeliveryIds.length * collectiveItems.length;
      const actual = Number(itemCountRes.rows[0]?.cnt ?? 0);
      if (actual !== expected) {
        throw new DeliveryValidationError(
          `Split verification failed: expected ${expected} item rows, found ${actual}.`
        );
      }
    }

    // Confirm the collective's new state.
    if (remaining > 0) {
      const checkRes = await tx.execute({
        sql: "SELECT beneficiary_count FROM deliveries WHERE id = ?",
        args: [deliveryId],
      });
      const actual = checkRes.rows[0] as unknown as
        | { beneficiary_count: number | bigint }
        | undefined;
      if (!actual || Number(actual.beneficiary_count) !== remaining) {
        throw new DeliveryValidationError(
          `Split verification failed: collective count mismatch (expected ${remaining}, found ${actual ? actual.beneficiary_count : "null"}).`
        );
      }
    } else {
      const stillThere = await tx.execute({
        sql: "SELECT 1 FROM deliveries WHERE id = ?",
        args: [deliveryId],
      });
      if (stillThere.rows.length > 0) {
        throw new DeliveryValidationError(
          "Split verification failed: collective still present after exhausted split."
        );
      }
    }

    // ── COMMIT ───────────────────────────────────────────────────────
    await tx.commit();

    return {
      individualDeliveries: inserted,
      remainingCount: remaining,
    };
  } catch (err) {
    // Best-effort rollback. If the transaction is already in a failed
    // state the rollback will throw — swallow that to surface the
    // original error to the caller.
    try {
      await tx.rollback();
    } catch {
      // ignore
    }
    throw err;
  }
}
