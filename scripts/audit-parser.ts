import { parseNotes } from "../src/lib/migrate-notes-parser";

const cases: [number, string][] = [
  [61, "Entrega de suministros: agua, Electrolit, pañales, kit de aseo personal, etc. Entrega de suministros: agua, Electrolit, pañales, kit de aseo personal, etc. (Palmar Este)"],
  [67, "Entrega de suministros: agua, Electrolit, pañales, kit de aseo personal, etc. 2 veces | Entrega de suministros: 1 Agua, 2 Electrolit (Calle Real). Entrega de suministros: 2 Electrolit, 1 Agua (Calle Real)"],
  [358, "Entrega de suministros: 1 kit de aseo personal y 1 de alimento. Entrega de suminisitros: varios kit de aseo personal y varios de alimento."],
  [473, "Entrega de suministros: kit comida, etc. Entrega de suministros: 1 kit de aseo personal y 1 de alimento. | Entrega de suministros: 1 Agua, 1 Electrolit (Calle Real) | Medicina General, Anderson Galindo (Desconocido). Entrega de suministros: 2 Electrolit, 1 Agua"],
  [571, "Entrega de suministros: 1 kit de aseo personal y 1 de alimento. Entrega de suministros: 1 kit de aseo personal y 1 de alimento.  (este otro registro salia en plaza la merced) | Entrega de suministros: 1 Combo Comida, 1 Kit Higiene (Calle Real) | Medicina General, Anderson Galindo (Desconocido)"],
  [391, "Entrega de suministros: 2 colchonetas, alimentos y pañales para una damnificada en Calle del Hambre.\nAtención fisioterapéutica: Ft. Catherin Camara (Fisioterapia) | Fecha: 10/07/2026 | Edad: 53 años | Sexo: F | Diagnóstico: Rectificación cervical\nAtención fisioterapéutica: Ft. Catherin Camara (Fisioterapia) | Fecha: 13/07/2026 | Edad: 53 años | Sexo: F | Diagnóstico: Rectificación cervical"],
  [662, "Entrega de suministros: 1 kit de aseo personal y 1 de alimento.\nAtención médica: Dr. Juan Andrade (Cirugía General) | Fecha: 10-07-2026 | Edad: 79 años\nAtención médica: Dr. Juan Andrade (Medicina General) | Fecha: 09-07-2026 | Edad: 79 años"],
];

for (const [id, notes] of cases) {
  const r = parseNotes(notes);
  console.log("ID " + id + ": " + r.deliveries.length + " del, " + r.attentions.length + " att, " + r.failures.length + " fail");
  for (const d of r.deliveries) console.log("  DEL: " + d.items.join(", "));
  for (const a of r.attentions) console.log("  ATT: " + a.professional + " | " + a.specialty + " | dx=" + a.diagnosis + " | date=" + a.date);
  for (const f of r.failures) console.log("  FAIL: " + f.reason + " | " + f.line?.substring(0, 80));
  console.log("");
}
