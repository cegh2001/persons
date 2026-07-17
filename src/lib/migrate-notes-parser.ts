/**
 * Notes-to-structured parser.
 *
 * Pure functions that turn a `persons.notes` blob into structured
 * `Delivery` and `MedicalAttention` candidates. Kept free of any DB
 * or filesystem dependency so it can be unit-tested directly.
 *
 * The parser is intentionally lenient: real notes are messy. It
 * returns `null` (or an empty array) for entries it cannot recognize,
 * and the caller is responsible for logging those as parse failures.
 *
 * Conventions used here are derived from the actual `persons.notes`
 * values inspected during PR 4 (see `migrate-notes-report.json`):
 *
 *   - "Entrega de suministros: <items>" → one delivery, items are
 *     catalog-matched against SUPPLY_ITEMS via keyword regexes.
 *   - "Atención ... : <name> (<specialty>) | Fecha: ... | Edad: ...
 *     | Sexo: ... | Diagnóstico: ..." → one medical attention.
 *   - "Atención" lines use newlines or ` | ` as separators, while
 *     "Entrega" lines often have no separator at all (the next
 *     sentence starts after a period or after another entrega line).
 *
 * Mapping is best-effort: a `null` return means "do not insert this
 * line" and the caller should record it in the failure report.
 */

import { createHash } from "node:crypto";
import { MEDICAL_SPECIALTIES, SUPPLY_ITEMS } from "@/lib/validation";

export type SupplyItem = (typeof SUPPLY_ITEMS)[number];
export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];

/**
 * A candidate delivery extracted from a single line of `notes`.
 * `items` is always an array of catalog values (deduplicated, sorted).
 */
export interface ParsedDeliveryCandidate {
  /** Catalog items, sorted ascending, deduped. */
  items: SupplyItem[];
  /** Whether the line describes a multi-beneficiary delivery. */
  isCollective: boolean;
  /** Estimated beneficiary count when isCollective=true. */
  beneficiaryCount: number;
  /** Original line used for hashing and reporting. */
  rawLine: string;
}

/**
 * A candidate medical attention extracted from a single line of
 * `notes`. `specialty` is `null` when the parenthetical specialty
 * string is not in the catalog — the caller must decide whether to
 * skip or store as-is.
 */
export interface ParsedAttentionCandidate {
  professional: string;
  /** Catalog value, or `null` when the source specialty is unknown. */
  specialty: MedicalSpecialty | null;
  patientAge: number | null;
  patientSex: string | null;
  diagnosis: string | null;
  /** ISO YYYY-MM-DD, or `null` when no `Fecha:` was found. */
  date: string | null;
  /** Original line used for hashing and reporting. */
  rawLine: string;
}

// ── Keyword maps ────────────────────────────────────────────────────────

/**
 * Item regex → catalog value. Order matters: more specific patterns
 * must come before broader ones so "kit de aseo personal" matches
 * `kit_higiene` instead of falling into a generic "kit" bucket.
 *
 * `gel` maps to `toallas` because in the source data it is always
 * bath/shower gel, listed alongside "toalla". `componer` / `comida`
 * / `alimento` map to `kit_alimento`.
 */
const ITEM_PATTERNS: ReadonlyArray<[RegExp, SupplyItem]> = [
  [/\bagua(?:s)?\b/i, "agua"],
  [/\belectrolit\b/i, "electrolit"],
  // kit_higiene: "kit de aseo personal", "kit aseo", "kit personal",
  // "kit de artículos personales", "kit higiene", "productos de higiene",
  // "kit de limpieza", "artículos personales".
  [/\b(?:kit\s+(?:de\s+)?(?:aseo\s+personal|aseo|personal(?:es)?|higiene|art[íi]culos\s+personales|limpieza)|productos\s+de\s+higiene|art[íi]culos\s+personales)\b/i, "kit_higiene"],
  // kit_alimento: "alimento(s)", "comida", "kit de alimento(s)",
  // "kit de alimentación", "kit de comida", "kit de bebé", "compota(s)",
  // "enlatados", "sardinas", "combo de bebé", "leche".
  [/\b(?:alimento(?:s)?|comida|compota(?:s)?|enlatados|sardinas|leche|kit\s+(?:de\s+)?(?:alimento(?:s)?|alimentaci[oó]n|comida|beb[eé]|rn)|combo\s+de\s+beb[eé])\b/i, "kit_alimento"],
  [/\bpa[ñn]al(?:es)?\b|\bkit\s+de\s+rn\b/i, "pañales"],
  [
    /\bmedicament(?:o|os)\b|\bMedicamentos\s+entregados\b|\bkit\s+de\s+medicamentos\b/i,
    "medicamentos",
  ],
  // insumos_medicos: inyectadora, tensiómetro, adhesivo, curitas.
  [/\binyectadora(?:s)?\b|\btensi[oó]metro(?:s)?\b|\badhesivo\b|\bcuritas?\b/i, "insumos_medicos"],
  [/\bprotector\s+cama\b|\bcentro(?:s)?\s+de\s+cama\b/i, "protector_cama"],
  [/\btoalla(?:s|ita)?\b|\bgel\b/i, "toallas"],
  [/\bropa\b|\btalla\b/i, "ropa"],
  [/\bzapato(?:s)?\b|\bbotines?\b|\bcalzado\b/i, "calzado"],
  // colchoneta: also catches "colchón", "colchoneta(s)", "colchonetitas"
  [/\bcolch[oó]n(?:eta(?:s)?|ita(?:s)?)?\b/i, "colchoneta"],
  [/\bcarpa(?:s)?\b/i, "carpas"],
  [/\bsilla\s+de\s+ruedas?\b/i, "silla_ruedas"],
  [/\bmuleta(?:s)?\b/i, "muletas"],
];

/**
 * Specialty string from the parenthetical → catalog value. Lookup
 * is case-insensitive and accent-insensitive (we strip accents before
 * matching).
 */
const SPECIALTY_MAP: ReadonlyMap<string, MedicalSpecialty> = new Map([
  ["medicina general", "medicina_general"],
  ["cirugia general", "medicina_general"],
  ["curas", "medicina_general"],
  ["endocrinologia", "endocrinologia"],
  ["endocrinologia/medicina interna", "endocrinologia"],
  ["fisioterapia", "fisioterapia"],
  ["psicologia", "psicologia"],
  ["pediatria", "pediatria"],
  ["traumatologia", "traumatologia"],
  ["medicina interna", "medicina_interna"],
]);

/**
 * Regex matching a collective-delivery hint in the same line as an
 * "Entrega de suministros" entry. The dataset has at least one
 * example per pattern.
 *
 *   "Talla M y P, 2 toallas y gel, 2 protector cama. 2 niños de 4 y
 *    8 meses. 1 Sra 84 años."  → 2 + 1 = 3 collective
 *   "para una damnificada en Calle del Hambre"  → 2 (the note author
 *                                                   + the damnificada)
 */
const COLLECTIVE_HINT_RE =
  /(\d+)\s+ni[ñn]os?|\b(\d+)\s+(?:Sra?\.?|se[ñn]or(?:a|ito)?|damnificad[ao]s?|rescatistas?)\b|damnificad[ao]s?\s+en/gi;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Strip accents and lowercase for accent-insensitive matching. */
function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Find the canonical catalog item for a piece of text. */
function findItemsInText(text: string): SupplyItem[] {
  const found = new Set<SupplyItem>();
  for (const [pattern, item] of ITEM_PATTERNS) {
    if (pattern.test(text)) found.add(item);
  }
  // Sort for stable hashing & diffs.
  return Array.from(found).sort() as SupplyItem[];
}

/**
 * Extract a `Key: value` field from a pipe-delimited segment. Stops
 * at the next `|` boundary or end of string. Trims and returns
 * `null` when the key is absent.
 */
function extractField(rest: string, key: string): string | null {
  const re = new RegExp(
    `(?:^|\\|)\\s*${key}\\s*:\\s*([^|]+?)\\s*(?=\\||$|\\n)`,
    "i"
  );
  const m = rest.match(re);
  if (!m) return null;
  return m[1].trim();
}

/**
 * Try to extract a date in `DD-MM-YYYY` or `DD/MM/YYYY` from a
 * piece of text. Returns ISO `YYYY-MM-DD` or `null` when no match
 * is found. Two-digit years are treated as 20YY.
 */
function extractDateIso(text: string): string | null {
  const m = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yyyy = m[3];
  if (yyyy.length === 2) yyyy = `20${yyyy}`;
  if (yyyy.length !== 4) return null;
  // Sanity: month/day in range.
  const monthNum = Number(mm);
  const dayNum = Number(dd);
  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function extractAge(text: string): number | null {
  const m = text.match(/\bEdad\s*:\s*(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 150) return null;
  return n;
}

// ── Public parsing API ──────────────────────────────────────────────────

/**
 * Split a `notes` blob into a flat list of logical entries. Handles
 * three separator styles observed in the data:
 *
 *   - ` | ` (pipe with surrounding spaces, mostly Atención fields)
 *   - `\n` / `\r\n` (Atención lines stacked under each other)
 *   - plain `Entrega de suministros: ...` followed by another
 *     `Entrega de suministros: ...` with no separator at all —
 *     caught by re-splitting on the keyword.
 *
 * Trailing context in parens like "(Blanquita Perez)" or "(Casco
 * Central)" is preserved on the line — it does not affect parsing.
 */
export function splitNotes(entries: string): string[] {
  if (!entries) return [];

  // First, normalize newlines so the regex below is consistent.
  const normalized = entries.replace(/\r\n?/g, "\n");

  // Split on ` | ` and on `\n`. Then re-split each resulting chunk
  // on every `Entrega de suministros:` boundary so concatenated
  // entries are recovered.
  const firstPass = normalized
    .split(/\s*\|\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const out: string[] = [];
  for (const chunk of firstPass) {
    // Split further on every "Entrega de suministros:", "Medicamentos
    // entregados:", "Medicamentos y suministros:", "Acta de entrega",
    // or "Atención ...:" boundary that is NOT the start of the chunk.
    const re = /(?<=.)(?=Entrega de suministros\s*:|Medicamentos\s+(?:y\s+suministros\s+)?entregados\s*:|Acta de entrega|Atención\s+[^:]+:)/i;
    const parts = chunk.split(re);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed.length > 0) out.push(trimmed);
    }
  }
  return out;
}

/**
 * Try to parse a single line as a delivery. Returns `null` when the
 * line does not look like an "Entrega de suministros" entry or when
 * no catalog items could be recognized.
 */
export function parseDeliveryLine(line: string): ParsedDeliveryCandidate | null {
  if (!line) return null;
  // Match delivery keywords: "Entrega de suministros:", "Medicamentos
  // entregados:", "Medicamentos y suministros entregados:", or
  // "Acta de entrega".
  const re = /^(?:Entrega\s+de\s+suministros(?:\s+colectiva)?|Medicamentos\s+(?:y\s+suministros\s+)?entregados|Acta\s+de\s+entrega)\s*:\s*(.+)$/i;
  const m = line.match(re);
  if (!m) return null;

  const isMedicamentosLine = /^(?:Medicamentos\s+(?:y\s+suministros\s+)?entregados)\s*:/i.test(line);

  const body = m[1];
  const items = findItemsInText(body);

  // "Medicamentos entregados:" lines always include medicamentos item.
  if (isMedicamentosLine && !items.includes("medicamentos" as SupplyItem)) {
    items.push("medicamentos" as SupplyItem);
    items.sort();
  }

  // Bare "kit" or "kit." → assume kit_alimento (domain knowledge).
  if (items.length === 0 && /^kit\.?\s*$/i.test(body.trim())) {
    items.push("kit_alimento" as SupplyItem);
  }

  if (items.length === 0) {
    return null;
  }

  // Detect collective indicators.
  let isCollective = false;
  let beneficiaryCount = 1;
  const hintMatches = Array.from(body.matchAll(COLLECTIVE_HINT_RE));
  if (hintMatches.length > 0) {
    const nums: number[] = [];
    for (const hintMatch of hintMatches) {
      if (hintMatch[1]) nums.push(Number(hintMatch[1]));
      if (hintMatch[2]) nums.push(Number(hintMatch[2]));
    }
    if (nums.length > 0) {
      isCollective = true;
      beneficiaryCount = Math.min(nums.reduce((a, b) => a + b, 0), 1000);
    } else if (/damnificad[ao]s?\s+en/i.test(body)) {
      // "para una damnificada en Calle del Hambre" — at least 2
      // persons (the note's author + the damnificada). The note is
      // a handoff, not a delivery to the author.
      isCollective = true;
      beneficiaryCount = 2;
    }
  }

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    isCollective,
    beneficiaryCount,
    rawLine: line,
  };
}

/**
 * Try to parse a single line as a medical attention. Returns `null`
 * when the line does not match the `Atención ... : <name> (<spec>)`
 * shape.
 */
export function parseAttentionLine(
  line: string
): ParsedAttentionCandidate | null {
  if (!line) return null;
  const re = /^Atenci[oó]n\s+([^:]+?):\s*(.+)$/i;
  const m = line.match(re);
  if (!m) return null;
  const rest = m[2];

  // Pull professional + specialty from the leading "Name (Spec)".
  const profMatch = rest.match(/^\s*([^(]+?)\s*\((.+)\)/);
  let professional: string;
  let specialty: MedicalSpecialty | null;
  if (profMatch) {
    professional = profMatch[1].trim();
    specialty = mapSpecialty(profMatch[2]);
  } else if (/^Control\s+Medico\s*$/i.test(rest.trim())) {
    // "Control Medico" without doctor name → default to medicina_general
    // (Dr. Juan Andrade per domain knowledge).
    professional = "Dr. Juan Andrade";
    specialty = "medicina_general";
  } else {
    return null;
  }

  const age = extractAge(rest);
  const sexRaw = extractField(rest, "Sexo");
  const sex = sexRaw ?? null;
  const diagnosisRaw = extractField(rest, "Diagn[oó]stico");
  const diagnosis = diagnosisRaw ?? null;
  const dateRaw = extractField(rest, "Fecha");
  const date = dateRaw ? extractDateIso(dateRaw) : null;

  if (!professional) return null;

  return {
    professional,
    specialty,
    patientAge: age,
    patientSex: sex,
    diagnosis,
    date,
    rawLine: line,
  };
}

/** Lookup a specialty string against the catalog. */
export function mapSpecialty(raw: string): MedicalSpecialty | null {
  const norm = normalize(raw);
  // "Medicamentos (Diclofenaco)" and similar → medicina_general (nursing)
  if (norm.includes("medicamentos")) return "medicina_general";
  return SPECIALTY_MAP.get(norm) ?? null;
}

/**
 * Build a stable 16-char hash for idempotency checks. The shape of
 * the input must remain backwards-compatible across re-runs, so
 * callers should pass the SAME canonical form on every run. `null`
 * and `""` are normalized to the empty string so that an optional
 * field that is omitted on one run and explicitly null on the next
 * still produces the same hash.
 */
export function contentHash(parts: ReadonlyArray<string | number | null>): string {
  return createHash("sha256")
    .update(parts.map((p) => (p === null ? "" : String(p))).join("|"))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Hash for a delivery: keyed on (person_id, type, beneficiary_count,
 * items list) so two identical entregas produce the same hash.
 * Items are sorted ascending before hashing so callers do not need
 * to pre-sort.
 */
export function hashDelivery(input: {
  personId: number;
  deliveryType: "individual" | "collective";
  beneficiaryCount: number;
  items: ReadonlyArray<string>;
}): string {
  const sortedItems = input.items.slice().sort().join(",");
  return contentHash([
    input.personId,
    input.deliveryType,
    input.beneficiaryCount,
    sortedItems,
  ]);
}

/**
 * Hash for a medical attention: keyed on (person_id, date, professional,
 * specialty, diagnosis) so two identical attentions produce the same
 * hash even if re-parsed from the same notes.
 */
export function hashAttention(input: {
  personId: number;
  date: string | null;
  professional: string;
  specialty: string | null;
  diagnosis: string | null;
}): string {
  return contentHash([
    input.personId,
    input.date ?? "",
    input.professional,
    input.specialty ?? "",
    input.diagnosis ?? "",
  ]);
}

/**
 * Walk a full notes blob, returning every parseable delivery and
 * attention candidate. Parse failures (lines that match neither
 * pattern) are returned separately so the caller can log them.
 */
export interface ParseOutput {
  deliveries: ParsedDeliveryCandidate[];
  attentions: ParsedAttentionCandidate[];
  failures: Array<{ line: string; reason: string }>;
}

export function parseNotes(notes: string): ParseOutput {
  const lines = splitNotes(notes);
  const deliveries: ParsedDeliveryCandidate[] = [];
  const attentions: ParsedAttentionCandidate[] = [];
  const failures: Array<{ line: string; reason: string }> = [];

  for (const line of lines) {
    // Try delivery patterns: "Entrega de suministros:", "Medicamentos
    // entregados:", "Medicamentos y suministros:", "Acta de entrega".
    if (/^(?:Entrega\s+de\s+suministros|Medicamentos\s+(?:y\s+suministros\s+)?entregados|Acta\s+de\s+entrega)\s*:/i.test(line)) {
      const parsed = parseDeliveryLine(line);
      if (parsed) {
        deliveries.push(parsed);
      } else {
        failures.push({ line, reason: "no_catalog_items" });
      }
      continue;
    }
    if (/^Atenci[oó]n\s+/i.test(line)) {
      const parsed = parseAttentionLine(line);
      if (parsed) {
        attentions.push(parsed);
      } else {
        failures.push({ line, reason: "missing_name_or_specialty" });
      }
      continue;
    }
    // Bare medical keywords without "Atención" prefix:
    // "Fisioterapia: <diagnosis>" → Ft. Catherin Camara
    // "Psicología: <notes>" → Lic. María José
    // "Medicina General, <Doctor>" → extract doctor
    // "Pediatría, <Doctor>" → extract doctor
    const fisioMatch = line.match(/^Fisioterapia\s*:\s*(.+)$/i);
    if (fisioMatch) {
      attentions.push({
        professional: "Ft. Catherin Camara",
        specialty: "fisioterapia",
        date: null,
        patientAge: null,
        patientSex: null,
        diagnosis: fisioMatch[1].trim() || null,
        rawLine: line,
      });
      continue;
    }
    const psicoMatch = line.match(/^Psicolog[ií]a\s*:\s*(.*)$/i);
    if (psicoMatch) {
      const diagnosis = psicoMatch[1].trim() || null;
      attentions.push({
        professional: "Lic. María José",
        specialty: "psicologia",
        date: null,
        patientAge: null,
        patientSex: null,
        diagnosis: psicoMatch[1].trim() || null,
        rawLine: line,
      });
      continue;
    }
    const medGenMatch = line.match(/^Medicina\s+General\s*[,:]\s*(.+)$/i);
    if (medGenMatch) {
      attentions.push({
        professional: medGenMatch[1].trim(),
        specialty: "medicina_general",
        date: null,
        patientAge: null,
        patientSex: null,
        diagnosis: null,
        rawLine: line,
      });
      continue;
    }
    const pedMatch = line.match(/^Pediatr[ií]a\s*[,:]\s*(.+)$/i);
    if (pedMatch) {
      attentions.push({
        professional: pedMatch[1].trim(),
        specialty: "pediatria",
        date: null,
        patientAge: null,
        patientSex: null,
        diagnosis: null,
        rawLine: line,
      });
      continue;
    }
    // Fallback: lines without a known keyword may still contain
    // catalog items (e.g. "2 kits personales y una caja de agua").
    // Only try if the line looks like a supply description (contains
    // catalog keywords) and is not a phone number, address, etc.
    const fallbackItems = findItemsInText(line);
    if (fallbackItems.length > 0 && !/^Tlf[.:]|\d{11}/.test(line)) {
      deliveries.push({
        items: fallbackItems,
        isCollective: false,
        beneficiaryCount: 1,
        rawLine: `Entrega de suministros: ${line}`,
      });
      continue;
    }
    // Truly unparseable — free-text context.
  }

  return { deliveries, attentions, failures };
}
