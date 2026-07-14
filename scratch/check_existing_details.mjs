import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const ids = [692, 67, 20, 325];
  console.log("Details for the 4 existing users:");
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

run().catch(console.error);
