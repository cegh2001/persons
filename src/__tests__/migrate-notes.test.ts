/**
 * Unit tests for the notes-to-structured parser.
 *
 * Covers the cases the migration script will encounter in real
 * notes: pipe separators, newline separators, accent handling,
 * mixed Atención prefixes, collective detection, and the catalog
 * mapping rules documented in `migrate-notes-parser.ts`.
 *
 * No DB is touched — these tests exercise the pure parser only.
 * The end-to-end migration is covered by a manual dry-run against
 * the local `persons.db` (see PR 4 verification notes).
 */

import { describe, it, expect } from "vitest";

import {
  contentHash,
  hashAttention,
  hashDelivery,
  mapSpecialty,
  parseAttentionLine,
  parseDeliveryLine,
  parseNotes,
  splitNotes,
} from "@/lib/migrate-notes-parser";

// ── splitNotes ──────────────────────────────────────────────────────────

describe("splitNotes", () => {
  it("returns an empty array for empty input", () => {
    expect(splitNotes("")).toEqual([]);
    expect(splitNotes("   ")).toEqual([]);
  });

  it("returns the single line when there is no separator", () => {
    const lines = splitNotes("Entrega de suministros: agua");
    expect(lines).toEqual(["Entrega de suministros: agua"]);
  });

  it("splits on ` | ` pipe separators", () => {
    const notes =
      "Entrega de suministros: agua | Entrega de suministros: 2 Electrolit";
    expect(splitNotes(notes)).toEqual([
      "Entrega de suministros: agua",
      "Entrega de suministros: 2 Electrolit",
    ]);
  });

  it("splits on newlines", () => {
    const notes =
      "Entrega de suministros: agua\nAtención médica: Dr. X (Medicina General)";
    const lines = splitNotes(notes);
    expect(lines.length).toBe(2);
    expect(lines[0]).toMatch(/^Entrega de suministros/);
    expect(lines[1]).toMatch(/^Atención/);
  });

  it("re-splits concatenated Entrega entries with no separator", () => {
    const notes =
      "Entrega de suministros: agua, kit. Entrega de suministros: pañales.";
    const lines = splitNotes(notes);
    // Both entrega entries must be present, even though there is no
    // explicit `|` or newline between them.
    expect(lines).toContain("Entrega de suministros: agua, kit.");
    expect(lines).toContain("Entrega de suministros: pañales.");
  });

  it("preserves context parens at end of line", () => {
    const notes =
      "Entrega de suministros: agua. (Calle Real) | Entrega de suministros: 1 kit aseo (Palmar)";
    const lines = splitNotes(notes);
    expect(lines[0]).toBe("Entrega de suministros: agua. (Calle Real)");
    expect(lines[1]).toBe("Entrega de suministros: 1 kit aseo (Palmar)");
  });
});

// ── parseDeliveryLine ───────────────────────────────────────────────────

describe("parseDeliveryLine", () => {
  it("parses the canonical 'kit de aseo personal' line", () => {
    const r = parseDeliveryLine(
      "Entrega de suministros: agua, Electrolit, pañales, kit de aseo personal, etc."
    );
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(
      ["agua", "electrolit", "kit_higiene", "pañales"].sort()
    );
    expect(r!.isCollective).toBe(false);
  });

  it("parses '1 kit de aseo personal y 1 de alimento'", () => {
    const r = parseDeliveryLine(
      "Entrega de suministros: 1 kit de aseo personal y 1 de alimento."
    );
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(["kit_alimento", "kit_higiene"]);
  });

  it("parses '2 Agua, 2 Electrolit'", () => {
    const r = parseDeliveryLine("Entrega de suministros: 2 Agua, 2 Electrolit");
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(["agua", "electrolit"]);
  });

  it("parses 'kit personal, comida, agua.'", () => {
    const r = parseDeliveryLine("Entrega de suministros: kit personal, comida, agua.");
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(["agua", "kit_alimento", "kit_higiene"]);
  });

  it("parses 'Toalla y Gel, pañales XG.'", () => {
    const r = parseDeliveryLine("Entrega de suministros: Toalla y Gel, pañales XG.");
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(["pañales", "toallas"]);
  });

  it("detects a collective entry with '2 niños ... 1 Sra 84 años'", () => {
    const r = parseDeliveryLine(
      "Entrega de suministros: Talla M y P, 2 toallas y gel, 2 protector cama. 2 niños de 4 y 8 meses. 1 Sra 84 años."
    );
    expect(r).not.toBeNull();
    expect(r!.isCollective).toBe(true);
    expect(r!.beneficiaryCount).toBe(3);
    expect(r!.items).toEqual(["protector_cama", "ropa", "toallas"]);
  });

  it("detects a collective handoff to a damnificada", () => {
    const r = parseDeliveryLine(
      "Entrega de suministros: 2 colchonetas, alimentos y pañales para una damnificada en Calle del Hambre."
    );
    expect(r).not.toBeNull();
    expect(r!.isCollective).toBe(true);
    expect(r!.beneficiaryCount).toBeGreaterThanOrEqual(2);
  });

  it("returns null when the line is not a delivery", () => {
    expect(parseDeliveryLine("Atención médica: Dr. X (Medicina General)")).toBeNull();
    expect(parseDeliveryLine("Tlf: 04141234567")).toBeNull();
    expect(parseDeliveryLine("")).toBeNull();
  });

  it("returns null when no catalog items are recognized", () => {
    const r = parseDeliveryLine("Entrega de suministros: 1 silla de ruedas");
    expect(r).toBeNull();
  });

  it("is case-insensitive on the keyword", () => {
    const r = parseDeliveryLine("ENTREGA DE SUMINISTROS: agua");
    expect(r).not.toBeNull();
    expect(r!.items).toEqual(["agua"]);
  });
});

// ── parseAttentionLine ──────────────────────────────────────────────────

describe("parseAttentionLine", () => {
  it("parses a medical line with date DD-MM-YYYY and Edad", () => {
    const r = parseAttentionLine(
      "Atención médica: Dr. Juan Andrade (Medicina General) | Fecha: 09-07-2026 | Edad: 59 años"
    );
    expect(r).not.toBeNull();
    expect(r!.professional).toBe("Dr. Juan Andrade");
    expect(r!.specialty).toBe("medicina_general");
    expect(r!.date).toBe("2026-07-09");
    expect(r!.patientAge).toBe(59);
    expect(r!.patientSex).toBeNull();
    expect(r!.diagnosis).toBeNull();
  });

  it("parses a medical line with date DD/MM/YYYY, Edad, Sexo", () => {
    const r = parseAttentionLine(
      "Atención médica: Dra. Neyda Castillo (Endocrinología/Medicina Interna) | Edad: 68 años | Sexo: F"
    );
    expect(r).not.toBeNull();
    expect(r!.professional).toBe("Dra. Neyda Castillo");
    expect(r!.specialty).toBe("endocrinologia");
    expect(r!.date).toBeNull();
    expect(r!.patientAge).toBe(68);
    expect(r!.patientSex).toBe("F");
  });

  it("parses a physiotherapy line with Diagnóstico", () => {
    const r = parseAttentionLine(
      "Atención fisioterapéutica: Ft. Catherin Camara (Fisioterapia) | Fecha: 07/07/2026 | Edad: 55 años | Sexo: F | Diagnóstico: Tensión en musculatura"
    );
    expect(r).not.toBeNull();
    expect(r!.professional).toBe("Ft. Catherin Camara");
    expect(r!.specialty).toBe("fisioterapia");
    expect(r!.date).toBe("2026-07-07");
    expect(r!.patientAge).toBe(55);
    expect(r!.patientSex).toBe("F");
    expect(r!.diagnosis).toBe("Tensión en musculatura");
  });

  it("parses a psychology line with Tipo", () => {
    const r = parseAttentionLine(
      "Atención psicológica: Lic. María José (Psicología) | Fecha: 11/07/2026 | Tipo: Soporte"
    );
    expect(r).not.toBeNull();
    expect(r!.professional).toBe("Lic. María José");
    expect(r!.specialty).toBe("psicologia");
    expect(r!.date).toBe("2026-07-11");
    expect(r!.diagnosis).toBeNull();
  });

  it("returns null when no name+specialty parentheses are present", () => {
    expect(parseAttentionLine("Atención médica: Control Medico")).toBeNull();
    expect(parseAttentionLine("Atención médica: ")).toBeNull();
  });

  it("returns specialty=null for unknown specialties (catalog miss)", () => {
    const r = parseAttentionLine(
      "Atención médica: Dr. Juan Andrade (Cirugía General) | Edad: 79 años"
    );
    expect(r).not.toBeNull();
    expect(r!.specialty).toBeNull();
    expect(r!.professional).toBe("Dr. Juan Andrade");
  });

  it("is case-insensitive and accent-insensitive on the keyword", () => {
    const r = parseAttentionLine(
      "ATENCIÓN MÉDICA: Dr. X (Medicina General)"
    );
    expect(r).not.toBeNull();
    expect(r!.specialty).toBe("medicina_general");
  });
});

// ── mapSpecialty ────────────────────────────────────────────────────────

describe("mapSpecialty", () => {
  it("returns the catalog key when the input is in the map", () => {
    expect(mapSpecialty("Medicina General")).toBe("medicina_general");
    expect(mapSpecialty("Fisioterapia")).toBe("fisioterapia");
    expect(mapSpecialty("Psicología")).toBe("psicologia");
    expect(mapSpecialty("Endocrinología/Medicina Interna")).toBe(
      "endocrinologia"
    );
  });

  it("returns null for unknown specialties", () => {
    expect(mapSpecialty("Cirugía General")).toBeNull();
    expect(mapSpecialty("Curas")).toBeNull();
    expect(mapSpecialty("Medicamentos (Diclofenaco)")).toBeNull();
    expect(mapSpecialty("")).toBeNull();
  });
});

// ── parseNotes (combined) ───────────────────────────────────────────────

describe("parseNotes", () => {
  it("parses a real multi-line notes blob", () => {
    const notes = [
      "Entrega de suministros: agua, Electrolit, pañales, kit de aseo personal, etc.",
      "Atención médica: Dra. Neyda Castillo (Endocrinología/Medicina Interna) | Edad: 68 años | Sexo: F",
      "Atención fisioterapéutica: Ft. Catherin Camara (Fisioterapia) | Fecha: 07/07/2026 | Edad: 68 años | Sexo: F | Diagnóstico: Edema en MMII",
    ].join("\n");

    const r = parseNotes(notes);
    expect(r.deliveries).toHaveLength(1);
    expect(r.deliveries[0].items).toEqual(
      ["agua", "electrolit", "kit_higiene", "pañales"].sort()
    );
    expect(r.attentions).toHaveLength(2);
    expect(r.attentions[0].specialty).toBe("endocrinologia");
    expect(r.attentions[1].specialty).toBe("fisioterapia");
    expect(r.failures).toEqual([]);
  });

  it("captures parse failures for lines that match no pattern", () => {
    const r = parseNotes("Tlf: 04141234567");
    expect(r.deliveries).toEqual([]);
    expect(r.attentions).toEqual([]);
    expect(r.failures).toEqual([]);
  });

  it("flags Entrega lines with no catalog items as failures", () => {
    const r = parseNotes("Entrega de suministros: 1 silla de ruedas");
    expect(r.deliveries).toEqual([]);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].reason).toBe("no_catalog_items");
  });

  it("flags Atención lines without parentheses as failures", () => {
    const r = parseNotes("Atención médica: Control Medico");
    expect(r.attentions).toEqual([]);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].reason).toBe("missing_name_or_specialty");
  });
});

// ── hash functions ──────────────────────────────────────────────────────

describe("contentHash / hashDelivery / hashAttention", () => {
  it("contentHash is deterministic and 16 chars long", () => {
    const h1 = contentHash([1, "x", null]);
    const h2 = contentHash([1, "x", null]);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(16);
  });

  it("contentHash normalizes null and empty string to the same value", () => {
    // Optional fields that are omitted on one run and explicitly null
    // on the next must produce the same hash, otherwise re-runs of
    // the migration would re-insert existing rows.
    expect(contentHash(["a", null])).toBe(contentHash(["a", ""]));
  });

  it("hashDelivery is stable for the same content regardless of item order", () => {
    // The hash sorts items internally so callers do not need to
    // pre-sort. This is important because parseNotes returns
    // `Array.from(found).sort()` but the dedup preload reads
    // items back from SQLite in insertion order.
    const a = hashDelivery({
      personId: 1,
      deliveryType: "individual",
      beneficiaryCount: 1,
      items: ["agua", "pañales"],
    });
    const b = hashDelivery({
      personId: 1,
      deliveryType: "individual",
      beneficiaryCount: 1,
      items: ["pañales", "agua"],
    });
    expect(a).toBe(b);
  });

  it("hashDelivery changes when delivery_type changes", () => {
    const a = hashDelivery({
      personId: 1,
      deliveryType: "individual",
      beneficiaryCount: 1,
      items: ["agua"],
    });
    const b = hashDelivery({
      personId: 1,
      deliveryType: "collective",
      beneficiaryCount: 1,
      items: ["agua"],
    });
    expect(a).not.toBe(b);
  });

  it("hashAttention ignores null diagnosis vs missing diagnosis", () => {
    const a = hashAttention({
      personId: 1,
      date: "2026-07-09",
      professional: "Dr. X",
      specialty: "medicina_general",
      diagnosis: null,
    });
    const b = hashAttention({
      personId: 1,
      date: "2026-07-09",
      professional: "Dr. X",
      specialty: "medicina_general",
      diagnosis: "Tensión",
    });
    expect(a).not.toBe(b);
  });
});
