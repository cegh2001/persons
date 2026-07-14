import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs7 = [
  // --- PAGE 1 (1 to 16) ---
  { name: "Ada Allende", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal." },
  { name: "Yibisei Rodriguez", document_id: "8128811", location: "Vargas", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, bolsa de comida. Tlf/CI: 8128811." },
  { name: "Gladys Poleo", document_id: "5095297", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, bolsa de comida. CI: 5095297." },
  { name: "Libert Gil", document_id: "12715775", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit de limpieza, pañales, comida. CI: 12715775." },
  { name: "José Prada", document_id: "5098867", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal. CI: 5098867." },
  { name: "Thais Mendoza", document_id: null, location: "Vargas", is_vulnerable: 0, notes: "Entrega de suministros: kit personal." },
  { name: "Angelica Alegria", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc. (20 años)." },
  { name: "Iris De Abeli", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Carmen Olavarrieta", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Celia Gil", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, pañales." },
  { name: "Luicelis Ortega", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, comida." },
  { name: "Fabiola Ramos", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Jesús Rivas", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Domingo De Paz", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Hilda Mar Polco", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida, agua, etc." },
  { name: "Eurisdes Vilardia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },

  // --- PAGE 2 (16 to 36) ---
  { name: "Maximo Piñero", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida." },
  { name: "Juan Guerrero", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida." },
  { name: "Richard Rodriguez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida, agua." },
  { name: "Jose Rocket", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida, agua." },
  { name: "Dariamila Guzman", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida, agua." },
  { name: "Pedro Rodriguez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, comida, agua." },
  { name: "Hidelis Longa", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Vladiney Suarez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, comida." },
  { name: "Moraima Polanco", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Alexis Avila", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Libeth Perez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, comida." },
  { name: "Jose Mendez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal." },
  { name: "Lis Castro", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Rafael Alvarez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, agua." },
  { name: "Yoleida Davila", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida." },
  { name: "Jose Corre", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, agua." },
  { name: "Nelly Rodriguez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Luis Manrique", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, etc." },
  { name: "Jaime Freitas", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, agua." },
  { name: "Yudith Sojo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, agua, personal." },
  { name: "Rogelis Anton", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, etc." },

  // --- PAGE 3 (37 to 52) ---
  { name: "Carlos Uriarte", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit comida, agua, suero." },
  { name: "Jhon De Silva", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Mirian Castillo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Apelis Castillo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Arikalka Nato", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, pañal." },
  { name: "Luicelis Izquiel", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Maritza Marquez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Jaon Iriarte", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Luis Alvarez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Aquiles Blanado", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua." },
  { name: "Elizabeth Belisario", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Nelida Rodriguez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal, agua, etc." },
  { name: "Gonzales Borges", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Vitzoribel Salazar", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: comida, agua." },
  { name: "Yaritza Avila", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit personal." },
  { name: "Omar Barrero", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, compota, etc." },

  // --- PAGE 4 (53 to 74) ---
  { name: "Nelrys Alvares", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, etc." },
  { name: "Yohanna Alvarez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Alberto Vega", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Jesús Hernandez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Medicamentos y suministros entregados: agua, suero, pañal M, toalla húmeda, anticonceptivo, etc." },
  { name: "Valentina Sanchez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Luis Eduardo Ramos", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "José Castillo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Adela Perez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, compotas." },
  { name: "Gilberto Gonzales", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Luis Delgado", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Gleidys Gutierrez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, compotas, gel." },
  { name: "Carlos Navarro", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Oralia Reina", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, gel, compotas, pañales G." },
  { name: "Neida Reina", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, gel, toallas húmedas, pañales G." },
  { name: "Erwin Becerra", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: suero, gel, toallas húmedas." },
  { name: "Corina Ferrer", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañales M, toallas húmedas, gel, compota." },
  { name: "Esegiol Mandilla", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, gel." },
  { name: "Gustavo Quintero", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "José Silva", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: sueros." },
  { name: "Joao Arostegui", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: sueros, agua." },
  { name: "Nella Mery", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Orlando David", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." }
];

async function runCleanupAndImport7() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. INSERT new records from actas
  console.log("Importing new actas...");
  const insertStmt = db.prepare(
    "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let insertedCount = 0;
  for (const act of newActs7) {
    const cleanedDoc = cleanCI(act.document_id);
    const rawName = cleanedDoc ? `${act.name} ${cleanedDoc}` : act.name;

    // Check if this person and notes already exist to prevent duplicate insertions
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM persons WHERE name = ? AND location = ? AND notes = ?");
    checkStmt.bind([act.name, act.location, act.notes]);
    checkStmt.step();
    const exists = checkStmt.getAsObject().count > 0;
    checkStmt.free();

    if (!exists) {
      insertStmt.run([rawName, act.name, cleanedDoc, act.location, act.is_vulnerable, act.notes]);
      insertedCount++;
    }
  }

  insertStmt.free();

  // 2. DEDUPLICATE database
  console.log("Running deduplication...");
  db.run(`
    DELETE FROM persons
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM persons
      GROUP BY name, COALESCE(document_id, ''), location, notes
    )
  `);

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Acta import 7 complete!`);
  console.log(`   - Imported ${insertedCount} new records.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport7().catch(console.error);
