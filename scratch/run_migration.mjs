import { migrateDb } from "../src/lib/db.ts";

async function main() {
  console.log("Running DB migrations...");
  await migrateDb();
  console.log("Migration complete!");
}

main().catch(console.error);
