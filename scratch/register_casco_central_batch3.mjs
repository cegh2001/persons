import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const updates = [
  // --- SHEET 1 (IDs 579 to 590) ---
  { id: 579, name: "Willian Galarraga", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 580, name: "Esther Perez", document_id: null, notes: "Entrega de suministros: agua, suero, pañales, toalla húmeda, gel." },
  { id: 581, name: "Maria Ferrer", document_id: null, notes: "Entrega de suministros: agua, suero, pañales, toalla húmeda, compotas." },
  { id: 582, name: "Abraham Isaac", document_id: null, notes: "Entrega de suministros: agua, compota." },
  { id: 583, name: "Wilmer Gomez", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 584, name: "Airan Guerra", document_id: null, notes: "Entrega de suministros: agua, suero, compota, gel, toalla húmeda." },
  { id: 585, name: "Yolitza Pimentel", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 586, name: "Irma Moreno", document_id: null, notes: "Entrega de suministros: agua, suero, toalla, compota, pañales." },
  { id: 587, name: "Magdalena Autor", document_id: null, notes: "Entrega de suministros: toallita, agua, etc, pañales, compotas." },
  { id: 588, name: "Yanarelis Velasquez", document_id: null, notes: "Entrega de suministros: agua, compota, pañales, etc." },
  { id: 589, name: "Andreina Vazquez", document_id: null, notes: "Entrega de suministros: agua, compotas, toallas." },
  { id: 590, name: "Ronny Martinez", document_id: null, notes: "Entrega de suministros: agua, electrolitos." },

  // --- SHEET 2 (Updates for existing) ---
  { id: 531, name: "Fernando Carvajal", document_id: "9219124", notes: "Entrega de suministros: Agua, suero." },
  { id: 635, name: "Glenda Castellano", document_id: "6494999", notes: "Entrega de suministros: Agua, Suero." }
];

const inserts = [
  // --- SHEET 2 (New inserts) ---
  { name: "Leticia Abrantes", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Richar Rodriges", document_id: null, notes: "Entrega de suministros: Suero, Agua." },
  { name: "Omaira Barrera", document_id: null, notes: "Entrega de suministros: Pañales, Suero, toallas, Compotas, Gel, Agua." },
  { name: "Luis Carriel", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Nereida Rada", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Expedito Subero", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Leonardo Brumers", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Hilaria Liendo", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Leidy Velasquez", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Rafael Barreto", document_id: null, notes: "Entrega de suministros: Agua, suero, compota, Gel." },
  { name: "Ernesto Jose Origüen", document_id: null, notes: "Entrega de suministros: Pañales, Suero, Agua." },
  { name: "Edgar Antonio Arrieche", document_id: null, notes: "Entrega de suministros: Agua, Suero." },
  { name: "Jose Antonio Lopez", document_id: null, notes: "Entrega de suministros: Agua, Suero, gel." },
  { name: "Mariana Chavez", document_id: null, notes: "Entrega de suministros: Pañales XG, Compotas, gel, Toalla Húmeda, Agua." },
  { name: "Mirtha Revenga", document_id: null, notes: "Entrega de suministros: Compota, Toalla Humeda, Pañales, Suero." },
  { name: "Luz Espinoza", document_id: null, notes: "Entrega de suministros: Gel, Toalla Humeda." },
  { name: "Alonzo Luis", document_id: null, notes: "Entrega de suministros: Agua, suero." },
  { name: "Jesus Perez", document_id: null, notes: "Entrega de suministros: Agua, suero." }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Starting batch 3 register script...");

  // 1. Run updates
  for (const person of updates) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;
    console.log(`Updating ID ${person.id} to name "${person.name}", location "Casco Central"`);
    db.run(
      `UPDATE persons 
       SET name = ?, raw_name = ?, document_id = ?, location = 'Casco Central', 
           is_vulnerable = 1, notes = ?, received_supplies = 1, received_medical = 0 
       WHERE id = ?`,
      [person.name, rawName, person.document_id, person.notes, person.id]
    );
  }

  // 2. Run inserts
  for (const person of inserts) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;
    console.log(`Inserting new user: ${person.name}`);
    db.run(
      `INSERT INTO persons 
       (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) 
       VALUES (?, ?, ?, 'Casco Central', 1, ?, 1, 0)`,
      [rawName, person.name, person.document_id, person.notes]
    );
  }

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Database batch 3 successfully updated!");
}

run().catch(console.error);
