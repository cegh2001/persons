/**
 * Create the 9 previously-pending users with corrected sector mappings.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv();

const client = createClient({
  url: process.env.persons_TURSO_DATABASE_URL!,
  authToken: process.env.persons_TURSO_AUTH_TOKEN!,
});

const users: { name: string; ci: string; sector: string; notes: string }[] = [
  { name: "Gustavo Quintero",    ci: "444361",    sector: "Bajada Los Indios", notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Bárbara Salazar",     ci: "19273369",  sector: "Boca Tanque",       notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "María Artiles",       ci: "6800097",   sector: "Boca Tanque",       notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Robinson Rodríguez",  ci: "6472036",   sector: "Boca Tanque",       notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Yosmairy Liyano",     ci: "28404947",  sector: "La Tomita",         notes: "Entrega de suministros: 2 Electrolit" },
  { name: "Jhon Suárez",         ci: "21193027",  sector: "Boca Tanque",       notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Jorge Luis Castillo", ci: "6889656",   sector: "Boca Tanque",       notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Yesica Requena",      ci: "18755244",  sector: "La Tomita",         notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
  { name: "Ángel Celis",         ci: "30633161",  sector: "Tarigua",           notes: "Entrega de suministros: 2 Electrolit, 1 Agua" },
];

async function main() {
  console.log(`🔧 Creando ${users.length} usuarios con sectores corregidos...\n`);
  let ok = 0, fail = 0;
  for (const u of users) {
    try {
      await client.execute({
        sql: `INSERT INTO persons (raw_name, name, document_id, location, notes, received_supplies, received_medical)
              VALUES (?, ?, ?, ?, ?, 1, 0)`,
        args: [`${u.name} ${u.ci}`, u.name, u.ci, u.sector, u.notes],
      });
      console.log(`   ✅ ${u.name} → ${u.sector}`);
      ok++;
    } catch (err) {
      fail++;
      console.error(`   ❌ ${u.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n🏁 ${ok} creados, ${fail} fallos`);
}
main();
