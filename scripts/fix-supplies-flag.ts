/**
 * Find and fix users in Turso whose received_supplies flag was incorrectly
 * cleared by the overwrite bug in scan commit.
 *
 * Usage: npx tsx scripts/fix-supplies-flag.ts [--dry-run]
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {}
}

loadEnv();

const TURSO_URL = process.env.persons_TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.persons_TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("❌ Missing Turso env vars");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Terms that clearly indicate a supply delivery (not medical attention).
const SUPPLY_TERMS = [
  "suministro", "kit de", " bolsa ", "dotación",
  "víveres", "viveres", "despensa", "colchoneta", "colchón",
  "colchon", "sábana", "sabana", "cobija", "frazada",
];

async function main() {
  console.log(`🔍 Fetching persons with received_supplies=0 from Turso...\n`);

  // Fetch all persons with supplies flag off, filter client-side.
  // Turso HTTP struggles with many LIKE OR clauses, so we keep it simple.
  const res = await client.execute(
    "SELECT id, name, document_id, location, notes, received_supplies, received_medical FROM persons WHERE received_supplies = 0 ORDER BY name"
  );

  const rows = res.rows as unknown as {
    id: number; name: string; document_id: string | null;
    location: string; notes: string;
    received_supplies: number; received_medical: number;
  }[];

  console.log(`   Fetched ${rows.length} rows. Filtering client-side...\n`);

  // Client-side filter: notes contain supply delivery terms
  const affected = rows.filter((p) => {
    const n = (p.notes || "").toLowerCase();
    return SUPPLY_TERMS.some((t) => n.includes(t));
  });

  console.log(`📋 Found ${affected.length} affected user(s):\n`);

  if (affected.length === 0) {
    console.log("✅ No affected users found.");
    return;
  }

  for (const p of affected) {
    const docStr = p.document_id ? ` (CI: ${p.document_id})` : "";
    console.log(`  ID ${p.id}: ${p.name}${docStr} — ${p.location}`);
    console.log(`     Notes: ${p.notes.slice(0, 150)}${p.notes.length > 150 ? "..." : ""}`);
    console.log(`     Flags: supplies=${p.received_supplies} medical=${p.received_medical}`);
    console.log();
  }

  if (dryRun) {
    console.log("🏁 Dry run complete. Run without --dry-run to fix.\n");
    return;
  }

  console.log(`🔧 Fixing ${affected.length} user(s)...\n`);
  let fixed = 0;
  for (const p of affected) {
    try {
      await client.execute({
        sql: "UPDATE persons SET received_supplies = 1 WHERE id = ?",
        args: [p.id],
      });
      console.log(`  ✅ Fixed: ${p.name} (ID ${p.id})`);
      fixed++;
    } catch (err) {
      console.error(`  ❌ Failed: ${p.name} (ID ${p.id}):`, err);
    }
  }
  console.log(`\n🏁 Done. Fixed ${fixed}/${affected.length}.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
