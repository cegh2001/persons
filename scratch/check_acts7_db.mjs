import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  const query = "SELECT COUNT(*) as count FROM persons WHERE id >= 440 AND id <= 513";
  const row = db.exec(query);
  console.log(`Number of records between id 440 and 513: ${row[0].values[0][0]}`);

  const stmt = db.prepare("SELECT id, name, document_id, location, is_vulnerable FROM persons WHERE id >= 440 AND id <= 513");
  while (stmt.step()) {
    console.log(JSON.stringify(stmt.getAsObject()));
  }
  stmt.free();
  db.close();
}

check().catch(console.error);
