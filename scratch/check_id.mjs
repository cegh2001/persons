import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const ids = [424, 425, 426, 427, 428, 429, 370, 373, 374, 376, 436, 437, 438];
  for (const id of ids) {
    const stmt = db.prepare("SELECT * FROM persons WHERE id = ?");
    stmt.bind([id]);
    if (stmt.step()) {
      console.log(JSON.stringify(stmt.getAsObject(), null, 2));
    }
    stmt.free();
  }
  db.close();
}

check().catch(console.error);
