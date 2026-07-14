import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const updates = [
  // Camila Trias fix from previous sheet
  { id: 325, name: "Camila Trias", document_id: "6480073", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Losartán.", received_medical: 1 },
  // Marta Almeida location fix
  { id: 298, name: "Marta Almeida", document_id: "8772301", location: "El Dispensario", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento.", received_medical: 0 },
  // Fernando Mesa bracket notes fix
  { id: 622, name: "Fernando Mesa", document_id: "4562209", location: "El Collao", is_vulnerable: 0, notes: "2 kits personales y una caja de agua y Electrolit", received_medical: 0 },
  // Florencio Iriarte bracket notes fix
  { id: 746, name: "Florencio Iriarte", document_id: "6468942", location: "27 de Julio", is_vulnerable: 0, notes: "2 kits personales y una caja de agua y Electrolit", received_medical: 0 },
  // Maria Chavez bracket notes fix
  { id: 745, name: "Maria Chavez", document_id: "6484040", location: "El Caimito", is_vulnerable: 0, notes: "2 kits personales y una caja de agua y Electrolit", received_medical: 0 },
  // Raquel Garcia name and bracket notes fix (Cédula in DB was 17958255, name was Rafael Garcia)
  { id: 744, name: "Raquel Garcia", document_id: "17958255", location: "27 de Julio", is_vulnerable: 0, notes: "2 kits personales y una caja de agua y Electrolit", received_medical: 0 }
];

const inserts = [
  { name: "Mizoribel Solorzano", document_id: "10531726", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yasmin Pino", document_id: "20783452", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Gabriel Noya", document_id: "22565052", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Henry Gutierrez", document_id: "5400914", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Luis Ramos", document_id: "10580464", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Ruben Ceballos", document_id: "24180505", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yesica Hernandez", document_id: "16724942", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Rowely Suarez", document_id: "25574046", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yoledys Silva", document_id: "17710084", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Diomar Fajardo", document_id: "17966348", location: "Calle Guaicaipuro", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Genesis Marquina", document_id: "28314103", location: "Maiquetia", is_vulnerable: 0, notes: "Kit de limpieza." },
  { name: "Henry Aguilar", document_id: "5091703", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jose Mayora", document_id: "11639422", location: "Quebrada Seca", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jesus Rodriguez", document_id: "10584946", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Omar Almeida", document_id: "11634164", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Maria Alcila", document_id: "13225063", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Viviana Borges", document_id: "19915393", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Cesar Bulmez", document_id: "1453629", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Applying updates to existing/incomplete records...");
  for (const person of updates) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;
    console.log(`Updating ID ${person.id} (${person.name})`);
    db.run(
      `UPDATE persons 
       SET name = ?, raw_name = ?, document_id = ?, location = ?, 
           notes = ?, received_medical = ? 
       WHERE id = ?`,
      [person.name, rawName, person.document_id, person.location, person.notes, person.received_medical, person.id]
    );
  }

  console.log("\nInserting new records...");
  let insertedCount = 0;
  for (const person of inserts) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;
    
    // Check if document_id already exists to prevent duplicate insertion
    let exists = false;
    if (person.document_id) {
      const checkStmt = db.prepare("SELECT COUNT(*) as count FROM persons WHERE document_id = ?");
      checkStmt.bind([person.document_id]);
      checkStmt.step();
      exists = checkStmt.getAsObject().count > 0;
      checkStmt.free();
    }

    if (!exists) {
      console.log(`Inserting: ${person.name} (${person.document_id}) in ${person.location}`);
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
  console.log(`\n✅ Database updated! Imported ${insertedCount} new records.`);
}

run().catch(console.error);
