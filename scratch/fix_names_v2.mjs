import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function fixNames() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Rename Frente Marcal -> Frente Mercal
  db.run("UPDATE persons SET location = 'Frente Mercal' WHERE location = 'Frente Marcal'");

  // Rename Coropal -> Corapal
  db.run("UPDATE persons SET location = 'Corapal' WHERE location = 'Coropal'");

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log("✅ Fixed spelling in DB: Frente Mercal and Corapal!");
}

fixNames().catch(console.error);
