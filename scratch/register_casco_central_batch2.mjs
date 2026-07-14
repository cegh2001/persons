import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const mapping = [
  // --- ACTS 6 (Image 5) ---
  { id: 400, name: "Farin Rojas", document_id: "723013", notes: "Entrega de suministros: 2 sueros, agua, 2 toallas, 4 electrólitos, 10 pañales. Tlf: 5575240." },
  { id: 401, name: "Barbara Toledo", document_id: "20161313", notes: "Entrega de suministros: toalla, gel, compota." },
  { id: 402, name: "Yosimar Rodriguez", document_id: "6887861", notes: "Entrega de suministros: electrólitos, toalla." },
  { id: 403, name: "Carla Funes", document_id: "33423677", notes: "Entrega de suministros: pañales G, toalla, electrólito." },
  { id: 404, name: "Reinaldo Canache", document_id: "18142569", notes: "Entrega de suministros: pañal M, compota." },
  { id: 405, name: "Saray Noguera", document_id: "36593501", notes: "Entrega de suministros: pañal adulto, toalla, gel, electrólitos." },
  { id: 406, name: "Anabel Piñero", document_id: "19272032", notes: "Entrega de suministros: pañal, gel, toalla, 4 electrólitos, compotas." },
  { id: 407, name: "Eloina Peña", document_id: "1093489", notes: "Entrega de suministros: pañal adulto, gel, toalla, electrólitos, 2 compotas." },
  { id: 408, name: "Beatriz Fernandes", document_id: "2974147", notes: "Entrega de suministros: 1 pañal adulto, toalla, gel, compota." },
  { id: 409, name: "Aranza Lopez", document_id: "13825451", notes: "Entrega de suministros: 2 pañales G, gel, electrólitos, toalla, pañal adulto." },

  // --- ACTS 7 (Images 1, 2, 3, 4) ---
  { id: 440, name: "Ada Allende", document_id: null, notes: "Entrega de suministros: 1 kit de aseo personal." },
  { id: 441, name: "Yibisei Rodriguez", document_id: "8178911", notes: "Entrega de suministros: kit personal, bolsa de comida. Tlf/CI: 8178911." },
  { id: 442, name: "Gladys Poleo", document_id: "5095297", notes: "Entrega de suministros: kit personal, bolsa de comida. CI: 5095297." },
  { id: 443, name: "Libert Gil", document_id: "12715775", notes: "Entrega de suministros: kit de limpieza, pañales, comida. CI: 12715775." },
  { id: 444, name: "Jose Prada", document_id: "5098867", notes: "Entrega de suministros: kit personal. CI: 5098867." },
  { id: 445, name: "Thais Mendoza", document_id: null, notes: "Entrega de suministros: kit personal, 2 cajas." },
  { id: 446, name: "Angelica Alegria", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc. (20 años)." },
  { id: 447, name: "Iris de Abeli", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 448, name: "Carmen Olavarrieta", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 449, name: "Celia Gil", document_id: null, notes: "Entrega de suministros: kit personal, pañales." },
  { id: 450, name: "Lileidis Ortegosa", document_id: null, notes: "Entrega de suministros: kit personal, agua, comida." },
  { id: 451, name: "Fabiola Romero", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 452, name: "Jesus Rivero", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 453, name: "Domingo Herrera", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 454, name: "Hildo Mari Polanco", document_id: null, notes: "Entrega de suministros: kit personal, comida, agua, etc." },
  { id: 455, name: "Eudis Pedes Vilandia", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 456, name: "Maximo Piñero", document_id: null, notes: "Entrega de suministros: kit personal, comida." },
  { id: 457, name: "Juan Guerrero", document_id: null, notes: "Entrega de suministros: kit personal, comida." },
  { id: 458, name: "Richard Rodriguez", document_id: null, notes: "Entrega de suministros: kit personal, comida, agua." },
  { id: 459, name: "Jose Rochet", document_id: null, notes: "Entrega de suministros: kit personal, comida, agua." },
  { id: 460, name: "Darisnelia Guzman", document_id: null, notes: "Entrega de suministros: kit personal, comida, agua." },
  { id: 461, name: "Pedro Rodriguez", document_id: null, notes: "Entrega de suministros: kit personal, comida, agua." },
  { id: 462, name: "Fidelis Longa", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 463, name: "Vladirey Suarez", document_id: null, notes: "Entrega de suministros: kit." },
  { id: 464, name: "Mariana Polanco", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 465, name: "Alexis Avila", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 466, name: "Libert Perez", document_id: null, notes: "Entrega de suministros: kit personal, agua, comida." },
  { id: 467, name: "Jose Mendez", document_id: null, notes: "Entrega de suministros: kit personal." },
  { id: 468, name: "Isis Castro", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 469, name: "Rafael Alvarez", document_id: null, notes: "Entrega de suministros: kit comida, agua." },
  { id: 470, name: "Yoleida Davila", document_id: null, notes: "Entrega de suministros: kit comida." },
  { id: 471, name: "Jose Corro", document_id: null, notes: "Entrega de suministros: kit comida, agua." },
  { id: 472, name: "Nelly Rodriguez", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 473, name: "Luis Manrique", document_id: null, notes: "Entrega de suministros: kit comida, etc." },
  { id: 474, name: "Jaime Freitas", document_id: null, notes: "Entrega de suministros: kit comida, agua." },
  { id: 475, name: "Judith Sojo", document_id: null, notes: "Entrega de suministros: kit comida, agua, personal." },
  { id: 476, name: "Rogelio Anton", document_id: null, notes: "Entrega de suministros: kit personal, etc." },
  { id: 477, name: "Carlos Iriarte", document_id: null, notes: "Entrega de suministros: kit comida, agua, suero." },
  { id: 478, name: "Jhon De Silva", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 479, name: "Mirian Castillo", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 480, name: "Arelis Castillo", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 481, name: "Arikalka Nato", document_id: null, notes: "Entrega de suministros: kit personal, agua, pañal." },
  { id: 482, name: "Ivicelis Izquiedo", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 483, name: "Maritza Marquez", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 484, name: "Juan Iriarte", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 485, name: "Luis Alvarez", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 486, name: "Aquiles Blanco", document_id: null, notes: "Entrega de suministros: kit personal, agua." },
  { id: 487, name: "Elizabeth Velisario", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 488, name: "Nelida Rodriguez", document_id: null, notes: "Entrega de suministros: kit personal, agua, etc." },
  { id: 489, name: "Gonzales Borges", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 490, name: "Yitza Ribel Salazar", document_id: null, notes: "Entrega de suministros: comida, agua." },
  { id: 491, name: "Yaritza Avila", document_id: null, notes: "Entrega de suministros: kit personal." },
  { id: 492, name: "Omar Barrera", document_id: null, notes: "Entrega de suministros: agua, compota, etc." },
  { id: 493, name: "Melvis Alvarez", document_id: null, notes: "Entrega de suministros: agua, etc." },
  { id: 494, name: "Yovanna Alvarez", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 495, name: "Alberto Vega", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 496, name: "Jesus Hernandez", document_id: null, notes: "Medicamentos y suministros entregados: agua, suero, pañal M, toalla húmeda, anticonceptivo, etc." },
  { id: 497, name: "Valentina Sanchez", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 498, name: "Luis Eduardo Ramos", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 499, name: "Jose Castillo", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 501, name: "Gilberto Gonzalez", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 502, name: "Luis Delgado", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 503, name: "Gleidis Gutierrez", document_id: null, notes: "Entrega de suministros: agua, suero, compotas, gel." },
  { id: 504, name: "Carlos Navarro", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 506, name: "Neida Reina", document_id: null, notes: "Entrega de suministros: agua, suero, gel, toallas húmedas, pañales G." },
  { id: 507, name: "Erwin Becerra", document_id: null, notes: "Entrega de suministros: suero, gel, toallas húmedas." },
  { id: 508, name: "Corina Ferrer", document_id: null, notes: "Entrega de suministros: pañales M, toallas húmedas, gel, compota." },
  { id: 509, name: "Eseguil Mandilla", document_id: null, notes: "Entrega de suministros: agua, gel." },
  { id: 510, name: "Gustavo Quintero", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 511, name: "Jose Silva", document_id: null, notes: "Entrega de suministros: sueros." },
  { id: 512, name: "Jose Azoategui", document_id: null, notes: "Entrega de suministros: sueros, agua." },
  { id: 513, name: "Nella Micy", document_id: null, notes: "Entrega de suministros: agua, suero." },
  { id: 514, name: "Claudio David", document_id: null, notes: "Entrega de suministros: agua, suero." }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Starting batch 2 register script...");

  for (const person of mapping) {
    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;

    // First check if the target ID exists in the DB
    const stmt = db.prepare("SELECT * FROM persons WHERE id = ?");
    stmt.bind([person.id]);
    const exists = stmt.step();
    stmt.free();

    if (exists) {
      console.log(`Updating ID ${person.id} to name "${person.name}", location "Casco Central"`);
      db.run(
        `UPDATE persons 
         SET name = ?, raw_name = ?, document_id = ?, location = 'Casco Central', 
             is_vulnerable = 1, notes = ?, received_supplies = 1, received_medical = 0 
         WHERE id = ?`,
        [person.name, rawName, person.document_id, person.notes, person.id]
      );
    } else {
      console.log(`Inserting missing ID ${person.id} as name "${person.name}"`);
      db.run(
        `INSERT INTO persons 
         (id, raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) 
         VALUES (?, ?, ?, ?, 'Casco Central', 1, ?, 1, 0)`,
        [person.id, rawName, person.name, person.document_id, person.notes]
      );
    }
  }

  // Deletions / cleanup of duplicate records from Excel seeding or other imports
  // 1. Delete duplicate Jose Prada (id: 529) - we updated id: 444
  console.log("Cleaning up duplicate Jose Prada (id 529)...");
  db.run("DELETE FROM persons WHERE id = 529");

  // 2. Delete duplicate Alexis Avila (id: 465) - we already have him under id: 67 in Casco Central
  console.log("Cleaning up duplicate Alexis Avila (id 465)...");
  db.run("DELETE FROM persons WHERE id = 465");

  // 3. Delete duplicate Yaritza Avila (id: 491) - we already have her under id: 66 in Casco Central
  console.log("Cleaning up duplicate Yaritza Avila (id 491)...");
  db.run("DELETE FROM persons WHERE id = 491");

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Database batch 2 successfully updated!");
}

run().catch(console.error);
