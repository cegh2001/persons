/**
 * Register supply delivery lists (3 images) into Turso.
 * Handles: duplicate entries across lists, name misspellings, new sectors.
 *
 * Phase 1 (--dry-run): query matches, show plan.
 * Phase 2: execute after confirmation.
 *
 * Usage: npx tsx scripts/register-supplies.ts [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    process.env[key] = value;
  }
}
loadEnv();

const TURSO_URL = process.env.persons_TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.persons_TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) { console.error("❌ Missing Turso env vars"); process.exit(1); }

const dryRun = process.argv.includes("--dry-run");
const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── Normalize CI: strip dots, dashes, spaces ────────────────────────────
function normCI(raw: string): string {
  return raw.replace(/[.\-\s]/g, "").trim();
}

// ── All entries (raw, before dedup) ─────────────────────────────────────
interface RawEntry {
  name: string;
  ci: string | null;  // null = no CI
  supplies: string;
  sector: string;
}

const rawEntries: RawEntry[] = [
  // ── Lista 1: Control 15/07/26 ──────────────────────────
  { name: "Justina Luyano",       ci: "9.263.474",   supplies: "2 Agua",                    sector: "Bajada Pueblo" },
  { name: "Justina Luyano",       ci: "9.263.474-1", supplies: "Paquete de Pañal",           sector: "Bajada Pueblo" },
  { name: "Gustavo Quintero",     ci: "444.361",     supplies: "2 Electrolit, 1 Agua",       sector: "Bajada Pueblo" },
  { name: "Martha Pimentel",      ci: "557.323-5",   supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Luis Manrique",        ci: "4.676.308",   supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "David Castillo",       ci: "15.648.196",  supplies: "2 Electrolit",               sector: "Colinas Callejón" },
  { name: "Pastor Echezuria",     ci: "411.467",     supplies: "2 Electrolit, 1 Agua",       sector: "Caimito" },
  { name: "Maria Suárez",         ci: "6.473.359",   supplies: "3 Electrolit, 1 Agua",       sector: "Caimito" },
  { name: "Chicos Aseo",          ci: null,           supplies: "2 Agua, 3 Electrolit",       sector: "" },
  { name: "Bárbara Salazar",      ci: "19.273.369",  supplies: "2 Electrolit, 1 Agua",       sector: "Bocatarja" },
  { name: "María Artiles",        ci: "6.800.097",   supplies: "2 Electrolit, 1 Agua",       sector: "Bocatarja" },
  { name: "Robinson Rodríguez",   ci: "6.472.036",   supplies: "2 Electrolit, 1 Agua",       sector: "Bocatarja" },
  { name: "Yosmairy Liyano",      ci: "28.404.947",  supplies: "2 Electrolit",               sector: "Tonizera" },
  { name: "Jhon Suárez",          ci: "21.193.027",  supplies: "2 Electrolit, 1 Agua",       sector: "Bocatarja" },
  { name: "Jorge Luis Castillo",  ci: "6.889.656",   supplies: "2 Electrolit, 1 Agua",       sector: "Bocatarja" },
  { name: "Rosa Colmenares",      ci: "6.488.324",   supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Luis Ramos",           ci: "10.580.468",  supplies: "2 Electrolit, 1 Agua",       sector: "Caimito" },
  { name: "Jesús Anzoátegui",     ci: "10.584.647",  supplies: "2 Electrolit, 1 Agua",       sector: "Caimito" },
  { name: "Jesús Aponte",         ci: "1.456.706",   supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Yesica Requena",       ci: "18.755.244",  supplies: "2 Electrolit, 1 Agua",       sector: "Tonizera" },
  { name: "Luis León",            ci: "6480026",     supplies: "2 Electrolit, 1 Agua",       sector: "Punto Fijo" },
  { name: "Abraham Urbina",       ci: "34.054.750",  supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Victoria Yánez",       ci: null,           supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Yesica Hernández",     ci: "16.724.922",  supplies: "2 Electrolit, 1 Agua",       sector: "La Tomita" },
  { name: "Alexis Avilán",        ci: "411.466-8",   supplies: "2 Electrolit, 1 Agua",       sector: "Calle Real" },
  { name: "Merlin Corro",         ci: "6.469.178",   supplies: "2 Electrolit, 1 Agua",       sector: "San Julián" },
  { name: "Francisco Suárez",     ci: "29.018.110",  supplies: "2 Electrolit, 1 Agua",       sector: "Tomita" },
  { name: "Esmeira Fernández",    ci: null,           supplies: "2 Bolsa Comida, 2 Electrolit", sector: "San Julián" },
  { name: "Luis Correa",          ci: "6.468.463",   supplies: "1 Agua (2 litros)",          sector: "27 Julio" },
  { name: "Ricardo Guedez",       ci: "11.070.393",  supplies: "2 Electrolit, 1 Agua",       sector: "Blanquita de Pérez" },
  { name: "Marialy Rosario",      ci: "19.628.303",  supplies: "2 Electrolit, 1 Agua",       sector: "Blanquita de Pérez" },
  { name: "Gabriela Solis",       ci: "18.325.162",  supplies: "2 Electrolit, 1 Agua",       sector: "Blanquita de Pérez" },
  { name: "Roxana López",         ci: "13.827.495",  supplies: "2 Electrolit, 1 Agua",       sector: "Canal Caimito" },
  { name: "Oralia Reina",         ci: "12.866.978",  supplies: "2 Electrolit, 1 Agua",       sector: "Maiquetía" },
  // ── Lista 2 ──────────────────────────────────────────
  { name: "Neimar Nieto",         ci: "31.429.075",  supplies: "2 Electrolit, 1 Agua",       sector: "Maiquetía" },
  { name: "Ángel Celis",          ci: "30.633.161",  supplies: "2 Electrolit, 1 Agua",       sector: "Las Quince" },
  { name: "Valentina Bosques",    ci: "33.765.190",  supplies: "2 Electrolit, 1 Agua",       sector: "Callao" },
  { name: "Neimar Nieto",         ci: "31.429.075",  supplies: "Bolsa de comida, Leche, Pañales", sector: "Loreto" },
  { name: "Yolanda González",     ci: "7.991.639",   supplies: "2 Electrolit",               sector: "" },
  { name: "Ingrid Doila",         ci: "6.499.018",   supplies: "2 Electrolit, 1 Agua",       sector: "27 de Julio" },
  // ── Lista 3: Entregas Varias ─────────────────────────
  { name: "Neymar Nieto",         ci: "31.429.075",  supplies: "Bolsa de comida, Kit personal, Pañales niño y toddler, Leche formulada", sector: "Maiquetía" },
  { name: "Oralia Reina",         ci: "12.866.978",  supplies: "Bolsa de comida, Kit personal, Pañales adulto", sector: "Maiquetía" },
  { name: "Andreina Bosquete",    ci: null,           supplies: "Kit personal, Agua, Electrolit, Comida", sector: "Caraballeda" },
  { name: "Ana Lara",             ci: "10.125.777",  supplies: "(Firma registrada)",          sector: "Valle Pino" },
  { name: "Alex Sandoval",        ci: "17.154.116",  supplies: "Colchoneta (Firma registrada)", sector: "Pariata" },
];

// ── Deduplicate by normalized CI ────────────────────────────────────────
interface MergedPerson {
  name: string;           // canonical name (first occurrence)
  ci: string | null;
  supplies: string[];     // each entry's supply description
  sectors: string[];      // each entry's sector
  altNames: string[];     // alternative name spellings
}

function dedup(): MergedPerson[] {
  // Dedup by normalized CI. For "9.263.474-1" (family member suffix),
  // we treat base CI "9263474" and "-1" variant as same person.
  const byCI = new Map<string, MergedPerson>();
  const noCI: MergedPerson[] = [];

  function extractBaseCI(raw: string): string {
    // Only strip multi-character dash suffixes that look like family indicators
    // (e.g., "12.345.678-1" where -1 means a family member).
    // Single digits after a dash in a long CI are check digits, keep them.
    const normalized = normCI(raw);
    // If the original had "-1" or "-2" appended to a full-length CI (7-8 digits),
    // treat as family suffix. Otherwise keep full CI.
    const dashSuffixMatch = raw.match(/\-([1-9])$/);
    if (dashSuffixMatch && normalized.length >= 8) {
      // This looks like "12.345.678-1" → base CI is "12345678"
      return normalized.slice(0, -1); // drop the last digit (the suffix)
    }
    return normalized;
  }

  for (const e of rawEntries) {
    if (!e.ci) {
      noCI.push({
        name: e.name, ci: null,
        supplies: [e.supplies], sectors: [e.sector],
        altNames: [],
      });
      continue;
    }

    const baseCI = extractBaseCI(e.ci);
    const existing = byCI.get(baseCI);

    if (existing) {
      existing.supplies.push(e.supplies);
      if (e.sector) existing.sectors.push(e.sector);
      if (e.name !== existing.name && !existing.altNames.includes(e.name)) {
        existing.altNames.push(e.name);
      }
    } else {
      byCI.set(baseCI, {
        name: e.name,
        ci: baseCI,
        supplies: [e.supplies],
        sectors: [e.sector],
        altNames: [],
      });
    }
  }

  return [...byCI.values(), ...noCI];
}

// ── Normalize sector names (map known variants to canonical DB names) ──
// These are the ACTUAL sector names in the Turso DB.
const SECTOR_ALIASES: Record<string, string> = {
  // Exact matches (keep as-is, accents normalized)
  "calle real": "Calle Real",
  "punto fijo": "Punto Fijo",
  "la tomita": "La Tomita",
  "tomita": "La Tomita",
  "27 julio": "27 de Julio",
  "27 de julio": "27 de Julio",
  "caraballeda": "Caraballeda",
  "desconocido": "Desconocido",
  // Map to DB canonical names
  "caimito": "El Caimito",
  "canal caimito": "El Caimito",
  "san julián": "San Julian",
  "san julian": "San Julian",
  "blanquita de pérez": "Blanquita Perez",
  "blanquita de perez": "Blanquita Perez",
  "maiquetía": "Maiquetia",
  "maiquetia": "Maiquetia",
  "callao": "El Collao",
  "el callao": "El Collao",
  // TRULY NEW — will be flagged for manual review
  // "bajada pueblo", "colinas callejón", "bocatarja", "tonizera",
  // "canal caimito", "loreto", "las quince", "valle pino", "pariata"
};

// Sectors that don't exist in DB and need manual review
const NEW_SECTORS = new Set([
  "bajada pueblo", "colinas callejon", "bocatarja", "tonizera",
  "loreto", "las quince", "valle pino", "pariata",
]);

function isNewSector(raw: string): boolean {
  const key = raw.toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n");
  return NEW_SECTORS.has(key);
}

function normalizeSector(raw: string): { sector: string; isNew: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { sector: "Desconocido", isNew: false };
  const key = trimmed.toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n");
  if (NEW_SECTORS.has(key)) {
    return { sector: trimmed, isNew: true }; // keep original, flag as new
  }
  return { sector: SECTOR_ALIASES[key] || trimmed, isNew: false };
}

// ── Build delivery note ─────────────────────────────────────────────────
function buildNotes(person: MergedPerson): string {
  const deliveries = person.supplies
    .filter((s) => s.trim() && !s.startsWith("(Firma"))
    .map((s) => `Entrega de suministros: ${s.trim()}`);
  return deliveries.join(" | ") || "Entrega de suministros";
}

// ── Query Turso ─────────────────────────────────────────────────────────
interface ExistingPerson {
  id: number; name: string; document_id: string | null;
  location: string; notes: string;
  received_supplies: number; received_medical: number;
}

async function findExisting(name: string, ci: string | null): Promise<ExistingPerson[]> {
  if (ci) {
    const res = await client.execute({
      sql: `SELECT id, name, document_id, location, notes, received_supplies, received_medical
            FROM persons WHERE document_id = ? OR name LIKE '%' || ? || '%' LIMIT 5`,
      args: [ci, name.trim()],
    });
    return res.rows as unknown as ExistingPerson[];
  } else {
    const res = await client.execute({
      sql: `SELECT id, name, document_id, location, notes, received_supplies, received_medical
            FROM persons WHERE name LIKE '%' || ? || '%' LIMIT 5`,
      args: [name.trim()],
    });
    return res.rows as unknown as ExistingPerson[];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const merged = dedup();
  console.log(`🔍 ${rawEntries.length} entradas → ${merged.length} personas únicas\n`);
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Now match each person
interface PlanItem {
  person: MergedPerson;
  action: "create" | "update" | "pending_sector";
  existingId?: number;
  existingName?: string;
  existingNotes?: string;
  existingSupplies?: number;
  existingMedical?: number;
  existingLocation?: string;
  correctName?: boolean;
  matchType: string;
  notes: string;
  finalSector: string;
  sectorIsNew: boolean;
}

  const plan: PlanItem[] = [];

  for (const p of merged) {
    const existing = await findExisting(p.name, p.ci);
    const notes = buildNotes(p);
    const { sector: normalizedSector, isNew: sectorIsNew } = normalizeSector(
      p.sectors.filter(Boolean)[0] || "Desconocido"
    );

    if (existing.length === 0) {
      // New person. If sector is truly new, flag for manual review.
      if (sectorIsNew) {
        plan.push({
          person: p, action: "pending_sector", matchType: "none",
          notes, finalSector: normalizedSector, sectorIsNew: true,
        });
        continue;
      }
      plan.push({
        person: p, action: "create", matchType: "none",
        notes, finalSector: normalizedSector, sectorIsNew: false,
      });
      continue;
    }

    // Exact CI match
    if (p.ci) {
      const ciMatch = existing.find((e) => e.document_id === p.ci);
      if (ciMatch) {
        const nameDiff = ciMatch.name.toLowerCase() !== p.name.toLowerCase();
        // For updates, DON'T change the sector — add list sector to notes instead.
        const sectorNote = normalizedSector !== "Desconocido" && normalizedSector !== ciMatch.location
          ? ` | Sector en lista: ${normalizedSector}`
          : "";
        const mergedNotes = notes + sectorNote;

        plan.push({
          person: p, action: "update", matchType: nameDiff ? "ci-diff-name" : "exact-ci",
          existingId: ciMatch.id, existingName: ciMatch.name,
          existingNotes: ciMatch.notes, existingSupplies: ciMatch.received_supplies,
          existingMedical: ciMatch.received_medical, existingLocation: ciMatch.location,
          correctName: nameDiff,
          notes: mergedNotes, finalSector: ciMatch.location, // KEEP original sector
          sectorIsNew: false,
        });
        continue;
      }
    }

    // Name match only (no CI or CI doesn't match)
    const nameMatch = existing[0];
    const sameName = nameMatch.name.toLowerCase() === p.name.toLowerCase();

    if (sameName && p.ci) {
      // Same name, different CI → different person. Create if sector is known.
      if (sectorIsNew) {
        plan.push({
          person: p, action: "pending_sector", matchType: "name-only",
          notes, finalSector: normalizedSector, sectorIsNew: true,
        });
        continue;
      }
      plan.push({
        person: p, action: "create", matchType: "name-only",
        notes, finalSector: normalizedSector, sectorIsNew: false,
      });
    } else if (!p.ci) {
      // No CI, close name match → likely same person. Update.
      const sectorNote = normalizedSector !== "Desconocido" && normalizedSector !== nameMatch.location
        ? ` | Sector en lista: ${normalizedSector}`
        : "";
      plan.push({
        person: p, action: "update", matchType: "name-only",
        existingId: nameMatch.id, existingName: nameMatch.name,
        existingNotes: nameMatch.notes, existingSupplies: nameMatch.received_supplies,
        existingMedical: nameMatch.received_medical, existingLocation: nameMatch.location,
        correctName: !sameName,
        notes: notes + sectorNote, finalSector: nameMatch.location, // KEEP original
        sectorIsNew: false,
      });
    } else {
      if (sectorIsNew) {
        plan.push({
          person: p, action: "pending_sector", matchType: "none",
          notes, finalSector: normalizedSector, sectorIsNew: true,
        });
        continue;
      }
      plan.push({
        person: p, action: "create", matchType: "none",
        notes, finalSector: normalizedSector, sectorIsNew: false,
      });
    }
  }

  // ── Display ──────────────────────────────────────────────────────────
  const creates = plan.filter((x) => x.action === "create");
  const updates = plan.filter((x) => x.action === "update");
  const pending = plan.filter((x) => x.action === "pending_sector");

  console.log(`📋 Plan: ${creates.length} crear, ${updates.length} actualizar, ${pending.length} pendientes (sector nuevo), ${plan.length} total\n`);

  if (updates.length > 0) {
    console.log("── 🔄 Actualizaciones ─────────────────────────────────\n");
    for (const u of updates) {
      const nameInfo = u.correctName ? ` (corrige: "${u.existingName}" → "${u.person.name}")` : "";
      const ciStr = u.person.ci ? `CI: ${u.person.ci}` : "sin CI";
      console.log(`   ${u.person.name} (${ciStr}) [ID ${u.existingId}]${nameInfo}`);
      console.log(`      Match: ${u.matchType}`);
      console.log(`      Sector DB: "${u.existingLocation}" (se preserva)`);
      console.log(`      Notas DB: ${(u.existingNotes || "(vacío)").slice(0, 80)}`);
      console.log(`      Agrega: "${u.notes.slice(0, 80)}${u.notes.length > 80 ? "..." : ""}"`);
      console.log(`      Flags: supplies=${u.existingSupplies}→1, medical=${u.existingMedical} (preservado)\n`);
    }
  }

  if (creates.length > 0) {
    console.log(`── ✅ Creaciones (${creates.length}) ────────────────────────────\n`);
    for (const c of creates) {
      const ciStr = c.person.ci ? `CI: ${c.person.ci}` : "sin CI";
      console.log(`   ${c.person.name} (${ciStr}) — ${c.finalSector}`);
      console.log(`      ${c.notes.slice(0, 100)}${c.notes.length > 100 ? "..." : ""}\n`);
    }
  }

  if (pending.length > 0) {
    console.log(`── ⚠ Pendientes — Sector NUEVO (${pending.length}) ──────────────────\n`);
    console.log("   Estos tienen sectores que NO existen en la DB. Revisar manualmente:\n");
    for (const p of pending) {
      const ciStr = p.person.ci ? `CI: ${p.person.ci}` : "sin CI";
      console.log(`   ${p.person.name} (${ciStr}) — 🆕 ${p.finalSector}`);
      console.log(`      ${p.notes.slice(0, 100)}${p.notes.length > 100 ? "..." : ""}\n`);
    }
  }

  if (dryRun) {
    console.log("🏁 Dry run. Revisá el plan y ejecutá sin --dry-run.\n");
    return;
  }

  // ── Execute ──────────────────────────────────────────────────────────
  console.log("🚀 Ejecutando...\n");
  let created = 0, updated = 0, failed = 0, skipped = 0;

  for (const item of plan) {
    if (item.action === "pending_sector") {
      skipped++;
      continue; // Skip — user will review manually
    }

    const p = item.person;
    const rawName = p.ci ? `${p.name} ${p.ci}` : p.name;
    try {
      if (item.action === "create") {
        await client.execute({
          sql: `INSERT INTO persons (raw_name, name, document_id, location, notes, received_supplies, received_medical)
                VALUES (?, ?, ?, ?, ?, 1, 0)`,
          args: [rawName, p.name, p.ci, item.finalSector, item.notes],
        });
        created++;
        if (created <= 5 || created % 10 === 0) console.log(`   ✅ Creado: ${p.name}`);
      } else {
        const existingNotes = item.existingNotes || "";
        const finalNotes = existingNotes
          ? `${existingNotes} | ${item.notes}`
          : item.notes;
        const medical = item.existingMedical || 0;

        if (item.correctName) {
          const newRawName = p.ci ? `${p.name} ${p.ci}` : p.name;
          await client.execute({
            sql: `UPDATE persons SET name=?, raw_name=?, notes=?, received_supplies=1, received_medical=? WHERE id=?`,
            args: [p.name, newRawName, finalNotes, medical, item.existingId],
          });
          console.log(`   🔄 Actualizado + nombre: "${item.existingName}" → "${p.name}" (ID ${item.existingId})`);
        } else {
          await client.execute({
            sql: `UPDATE persons SET notes=?, received_supplies=1, received_medical=? WHERE id=?`,
            args: [finalNotes, medical, item.existingId],
          });
          console.log(`   🔄 Actualizado: ${p.name} (ID ${item.existingId})`);
        }
        updated++;
      }
    } catch (err) {
      failed++;
      console.error(`   ❌ ${p.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n🏁 Creados: ${created} | Actualizados: ${updated} | Pendientes (sector nuevo): ${skipped} | Fallos: ${failed}\n`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
