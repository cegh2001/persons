import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs10 = [
  // --- IMAGE 1 (66 to 89) ---
  { name: "Groydy Luna", document_id: "29777473", location: "Caribe", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Marlene Tortolero", document_id: "6480254", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Juan C. Iriarte", document_id: "11638775", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yenny Iriarte", document_id: "14567543", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Lesbia Martinez", document_id: "7996523", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Victoria de Perez", document_id: "8178492", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jesus Iriarte", document_id: "6466205", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Lino Ortega", document_id: "7998223", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Eudy Mora", document_id: "13373974", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Juana Rodriguez", document_id: "6499582", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Celina Solorzano", document_id: "9996686", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Abrisu Iriarte", document_id: "24178867", location: "Corapal", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jaime Gutierrez", document_id: "12163571", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Gerial Garcia", document_id: "18930024", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Florencio Hernandez", document_id: "8178717", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Ezequiel Montilla", document_id: "3363423", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jesús Anzostegui", document_id: "10584647", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Andreina Vasquez", document_id: "19273843", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Andreina Bolivar", document_id: "22940583", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Elia Perez", document_id: "4065188", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Joel Avilan", document_id: "18754756", location: "Caribe", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Leny Solis", document_id: "11640515", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Raúl Magdaleno", document_id: "8177073", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Maivy Zamorosa", document_id: "19397595", location: "Corapal", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },

  // --- IMAGE 2 (46 to 61) ---
  { name: "Frank Narvaez", document_id: "6468978", location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Ismael Alvarez", document_id: "13777451", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Edterio Perez", document_id: "6468560", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Gustavo Quintero", document_id: "4444361", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Rosamedia Ojeda", document_id: "21191469", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Escarly Gonzalez", document_id: "34055174", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Angely Balinor", document_id: "24180279", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Francisco Gonzalez", document_id: "34055174", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Omar Diaz", document_id: "6437969", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Richard Narvaez", document_id: "13224814", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Vianney Rodriguez", document_id: "34055114", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Younelys Romero", document_id: "27219790", location: "Punto Fijo", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Wilmer Gary", document_id: "11060753", location: "Calle Nueva", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Luis Pantoja", document_id: "4559202", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Luis Pantoja", document_id: "4559202", location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Jesús Bermudes", document_id: "9976142", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Alberto Vargas", document_id: "4559747", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Florencio Suarez", document_id: "3366143", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },

  // --- IMAGE 4 (La Tomita default list) ---
  { name: "Luis Manuel Rodriguez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Leobardo Pacheco", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Pedro Yanez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Mari Yamani", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Evelin Gonzalez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Mary Elena Palave", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Angeli Duarte", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "José Rodriguez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yuri Gutierrez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yuli Pacheco", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Ivon Maurera", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Piedad Henao", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Belkis Diaz", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Arelis Rivas", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Stefani", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Zenaida Pavon", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Yagli Mendoza", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Juan Diego Yato", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Somaira Pendible", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." },
  { name: "Francisco Perez", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 1 kit de aseo personal y 1 de alimento." }
];

async function runCleanupAndImport10() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. UPDATE old default notes to the new specified format
  console.log("Updating old notes to new default format...");
  db.run(`
    UPDATE persons 
    SET notes = 'Entrega de suministros: 1 kit de aseo personal y 1 de alimento.' 
    WHERE notes = 'Entrega de suministros: kit de comida, agua y aseo personal.'
  `);

  // 2. INSERT new records from actas
  console.log("Importing new actas...");
  const insertStmt = db.prepare(
    "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let insertedCount = 0;
  for (const act of newActs10) {
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

  // 3. DEDUPLICATE database
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

  console.log(`\n✅ Acta import 10 complete!`);
  console.log(`   - Updated old default notes to the new format.`);
  console.log(`   - Imported ${insertedCount} new records.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport10().catch(console.error);
