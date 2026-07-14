import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const stmt = db.prepare("SELECT id, name, document_id, location, is_vulnerable FROM persons WHERE id >= 570 AND id <= 650 ORDER BY id ASC");
  while (stmt.step()) {
    console.log(JSON.stringify(stmt.getAsObject()));
  }
  stmt.free();
  db.close();
}

check().catch(console.error);
