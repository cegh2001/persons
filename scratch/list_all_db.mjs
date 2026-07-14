import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function list() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const stmt = db.prepare("SELECT * FROM persons ORDER BY id ASC");
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  db.close();
  console.log(`Total rows in DB: ${rows.length}`);
  // print the last 100 rows
  console.log(JSON.stringify(rows.slice(-100), null, 2));
}

list().catch(console.error);
