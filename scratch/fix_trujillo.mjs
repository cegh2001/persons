import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Locating Luis Trujillo...");
  const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE '%Luis Trujillo%' OR document_id = '14313630'");
  let trujilloId = null;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    trujilloId = row.id;
    console.log(`FOUND Luis Trujillo: id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}"`);
  }
  stmt.free();

  if (trujilloId) {
    console.log(`Updating Luis Trujillo (id ${trujilloId}) location to 'La Llanada'...`);
    db.run(
      "UPDATE persons SET location = 'La Llanada' WHERE id = ?",
      [trujilloId]
    );
  } else {
    console.log("Luis Trujillo not found in database.");
  }

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Database successfully updated!");
}

run().catch(console.error);
