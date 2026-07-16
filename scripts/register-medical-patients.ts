/**
 * Register Anderson Galindo and Dra. Yoselyn patient lists into Turso.
 * 
 * Phase 1 (--dry-run): query existing matches, show plan.
 * Phase 2 (no flag): execute inserts/updates.
 *
 * Usage: npx tsx scripts/register-medical-patients.ts [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";

// ── Env loader ──────────────────────────────────────────────────────────
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnv();

const TURSO_URL = process.env.persons_TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.persons_TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("❌ Missing Turso env vars in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── Patient records ─────────────────────────────────────────────────────

interface Patient {
  name: string;
  document_id: string | null;
  location: string;
  doctor: string;
  notes: string;
  age?: string;
}

const patients: Patient[] = [
  // ── Dra. Yoselyn — Pediatría ─────────────────────────
  { name: "Valentina Gil",        document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "1 año" },
  { name: "Mayerson Anzola",      document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "1 año" },
  { name: "Erick Guerra",         document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "4 años" },
  { name: "Celine Olivieri",      document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "5 meses" },
  { name: "Noah Romero",          document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "4 meses" },
  { name: "Luciana Luis",         document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "6 años" },
  { name: "Gia Luis",             document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "6 años" },
  { name: "Gael Rada",            document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "6 años" },
  { name: "Noah Monasterio",      document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "3 meses" },
  { name: "Lucas Perez",          document_id: null, location: "Desconocido", doctor: "Dra. Yoselyn", notes: "Pediatría, Dra. Yoselyn", age: "9 años" },
  // ── Anderson Galindo — 15-07-26 ──────────────────────
  { name: "Victor Delgado",       document_id: "2901913",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "81 años" },
  { name: "Marta Pimentel",       document_id: "5573235",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "68 años" },
  { name: "Juan Gonzalez",        document_id: "6472583",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "65 años" },
  { name: "Yoleisy Bastardo",     document_id: "8177648",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "63 años" },
  { name: "Mariela Mosquera",     document_id: "11689000", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "53 años" },
  { name: "Edelvis Quinta",       document_id: "11640839", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "56 años" },
  { name: "Carmen Gonzalez",      document_id: "11635464", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "53 años" },
  { name: "Nelia Gomes",          document_id: "7992159",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "58 años" },
  { name: "Juan Guevara",         document_id: null,       location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo (Pediatría)", age: "5 años" },
  { name: "Sergio Cesin",         document_id: "649323",   location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "61 años" },
  { name: "Yensi Alvarez",        document_id: "12715023", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "51 años" },
  { name: "Lucrecia Gonzalez",    document_id: "6490639",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "62 años" },
  { name: "Luis Correa",          document_id: "6468463",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "66 años" },
  { name: "Zenaida Avila",        document_id: "4565632",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "68 años" },
  { name: "Carlos Ferreira",      document_id: "10581637", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "54 años" },
  { name: "Liam Perozo",          document_id: null,       location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo (Pediatría)", age: "5 años" },
  // ── Anderson Galindo — MEDGENER ──────────────────────
  { name: "Ana Moron",            document_id: "16676530", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "43 años" },
  { name: "Ybranesca Monasterio", document_id: "32169984", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "19 años" },
  { name: "Maria Zabaneta",       document_id: "25108892", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "78 años" },
  // Lucrecia Gonzalez ya está arriba (misma CI 6490639) — no duplicar
  { name: "Eliana García",        document_id: "15831696", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "45 años" },
  { name: "Carmen Pasos",         document_id: "6487033",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "73 años" },
  { name: "Elia Perez",           document_id: "4065188",  location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "75 años" },
  { name: "Ariadna Davila",       document_id: "16284234", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "43 años" },
  { name: "Samir Echavarria",     document_id: "24180869", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "31 años" },
  { name: "Carolina Alvarez",     document_id: "12163833", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "51 años" },
  { name: "Juan Gonzalez",        document_id: "20783354", location: "Desconocido", doctor: "Anderson Galindo", notes: "Medicina General, Anderson Galindo", age: "32 años" }, // DIFERENTE persona del Juan Gonzalez 65a
];

// ── Duplicate check within list ──────────────────────────────────────────
function checkInternalDupes() {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  patients.forEach((p, i) => {
    const key = `${p.name}|${p.document_id}`;
    if (seen.has(key)) {
      dupes.push(`  ⚠ "${p.name}" (CI: ${p.document_id}) aparece en posición ${seen.get(key)! + 1} y ${i + 1}`);
    } else {
      seen.set(key, i);
    }
  });
  if (dupes.length > 0) {
    console.log("⚠ Duplicados internos detectados:\n" + dupes.join("\n") + "\n");
  }
}

// ── Match against Turso ──────────────────────────────────────────────────
interface ExistingPerson {
  id: number;
  name: string;
  document_id: string | null;
  location: string;
  notes: string;
  received_supplies: number;
  received_medical: number;
}

async function findExisting(patient: Patient): Promise<ExistingPerson[]> {
  const trimmedName = patient.name.trim();
  // Query by name similarity AND exact document_id if available
  if (patient.document_id) {
    const res = await client.execute({
      sql: `SELECT id, name, document_id, location, notes, received_supplies, received_medical
            FROM persons
            WHERE document_id = ? OR name LIKE '%' || ? || '%'
            LIMIT 3`,
      args: [patient.document_id, trimmedName],
    });
    return res.rows as unknown as ExistingPerson[];
  } else {
    // No CI — only match by name (pediatric patients)
    const res = await client.execute({
      sql: `SELECT id, name, document_id, location, notes, received_supplies, received_medical
            FROM persons
            WHERE name LIKE '%' || ? || '%'
            LIMIT 3`,
      args: [trimmedName],
    });
    return res.rows as unknown as ExistingPerson[];
  }
}

type Action = "create" | "update" | "skip_duplicate";
interface Plan {
  patient: Patient;
  action: Action;
  existingId?: number;
  existingName?: string;
  existingNotes?: string;
  existingSupplies?: number;
  existingMedical?: number;
  correctName?: boolean;
  reason: string;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔍 Phase 1: Analyzing ${patients.length} patients against Turso...\n`);
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will modify DB)"}\n`);

  checkInternalDupes();

  const plan: Plan[] = [];

  for (const p of patients) {
    const existing = await findExisting(p);

    if (existing.length === 0) {
      plan.push({
        patient: p,
        action: "create",
        reason: `Nuevo — sin coincidencias en DB`,
      });
      continue;
    }

    // Check for exact match: same name (case-insensitive) AND same doc_id
    const exact = existing.find(
      (e) =>
        e.name.toLowerCase() === p.name.toLowerCase() &&
        (p.document_id === null || e.document_id === p.document_id)
    );

    if (exact) {
      // Already exists — update notes (append), ensure medical flag
      plan.push({
        patient: p,
        action: "update",
        existingId: exact.id,
        existingName: exact.name,
        existingNotes: exact.notes,
        existingSupplies: exact.received_supplies,
        existingMedical: exact.received_medical,
        correctName: false,
        reason: `Existe (ID ${exact.id}) — se actualizará notas y flags`,
      });
      continue;
    }

    // Partial match: same CI but different name, or same name but different CI
    const sameDoc = existing.find((e) => p.document_id && e.document_id === p.document_id);
    if (sameDoc) {
      plan.push({
        patient: p,
        action: "update",
        existingId: sameDoc.id,
        existingName: sameDoc.name,
        existingNotes: sameDoc.notes,
        existingSupplies: sameDoc.received_supplies,
        existingMedical: sameDoc.received_medical,
        correctName: sameDoc.name.toLowerCase() !== p.name.toLowerCase(),
        reason: `Misma CI, nombre difiere: DB="${sameDoc.name}" → scan="${p.name}" (ID ${sameDoc.id})`,
      });
      continue;
    }

    // Name match but no CI match (or no CI in either)
    const nameMatch = existing[0];
    plan.push({
      patient: p,
      action: "create",
      reason: `Nombre similar a "${nameMatch.name}" (ID ${nameMatch.id}) pero CI no coincide → se crea nuevo`,
    });
  }

  // ── Display plan ──────────────────────────────────────────────────────
  const creates = plan.filter((x) => x.action === "create");
  const updates = plan.filter((x) => x.action === "update");

  console.log(`📋 Plan:\n`);
  console.log(`   ✅ CREAR (nuevos):    ${creates.length}`);
  console.log(`   🔄 ACTUALIZAR:        ${updates.length}`);
  console.log(`   📝 TOTAL:             ${plan.length}\n`);

  if (updates.length > 0) {
    console.log("── 🔄 Updates ──────────────────────────────────────────\n");
    for (const u of updates) {
      const nameInfo = u.correctName
        ? ` (corrige nombre: "${u.existingName}" → "${u.patient.name}")`
        : "";
      console.log(`   ${u.patient.name} (CI: ${u.patient.document_id ?? "—"}) [ID ${u.existingId}]${nameInfo}`);
      console.log(`      ${u.reason}`);
      console.log(`      Notas actuales: ${(u.existingNotes || "(vacío)").slice(0, 80)}`);
      console.log(`      Flags actuales: supplies=${u.existingSupplies} medical=${u.existingMedical}`);
      console.log(`      → Agregará notas: "${u.patient.notes}"`);
      const flagChanges: string[] = [];
      if (!u.existingMedical) flagChanges.push("medical se activará 🔧");
      if (u.existingMedical) flagChanges.push("medical ya tiene ✓");
      if (u.existingSupplies) flagChanges.push("supplies se preserva ✓");
      console.log(`      → Flags: ${flagChanges.join(" | ")}\n`);
    }
  }

  if (creates.length > 0) {
    console.log("── ✅ Creates ──────────────────────────────────────────\n");
    for (const c of creates) {
      console.log(`   ${c.patient.name} (CI: ${c.patient.document_id ?? "—"}) — ${c.patient.age || ""}`);
      console.log(`      ${c.reason}\n`);
    }
  }

  if (dryRun) {
    console.log("🏁 Dry run complete. Run without --dry-run to execute.\n");
    return;
  }

  // ── Phase 2: Execute ─────────────────────────────────────────────────
  console.log("🚀 Executing...\n");

  let created = 0, updated = 0, failed = 0;

  for (const item of plan) {
    const p = item.patient;
    const rawName = p.document_id ? `${p.name} ${p.document_id}` : p.name;

    try {
      if (item.action === "create") {
        await client.execute({
          sql: `INSERT INTO persons (raw_name, name, document_id, location, notes, received_supplies, received_medical)
                VALUES (?, ?, ?, ?, ?, 0, 1)`,
          args: [rawName, p.name, p.document_id, p.location, p.notes],
        });
        created++;
        if (created <= 5 || created % 10 === 0) console.log(`   ✅ Creado: ${p.name}`);
      } else {
        // Update: append notes, OR-merge flags, correct name if needed
        const existingNotes = item.existingNotes || "";
        const finalNotes = existingNotes
          ? `${existingNotes} | ${p.notes}`
          : p.notes;
        const supplies = item.existingSupplies || 0; // preserve (OR-merge)
        const medical = (item.existingMedical || 0) || 1; // ensure medical=1

        if (item.correctName) {
          const newRawName = p.document_id ? `${p.name} ${p.document_id}` : p.name;
          await client.execute({
            sql: `UPDATE persons SET name = ?, raw_name = ?, notes = ?, received_medical = ?, received_supplies = ? WHERE id = ?`,
            args: [p.name, newRawName, finalNotes, medical, supplies, item.existingId],
          });
          console.log(`   🔄 Actualizado + nombre corregido: "${item.existingName}" → "${p.name}" (ID ${item.existingId})`);
        } else {
          await client.execute({
            sql: `UPDATE persons SET notes = ?, received_medical = ?, received_supplies = ? WHERE id = ?`,
            args: [finalNotes, medical, supplies, item.existingId],
          });
          console.log(`   🔄 Actualizado: ${p.name} (ID ${item.existingId})`);
        }
        updated++;
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Falló: ${p.name} — ${msg}`);
    }
  }

  console.log(`\n🏁 Done. Creados: ${created} | Actualizados: ${updated} | Fallos: ${failed}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
