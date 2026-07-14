import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function list() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const stmt = db.prepare("SELECT id, name, document_id, location, is_vulnerable FROM persons WHERE id >= 440 ORDER BY id ASC");
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  db.close();
  console.log(`Total rows from id 440: ${rows.length}`);
  console.log(JSON.stringify(rows, null, 2));
}

list().catch(console.error);
