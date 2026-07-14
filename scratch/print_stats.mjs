import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const stmt = db.prepare("SELECT location, COUNT(*) as count FROM persons GROUP BY location ORDER BY count DESC");
  while (stmt.step()) {
    console.log(JSON.stringify(stmt.getAsObject()));
  }
  stmt.free();
  db.close();
}

run().catch(console.error);
