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

// ── Structured Deliveries — Catalogs (PR 1, Foundation) ──────────────
// Source of truth for the fixed enumerations used by deliveries,
// delivery_items, and medical_attentions. The const arrays are exported
// so UI dropdowns can read the same values the API validates against.

export const DELIVERY_TYPES = ["individual", "collective"] as const;
export const deliveryTypeSchema = z.enum(DELIVERY_TYPES);
export type DeliveryType = z.infer<typeof deliveryTypeSchema>;

export const SUPPLY_ITEMS = [
  "agua",
  "electrolit",
  "kit_aseo",
  "kit_alimento",
  "pañales",
  "kit_higiene",
  "medicamentos",
  "ropa",
  "protector_cama",
  "toallas",
  "otros",
] as const;
export const supplyItemSchema = z.enum(SUPPLY_ITEMS);
export type SupplyItem = z.infer<typeof supplyItemSchema>;

export const MEDICAL_SPECIALTIES = [
  "traumatologia",
  "fisioterapia",
  "medicina_interna",
  "medicina_general",
  "pediatria",
  "psicologia",
  "endocrinologia",
] as const;
export const medicalSpecialtySchema = z.enum(MEDICAL_SPECIALTIES);
export type MedicalSpecialty = z.infer<typeof medicalSpecialtySchema>;

// ── Structured Deliveries — Delivery schemas (PR 2) ──────────────────
// Schemas used by the deliveries REST API. Catalogs above remain the
// single source of truth — these schemas compose them.

export const beneficiaryCountSchema = z
  .number()
  .int("beneficiary_count debe ser un entero")
  .min(1, "beneficiary_count debe ser al menos 1")
  .max(10_000, "beneficiary_count demasiado grande");

export const createDeliverySchema = z.object({
  person_id: z
    .number({ message: "person_id es requerido" })
    .int("person_id debe ser un entero")
    .positive("person_id debe ser positivo"),
  delivery_type: deliveryTypeSchema,
  beneficiary_count: beneficiaryCountSchema
    .optional()
    .default(1),
  items: z
    .array(supplyItemSchema)
    .max(20, "Máximo 20 ítems por entrega")
    .optional()
    .default([]),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const patchDeliverySchema = z
  .object({
    delivery_type: deliveryTypeSchema.optional(),
    beneficiary_count: beneficiaryCountSchema.optional(),
  })
  .refine(
    (v) =>
      v.delivery_type !== undefined || v.beneficiary_count !== undefined,
    { message: "Cuerpo vacío — no hay campos para actualizar." }
  );

export type PatchDeliveryInput = z.infer<typeof patchDeliverySchema>;

export const createDeliveryItemSchema = z.object({
  item: supplyItemSchema,
});

export type CreateDeliveryItemInput = z.infer<typeof createDeliveryItemSchema>;

export const splitDeliverySchema = z.object({
  person_ids: z
    .array(
      z
        .number()
        .int("person_id debe ser un entero")
        .positive("person_id debe ser positivo")
    )
    .min(1, "Se requiere al menos un person_id para dividir.")
    .max(1_000, "Demasiados person_ids en una sola operación."),
});

export type SplitDeliveryInput = z.infer<typeof splitDeliverySchema>;

export const listDeliveriesQuerySchema = z.object({
  person_id: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().positive().optional()),
  type: deliveryTypeSchema.optional(),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .default("20")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)),
});

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;

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
