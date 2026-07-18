import { describe, it, expect } from "vitest";
import {
  DELIVERY_TYPES,
  SUPPLY_ITEMS,
  MEDICAL_SPECIALTIES,
  deliveryTypeSchema,
  supplyItemSchema,
  medicalSpecialtySchema,
} from "@/lib/validation";

describe("DELIVERY_TYPES catalog", () => {
  it("exports exactly the two expected values", () => {
    expect([...DELIVERY_TYPES]).toEqual(["individual", "collective"]);
  });

  it("deliveryTypeSchema accepts 'individual'", () => {
    const result = deliveryTypeSchema.safeParse("individual");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("individual");
  });

  it("deliveryTypeSchema accepts 'collective'", () => {
    const result = deliveryTypeSchema.safeParse("collective");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("collective");
  });

  it("deliveryTypeSchema rejects unknown types", () => {
    for (const invalid of ["", "weekly", "monthly", "INDIVIDUAL", "Individual"]) {
      const result = deliveryTypeSchema.safeParse(invalid);
      expect(result.success, `expected '${invalid}' to be rejected`).toBe(false);
    }
  });

  it("deliveryTypeSchema rejects non-string inputs", () => {
    for (const invalid of [null, undefined, 1, true, {}, []]) {
      const result = deliveryTypeSchema.safeParse(invalid);
      expect(result.success, `expected ${JSON.stringify(invalid)} to be rejected`).toBe(false);
    }
  });
});

describe("SUPPLY_ITEMS catalog", () => {
  it("exports exactly 17 supply items in the expected order", () => {
    expect([...SUPPLY_ITEMS]).toEqual([
      "agua",
      "electrolit",
      "kit_alimento",
      "pañales",
      "kit_higiene",
      "medicamentos",
      "insumos_medicos",
      "ropa",
      "calzado",
      "protector_cama",
      "toallas",
      "colchoneta",
      "carpas",
      "silla_ruedas",
      "muletas",
      "otros",
    ]);
  });

  it.each([
    "agua",
    "electrolit",
    "kit_alimento",
    "pañales",
    "kit_higiene",
    "medicamentos",
    "insumos_medicos",
    "ropa",
    "calzado",
    "protector_cama",
    "toallas",
    "colchoneta",
    "carpas",
    "silla_ruedas",
    "muletas",
    "otros",
  ] as const)("supplyItemSchema accepts '%s'", (item) => {
    const result = supplyItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(item);
  });

  it.each([
    "combustible",
    "AGUA",          // wrong case
    "kit_limpieza",  // not in catalog
    "agua ",         // trailing whitespace
    " agua",         // leading whitespace
    "",
    "pañales_extra",
  ])("supplyItemSchema rejects '%s'", (item) => {
    const result = supplyItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("supplyItemSchema rejects non-string inputs", () => {
    for (const invalid of [null, undefined, 0, true, {}, []]) {
      const result = supplyItemSchema.safeParse(invalid);
      expect(result.success, `expected ${JSON.stringify(invalid)} to be rejected`).toBe(false);
    }
  });
});

describe("MEDICAL_SPECIALTIES catalog", () => {
  it("exports exactly 7 medical specialties in the expected order", () => {
    expect([...MEDICAL_SPECIALTIES]).toEqual([
      "traumatologia",
      "fisioterapia",
      "medicina_interna",
      "medicina_general",
      "pediatria",
      "psicologia",
      "endocrinologia",
    ]);
  });

  it.each([
    "traumatologia",
    "fisioterapia",
    "medicina_interna",
    "medicina_general",
    "pediatria",
    "psicologia",
    "endocrinologia",
  ] as const)("medicalSpecialtySchema accepts '%s'", (specialty) => {
    const result = medicalSpecialtySchema.safeParse(specialty);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(specialty);
  });

  it.each(["cirugia", "cardiologia", "TRAUMATOLOGIA", "Pediatria", "pediatr", "", "medicina"])(
    "medicalSpecialtySchema rejects '%s'",
    (specialty) => {
      const result = medicalSpecialtySchema.safeParse(specialty);
      expect(result.success).toBe(false);
    }
  );

  it("medicalSpecialtySchema rejects non-string inputs", () => {
    for (const invalid of [null, undefined, 0, true, {}, []]) {
      const result = medicalSpecialtySchema.safeParse(invalid);
      expect(result.success, `expected ${JSON.stringify(invalid)} to be rejected`).toBe(false);
    }
  });
});

describe("catalog arrays stay in sync with their Zod schemas", () => {
  it("every DELIVERY_TYPES value is accepted by deliveryTypeSchema", () => {
    for (const value of DELIVERY_TYPES) {
      expect(deliveryTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it("every SUPPLY_ITEMS value is accepted by supplyItemSchema", () => {
    for (const value of SUPPLY_ITEMS) {
      expect(supplyItemSchema.safeParse(value).success).toBe(true);
    }
  });

  it("every MEDICAL_SPECIALTIES value is accepted by medicalSpecialtySchema", () => {
    for (const value of MEDICAL_SPECIALTIES) {
      expect(medicalSpecialtySchema.safeParse(value).success).toBe(true);
    }
  });
});
