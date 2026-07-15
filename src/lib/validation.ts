import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es requerido")
    .email("Formato de correo inválido")
    .max(255),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Persons ───────────────────────────────────────────────────────────

export const createPersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  document_id: z
    .string()
    .trim()
    .max(50, "El documento no puede exceder 50 caracteres")
    .nullable()
    .optional(),
  location: z
    .string()
    .trim()
    .min(1, "El sector es requerido")
    .max(100),
  is_vulnerable: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(false),
  notes: z
    .string()
    .trim()
    .max(2000, "Las notas no pueden exceder 2000 caracteres")
    .optional()
    .default(""),
  received_supplies: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(true),
  received_medical: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(false),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const updatePersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(200)
    .optional(),
  document_id: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional(),
  location: z
    .string()
    .trim()
    .min(1, "El sector no puede estar vacío")
    .max(100)
    .optional(),
  is_vulnerable: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional(),
  received_supplies: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional(),
  received_medical: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional(),
});

export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

// ── Query params for list ─────────────────────────────────────────────

export const listPersonsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  location: z.string().trim().max(100).optional(),
  is_vulnerable: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).max(1).optional()),
  received_supplies: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).max(1).optional()),
  received_medical: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).max(1).optional()),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .default("15")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)),
});

export type ListPersonsQuery = z.infer<typeof listPersonsQuerySchema>;

// ── ID param ──────────────────────────────────────────────────────────

export const idParamSchema = z
  .string()
  .transform((v) => parseInt(v, 10))
  .pipe(z.number().int().positive("ID inválido"));

// ── PATCH /api/persons/[id] — partial updates ──────────────────────────

export const patchPersonSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre no puede estar vacío")
      .max(200)
      .optional(),
    document_id: z
      .string()
      .trim()
      .max(50)
      .nullable()
      .optional(),
    location: z
      .string()
      .trim()
      .min(1, "El sector no puede estar vacío")
      .max(100)
      .optional(),
    is_vulnerable: z
      .union([z.boolean(), z.number()])
      .transform((v) => (typeof v === "number" ? v !== 0 : v))
      .optional(),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional(),
    received_supplies: z
      .union([z.boolean(), z.number()])
      .transform((v) => (typeof v === "number" ? v !== 0 : v))
      .optional(),
    received_medical: z
      .union([z.boolean(), z.number()])
      .transform((v) => (typeof v === "number" ? v !== 0 : v))
      .optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.document_id !== undefined ||
      v.location !== undefined ||
      v.is_vulnerable !== undefined ||
      v.notes !== undefined ||
      v.received_supplies !== undefined ||
      v.received_medical !== undefined,
    { message: "Cuerpo vacío — no hay campos para actualizar." }
  );

export type PatchPersonInput = z.infer<typeof patchPersonSchema>;

// ── Scan commit batch ─────────────────────────────────────────────────

const matchStatusSchema = z.enum(["exact", "partial", "none"]);
const scanActionSchema = z.enum(["update", "merge", "create"]);

export const scanCommitRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(200),
  document_id: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional()
    .default(null),
  location: z
    .string()
    .trim()
    .min(1, "El sector es requerido")
    .max(100),
  type: z.enum(["supplies", "medical", "both"], {
    message: 'El tipo debe ser "supplies", "medical" o "both".',
  }),
  notes: z.string().trim().max(2000).optional().default(""),
  is_vulnerable: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(false),
  received_supplies: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(false),
  received_medical: z
    .union([z.boolean(), z.number()])
    .transform((v) => (typeof v === "number" ? v !== 0 : v))
    .optional()
    .default(false),
  matchStatus: matchStatusSchema,
  existingPersonId: z
    .number()
    .int()
    .positive()
    .optional(),
  action: scanActionSchema,
});

export type ScanCommitRow = z.infer<typeof scanCommitRowSchema>;

export const scanCommitSchema = z.object({
  rows: z
    .array(scanCommitRowSchema)
    .min(1, "Debe incluir al menos una fila para confirmar.")
    .max(100, "Máximo 100 filas por lote."),
});

export type ScanCommitPayload = z.infer<typeof scanCommitSchema>;
