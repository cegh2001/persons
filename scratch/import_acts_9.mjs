import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs9 = [
  // --- IMAGE 1 (1 to 20) ---
  { name: "Marlene Corro", document_id: "6800563", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yenireth Barrios", document_id: "18140995", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Migueidys Cuarez", document_id: "34144958", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Max Gonzalez", document_id: "11639330", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ursula Mascolo", document_id: "17983137", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Omaira de Garcia", document_id: "12166191", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Felias Iriarte", document_id: "4116398", location: "Calle Nueva", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Magdalena Alvares", document_id: "13044167", location: "La Miel", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "José Castro", document_id: "3891634", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Omar Suarez", document_id: "5572486", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Clesis Canache", document_id: "5569834", location: "Corapal", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carlos Barreto", document_id: "14768149", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Correa", document_id: "6468463", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Genesis Alfonzo", document_id: "27441573", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: leche, comida, kit de aseo personal, pañales." },
  { name: "Aquiles Mejia", document_id: "3610756", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Williams Salgado", document_id: "32370525", location: "La Miel", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Alicia Guerra", document_id: "5093261", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Belkis Cordero", document_id: "5094089", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: 2 kit comida, 2 kit personal." },
  { name: "Pastor Perez", document_id: "4114671", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Milena Criminig", document_id: "10575485", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- IMAGE 2 (137 to 147) ---
  { name: "Mariana Perez", document_id: "31656681", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Shirley Escobar", document_id: "15266764", location: "Calle Carretas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yecica Berroteran", document_id: "13042791", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yoleida Da Silva", document_id: "9999057", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Mirian Abelvis", document_id: "5645295", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Nicol Cordero", document_id: "32730300", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Nataly Gombry", document_id: "14768448", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Eugenio Gamero", document_id: "5096467", location: "Los Corales", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Glendys Gutierrez", document_id: "13672764", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Kristen Rodriguez", document_id: null, location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 colchoneta." },

  // --- IMAGE 3 (113 to 136) ---
  { name: "Valeria Torres", document_id: "28305260", location: "Las Tucacas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Natacha Torres", document_id: "32273265", location: "Las Tucacas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Fernando Mesa", document_id: "4562209", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: suero." },
  { name: "Rowins Jesus Roa", document_id: "26478768", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: pañales." },
  { name: "Edimar Campos", document_id: "15489529", location: "Caribe", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Willianny Fernandez", document_id: "30527332", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Deucarys Alfonzo", document_id: "20559845", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Fabiani Suarez", document_id: "33423857", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Karina Lugo", document_id: "17155135", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Sandra Marcano", document_id: "18323864", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carmen Iriarte", document_id: "10579921", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Arelys Mosco", document_id: "5097985", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: colchoneta. Tlf: 04123215404." },
  { name: "Miriam Castillo", document_id: "4115121", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal. Res. Carimar." },
  { name: "Cruz del Valle", document_id: "12460499", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal. Res. Carimar." },
  { name: "Brigitte Iriarte", document_id: "19627603", location: "Palmar Este", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal. Res. Carimas." },
  { name: "Glenda Castellano", document_id: "6494999", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Delgado", document_id: "8577542", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Junior Revenga", document_id: "19391881", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Eduardo Lorenzo", document_id: "6486135", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yolanda Gonzalez", document_id: "7991639", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Dionicia Hernandez", document_id: "3472316", location: "Macuto", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Evelio Rojas", document_id: "5573046", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Dayilis Alarcon", document_id: "31955994", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Marisela Moron", document_id: null, location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- IMAGE 4 (90 to 112) ---
  { name: "Jesús Bermudez", document_id: "9396442", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Jhony Castillo", document_id: "30824931", location: "Corapal", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ruben Suarez", document_id: "17959281", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Moisés Ugueto", document_id: "30315145", location: "Calle 12", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Jhonny Silva", document_id: "19445048", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Celis Suarez", document_id: "7999499", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Domingo Barreto", document_id: "5092150", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Karisna Rodriguez", document_id: "28404096", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Florencio Suarez", document_id: "33661430", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Adela Perez", document_id: "3890056", location: "El Corral", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carmen Marcano", document_id: "18141001", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "José Gregorio Solorzano", document_id: "20559818", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Franlys Moreno", document_id: "18930354", location: "Calle Nueva", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Karen Fuentes", document_id: "29942441", location: "Cotoperiz", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Antonio Morela", document_id: "10583186", location: "Calle Nueva", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Roger Bueno", document_id: "10578385", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Alfredo Gonzalez", document_id: "6296955", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ivan Garcia", document_id: "17710602", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosa De Mendoza", document_id: "6475857", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yords Lara", document_id: "10547546", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Hernan Suarez", document_id: "6483608", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carmen Peña", document_id: "5575327", location: "Las Tucacas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Yenny Sanchez", document_id: "18754175", location: "Las Tucacas", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." }
];

async function runCleanupAndImport9() {
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
  for (const act of newActs9) {
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

  console.log(`\n✅ Acta import 9 complete!`);
  console.log(`   - Imported ${insertedCount} new records.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport9().catch(console.error);
