/**
 * Medical attentions data layer — CRUD + aggregate stats.
 *
 * Implements the `medical_attentions` table introduced by the
 * `structured-deliveries` change. The table is keyed on `person_id`
 * (FK) and indexed on `person_id`, `specialty`, and `professional` so
 * the list/filters/stats queries stay cheap.
 *
 * All functions take a libsql `Client` (via `getDb()`) — there is no
 * module-level state other than the shared client, so the same
 * functions can be exercised under the real DB or a test DB.
 */

import type { InValue } from "@libsql/client";
import { getDb } from "@/lib/db";

// ── Row types ──────────────────────────────────────────────────────────

export interface MedicalAttentionRow {
  id: number;
  person_id: number;
  professional: string;
  specialty: string;
  patient_age: number | null;
  patient_sex: string | null;
  diagnosis: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicalAttentionFilters {
  person_id?: number;
  professional?: string;
  specialty?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedMedicalAttentions {
  attentions: MedicalAttentionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MedicalAttentionStats {
  /** Count of attentions grouped by specialty. Sorted descending by count. */
  bySpecialty: Record<string, number>;
  /** Count of attentions grouped by professional. Sorted descending by count. */
  byProfessional: Record<string, number>;
  /** Total number of attentions across all specialties and professionals. */
  totalAttentions: number;
}

// ── CRUD ───────────────────────────────────────────────────────────────

/**
 * Create a medical attention record for an existing person.
 * The caller is responsible for catalog validation (handled at the API
 * boundary by Zod using `medicalSpecialtySchema`).
 *
 * Optional fields (`patient_age`, `patient_sex`, `diagnosis`, `notes`)
 * are stored as NULL when omitted.
 *
 * Returns the created row.
 */
export async function createAttention(
  personId: number,
  professional: string,
  specialty: string,
  age?: number,
  sex?: string,
  diagnosis?: string,
  notes?: string
): Promise<MedicalAttentionRow> {
  const db = await getDb();
  const res = await db.execute({
    sql: `INSERT INTO medical_attentions
            (person_id, professional, specialty, patient_age, patient_sex, diagnosis, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      personId,
      professional,
      specialty,
      age ?? null,
      sex ?? null,
      diagnosis ?? null,
      notes ?? null,
    ],
  });
  return res.rows[0] as unknown as MedicalAttentionRow;
}

/**
 * Fetch a single attention by id. Returns `undefined` if the row does
 * not exist.
 */
export async function getAttention(
  id: number
): Promise<MedicalAttentionRow | undefined> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM medical_attentions WHERE id = ?",
    args: [id],
  });
  return res.rows[0] as unknown as MedicalAttentionRow | undefined;
}

/**
 * List attentions with optional filters. The `personId` first argument
 * is a convenience for the `?person_id=` query — if the caller passes
 * `undefined`, the function falls back to `filters.person_id`.
 *
 * Pagination: defaults to page 1, pageSize 20. Max pageSize 100.
 * Newest attentions come first.
 */
export async function listAttentions(
  personId: number | undefined,
  filters: MedicalAttentionFilters = {}
): Promise<PaginatedMedicalAttentions> {
  const db = await getDb();

  const conditions: string[] = [];
  const params: InValue[] = [];

  const effectivePersonId =
    personId !== undefined ? personId : filters.person_id;
  if (effectivePersonId !== undefined) {
    conditions.push("person_id = ?");
    params.push(effectivePersonId);
  }
  if (filters.professional !== undefined) {
    conditions.push("professional = ?");
    params.push(filters.professional);
  }
  if (filters.specialty !== undefined) {
    conditions.push("specialty = ?");
    params.push(filters.specialty);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM medical_attentions ${where}`,
    args: params,
  });
  const total = Number(countRes.rows[0]?.total ?? 0);

  const rowsRes = await db.execute({
    sql: `SELECT * FROM medical_attentions ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...params, pageSize, offset],
  });
  const attentions = rowsRes.rows as unknown as MedicalAttentionRow[];

  return {
    attentions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Partial update of an attention. Only the fields actually provided
 * in `partial` are touched; omitted fields preserve their current
 * values. Returns the updated row, or `undefined` if no row with the
 * given id exists.
 */
export async function updateAttention(
  id: number,
  partial: {
    professional?: string;
    specialty?: string;
    patient_age?: number | null;
    patient_sex?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
  }
): Promise<MedicalAttentionRow | undefined> {
  const db = await getDb();
  const existingRes = await db.execute({
    sql: "SELECT * FROM medical_attentions WHERE id = ?",
    args: [id],
  });
  const existing = existingRes.rows[0] as unknown as
    | MedicalAttentionRow
    | undefined;
  if (!existing) return undefined;

  const professional = partial.professional ?? existing.professional;
  const specialty = partial.specialty ?? existing.specialty;
  // Use the `!== undefined` guard so that an explicit `null` from the
  // caller clears the column rather than silently preserving the old
  // value.
  const patient_age =
    partial.patient_age !== undefined
      ? partial.patient_age
      : existing.patient_age;
  const patient_sex =
    partial.patient_sex !== undefined
      ? partial.patient_sex
      : existing.patient_sex;
  const diagnosis =
    partial.diagnosis !== undefined ? partial.diagnosis : existing.diagnosis;
  const notes = partial.notes !== undefined ? partial.notes : existing.notes;

  await db.execute({
    sql: `UPDATE medical_attentions
          SET professional = ?, specialty = ?, patient_age = ?,
              patient_sex = ?, diagnosis = ?, notes = ?
          WHERE id = ?`,
    args: [professional, specialty, patient_age, patient_sex, diagnosis, notes, id],
  });

  const afterRes = await db.execute({
    sql: "SELECT * FROM medical_attentions WHERE id = ?",
    args: [id],
  });
  return afterRes.rows[0] as unknown as MedicalAttentionRow | undefined;
}

/**
 * Delete an attention by id. Returns `true` if a row was removed,
 * `false` if no attention with that id existed.
 */
export async function deleteAttention(id: number): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({
    sql: "DELETE FROM medical_attentions WHERE id = ?",
    args: [id],
  });
  return Number(res.rowsAffected) > 0;
}

// ── Stats (M6 / M7) ───────────────────────────────────────────────────

/**
 * Aggregate statistics over the `medical_attentions` table:
 *   - `bySpecialty`: { specialty: count } sorted by count DESC
 *   - `byProfessional`: { professional: count } sorted by count DESC
 *   - `totalAttentions`: total row count
 *
 * Sorted descending so the largest groups surface first when the
 * UI renders them in a list.
 */
export async function getAttentionStats(): Promise<MedicalAttentionStats> {
  const db = await getDb();

  const totalRes = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM medical_attentions",
    args: [],
  });
  const totalAttentions = Number(totalRes.rows[0]?.total ?? 0);

  const specialtyRes = await db.execute({
    sql: `SELECT specialty, COUNT(*) AS count
          FROM medical_attentions
          GROUP BY specialty
          ORDER BY count DESC, specialty ASC`,
    args: [],
  });
  const bySpecialty: Record<string, number> = {};
  for (const r of specialtyRes.rows as unknown as {
    specialty: string;
    count: number | bigint;
  }[]) {
    bySpecialty[r.specialty] = Number(r.count);
  }

  const professionalRes = await db.execute({
    sql: `SELECT professional, COUNT(*) AS count
          FROM medical_attentions
          GROUP BY professional
          ORDER BY count DESC, professional ASC`,
    args: [],
  });
  const byProfessional: Record<string, number> = {};
  for (const r of professionalRes.rows as unknown as {
    professional: string;
    count: number | bigint;
  }[]) {
    byProfessional[r.professional] = Number(r.count);
  }

  return { bySpecialty, byProfessional, totalAttentions };
}
