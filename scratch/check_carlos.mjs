import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE '%Carlos Torres%'");
  while (stmt.step()) {
    console.log(JSON.stringify(stmt.getAsObject(), null, 2));
  }
  stmt.free();
  db.close();
}

check().catch(console.error);
