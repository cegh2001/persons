import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const newRecords = [
  { name: "Javier Fernandez", document_id: "13223779", location: "Boca de Río / Caribe", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Ines Morales", document_id: "6489879", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Maria Bolivar", document_id: "10254676", location: "La Tomita / Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jose Jimenez", document_id: null, location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Awilda Yanez", document_id: "10575595", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Amanda Maitin", document_id: "25589803", location: "Calle Vargas", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Candelaria Rodriguez", document_id: "4557318", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yorashara Jara", document_id: "10547541", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Mery Canache", document_id: "14313813", location: "Calle Vargas", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Genesis Rondon", document_id: "26180163", location: "Calle La Iglesia", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Registering missing users from sheet dated 11-7-2026...");
  
  let insertedCount = 0;
  for (const person of newRecords) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;
    
    // Check if the person is already in the database by document_id or name
    let exists = false;
    if (person.document_id) {
      const checkStmt = db.prepare("SELECT COUNT(*) as count FROM persons WHERE document_id = ?");
      checkStmt.bind([person.document_id]);
      checkStmt.step();
      exists = checkStmt.getAsObject().count > 0;
      checkStmt.free();
    } else {
      const checkStmt = db.prepare("SELECT COUNT(*) as count FROM persons WHERE name = ? AND location = ?");
      checkStmt.bind([person.name, person.location]);
      checkStmt.step();
      exists = checkStmt.getAsObject().count > 0;
      checkStmt.free();
    }

    if (!exists) {
      console.log(`Inserting: ${person.name} (${person.document_id || "no ID"}) in ${person.location}`);
      db.run(
        `INSERT INTO persons 
         (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) 
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
        [rawName, person.name, person.document_id, person.location, person.is_vulnerable, person.notes]
      );
      insertedCount++;
    } else {
      console.log(`Skipped existing: ${person.name}`);
    }
  }

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log(`\n✅ Register complete! Imported ${insertedCount} new records.`);
}

run().catch(console.error);
