import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs4 = [
  // --- IMAGE 1 ---
  { 
    name: "Jiznet Gonzalez", 
    document_id: "9996336", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Medicamentos entregados: Inhalación salbutamol 100mcg, Amlodipina 10mg. Tlf: 04122040634." 
  },
  { 
    name: "Denys Ugueto", 
    document_id: "6497763", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de comida, agua y aseo personal. Tlf: 04122880258." 
  },
  { 
    name: "Denices Salazar", 
    document_id: "11642066", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de comida, agua y aseo personal." 
  },
  { 
    name: "Wilmarys Gomez", 
    document_id: "6191392", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de comida, agua y aseo personal." 
  },
  { 
    name: "Israel Iriarte", 
    document_id: "9998272", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Medicamentos entregados: Losartán, Omeprazol, Metformina. Tlf: 04242804488." 
  },

  // --- IMAGE 2 ---
  { 
    name: "Mirna Marquez", 
    document_id: "6467554", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Medicamentos y suministros entregados: kit de medicamentos para la hipertensión, kit de artículos personales, kit de alimentos, kit de emergencia y 1 caja de agua. Tlf: 04241294285." 
  },
  { 
    name: "Karinel Farias", 
    document_id: "12223796", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de alimentos, kit personal. Tlf: 04145925107." 
  },
  { 
    name: "Josefina Meza", 
    document_id: "10583264", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de artículos personales, kit de alimentos. Tlf: 04242436609." 
  },
  { 
    name: "Juan Mujica", 
    document_id: "29609080", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit personal, kit de enlatados y alimentos, kit de comidas. Tlf: 04122836120." 
  }
];

async function runCleanupAndImport4() {
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
  for (const act of newActs4) {
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

  // 2. DEDUPLICATE database (just in case)
  console.log("Running deduplication...");
  
  // First, get count before deduplication
  const beforeCountRow = db.exec("SELECT COUNT(*) as count FROM persons");
  const countBefore = beforeCountRow[0].values[0][0];

  // Group by name, document_id, location, notes to delete exact duplicates
  db.run(`
    DELETE FROM persons
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM persons
      GROUP BY name, COALESCE(document_id, ''), location, notes
    )
  `);

  const afterCountRow = db.exec("SELECT COUNT(*) as count FROM persons");
  const countAfter = afterCountRow[0].values[0][0];
  console.log(`Deduplication complete. Removed ${countBefore - countAfter} duplicate rows.`);

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Acta import 4 complete!`);
  console.log(`   - Imported ${insertedCount} new records from delivery acts.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport4().catch(console.error);
