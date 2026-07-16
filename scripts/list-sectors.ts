/**
 * Quick script: list all distinct sectors in Turso DB.
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

const client = createClient({
  url: process.env.persons_TURSO_DATABASE_URL!,
  authToken: process.env.persons_TURSO_AUTH_TOKEN!,
});

async function main() {
  const res = await client.execute(
    "SELECT DISTINCT location, COUNT(*) as c FROM persons GROUP BY location ORDER BY location"
  );
  const rows = res.rows as unknown as { location: string; c: number }[];
  console.log(`📍 ${rows.length} sectores existentes en DB:\n`);
  for (const r of rows) {
    console.log(`   ${r.location.padEnd(30)} (${r.c} personas)`);
  }
}
main();
