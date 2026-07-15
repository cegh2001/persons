import { describe, it, expect } from "vitest";
import { classifyMatch } from "../db-scan";
import type { PersonRow } from "../db";

function makePerson(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 1,
    raw_name: "Juan Perez 12345678",
    name: "Juan Perez",
    document_id: "12345678",
    location: "Casco Central",
    is_vulnerable: 0,
    notes: "",
    received_supplies: 1,
    received_medical: 0,
    created_at: "2026-01-01",
    ...overrides,
  };
}

describe("classifyMatch", () => {
  it("returns 'none' when candidates array is empty", () => {
    const result = classifyMatch("Juan Perez", "12345678", []);
    expect(result.status).toBe("none");
    expect(result.existingPerson).toBeUndefined();
  });

  it("returns 'exact' when name AND document_id both match", () => {
    const candidates = [makePerson({ name: "Juan Perez", document_id: "12345678" })];
    const result = classifyMatch("Juan Perez", "12345678", candidates);
    expect(result.status).toBe("exact");
    expect(result.existingPerson).toBeDefined();
    expect(result.existingPerson!.name).toBe("Juan Perez");
  });

  it("returns 'exact' when name matches and extracted document_id is empty", () => {
    const candidates = [makePerson({ name: "Juan Perez", document_id: "12345678" })];
    const result = classifyMatch("Juan Perez", "", candidates);
    expect(result.status).toBe("exact");
  });

  it("returns 'partial' when name matches but document_id differs", () => {
    const candidates = [makePerson({ name: "Juan Perez", document_id: "99999999" })];
    const result = classifyMatch("Juan Perez", "12345678", candidates);
    expect(result.status).toBe("partial");
  });

  it("returns 'partial' when only document_id matches but name differs", () => {
    const candidates = [makePerson({ name: "Juan Carlos Perez", document_id: "12345678" })];
    const result = classifyMatch("Juan Perez", "12345678", candidates);
    expect(result.status).toBe("partial");
  });

  it("selects exact match over partial when multiple candidates exist", () => {
    const candidates = [
      makePerson({ id: 1, name: "Juan Perez", document_id: "99999999" }),
      makePerson({ id: 2, name: "Juan Perez", document_id: "12345678" }),
    ];
    const result = classifyMatch("Juan Perez", "12345678", candidates);
    expect(result.status).toBe("exact");
    expect(result.existingPerson!.id).toBe(2);
  });
});
