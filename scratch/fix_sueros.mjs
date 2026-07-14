import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Locating Carlos Torres...");
  const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE '%Carlos Torres%'");
  let carlosTorresId = null;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    carlosTorresId = row.id;
    console.log(`FOUND Carlos Torres: id=${row.id}, name="${row.name}", location="${row.location}", notes="${row.notes}"`);
  }
  stmt.free();

  if (carlosTorresId) {
    console.log(`Updating Carlos Torres (id ${carlosTorresId}) location to 'Catia La Mar'...`);
    db.run(
      "UPDATE persons SET location = 'Catia La Mar' WHERE id = ?",
      [carlosTorresId]
    );
  } else {
    console.log("Carlos Torres not found in database.");
  }

  console.log("Replacing 'suero' and 'electrolito' with 'Electrolit' in all notes...");
  
  const selectStmt = db.prepare("SELECT id, notes FROM persons");
  const updates = [];
  
  // Regex to match: suero, sueros, electrolito, electrolitos, electrólito, electrólitos, electrolit, electrolits (case-insensitive)
  const regex = /\b(sueros?|electr[óo]litos?|electrolits?)\b/gi;

  while (selectStmt.step()) {
    const row = selectStmt.getAsObject();
    if (row.notes && regex.test(row.notes)) {
      const updatedNotes = row.notes.replace(regex, "Electrolit");
      updates.push({ id: row.id, oldNotes: row.notes, newNotes: updatedNotes });
    }
  }
  selectStmt.free();

  console.log(`Found ${updates.length} rows to update.`);
  for (const update of updates) {
    db.run("UPDATE persons SET notes = ? WHERE id = ?", [update.newNotes, update.id]);
    console.log(`[id ${update.id}]: "${update.oldNotes}" -> "${update.newNotes}"`);
  }

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Database successfully updated!");
}

run().catch(console.error);
