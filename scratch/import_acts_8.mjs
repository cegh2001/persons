import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs8 = [
  // --- PAGE 1 (1 to 21, Date 9-7-2026) ---
  { name: "Glenny Gonzalez", document_id: "24180401", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Mineys Avila", document_id: "11050929", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ridger Ugueto", document_id: "33628413", location: "Calle 12", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Samie Mendoza", document_id: "32813304", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "George Alvarez", document_id: "35011444", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Aquiles Mejias", document_id: "3610756", location: "Calle Vargas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosa Pontes", document_id: "6800092", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Clarivet Gil", document_id: "15544726", location: "El Corral", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Ramirez", document_id: "3365315", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Manrique", document_id: "4676306", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Moaicly Rosario", document_id: "19628503", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Gabriela Solis", document_id: "18325162", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Milka Martinez", document_id: "10583191", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ada Saavedra", document_id: "6481743", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Davis Suarez", document_id: "11637383", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "José Prada", document_id: "5098867", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Robinso Rodriguez", document_id: "6672036", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Fernando Carvajal", document_id: "9219124", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosa Colmenares", document_id: "6488324", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Mary Perez", document_id: "12132802", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Leticia Abraham", document_id: "12865848", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- PAGE 2 (22 to 43) ---
  { name: "Omar Suarez", document_id: "5572484", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Jose Corro", document_id: "9995565", location: "Calle Carretas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Juan Meza", document_id: "6499694", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Corro", document_id: "6469216", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Alan Carreño", document_id: "31380432", location: "Independencia", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Laila Diaz", document_id: "22278428", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ingrid Lopez", document_id: "4857491", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Lusmila Mendoza", document_id: "6475032", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Maximiliano Noguera", document_id: "5472901", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Felicia Guache", document_id: "4557695", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Teofilo Piñango", document_id: "3246401", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Ramos", document_id: "10580468", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Feliciano Jackson", document_id: "4106398", location: "Calle Nueva", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Zulmira Salazar", document_id: "5278883", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carlos Medina", document_id: "5575077", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Jesus Gomez", document_id: "4560317", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Alexis Avila", document_id: "4114668", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosmi Rivero", document_id: "18132580", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luisanny Perejo", document_id: "28305439", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Georgina Torrealba", document_id: "17160165", location: "Los Cotolengos", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Henry Espejo", document_id: "8178919", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Igor Ross", document_id: "11063486", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- PAGE 3 (44 to 65) ---
  { name: "Brayan Fonsnack", document_id: "30527039", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Thais Mendoza", document_id: "6485633", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Mariangelys Trujillo", document_id: "29521384", location: "Los Corales", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yanireth Torse", document_id: "17958150", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yosimar Silva", document_id: "17959286", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Milagros Corro", document_id: "5573224", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Maria Suarez", document_id: "6473359", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Trujillo", document_id: "14313630", location: "La Miel", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Francisco Suarez", document_id: "2901810", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Tovar", document_id: "6480151", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rafael Suarez", document_id: "6491146", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Xavier Borges", document_id: "7996740", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Angel Solorzano", document_id: "14072891", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Willy Perez", document_id: "6492969", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Nery Lopez", document_id: "4120828", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Maribel Alfonzo", document_id: "5573270", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carmen Requena", document_id: "5094821", location: "Las Tucacas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Francisco Mendoza", document_id: "19628666", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Jaime Gonzalez", document_id: "7991640", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Juan Rivero", document_id: "6491992", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yoly Davila", document_id: "11056798", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Veroe Josi", document_id: "8597669", location: "Calle 12", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- PAGE 4 (99 to 110) ---
  { name: "Willian Galarraga", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Esther Perez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, pañales, toalla húmeda, gel." },
  { name: "Maria Ferrer", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, pañales, toalla húmeda, compotas." },
  { name: "Abraham Isaac", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, compota." },
  { name: "Wilmer Gomez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Airan Guerra", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, compota, gel, toalla húmeda." },
  { name: "Yolitza Pimentel", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero." },
  { name: "Irma Moreno", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, suero, toalla, compota, pañales." },
  { name: "Magdalena Autor", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: toallita, agua, etc, pañales, compotas." },
  { name: "Yanarelis Velasquez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, compota, pañales, etc." },
  { name: "Andreina Vazquez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, compotas, toallas." },
  { name: "Ronny Martinez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: agua, electrolitos." }
];

async function runCleanupAndImport8() {
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
  for (const act of newActs8) {
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

  console.log(`\n✅ Acta import 8 complete!`);
  console.log(`   - Imported ${insertedCount} new records.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport8().catch(console.error);
