import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs3 = [
  // --- IMAGE 1 (Yesika Berroteran) ---
  { 
    name: "Yesika Berroteran", 
    document_id: "13042791", 
    location: "Tarigua", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de bebé (compotas, pañales y toallitas) y enlatados varios. Tlf: 04242547682." 
  },

  // --- IMAGE 2 ---
  { 
    name: "Orlando Soublette", 
    document_id: null, 
    location: "Calle Nueva", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 colchón (calle nueva, responsable la Sra. Celestina de Teixeira)." 
  },
  { 
    name: "Mirna Rebenga", 
    document_id: "6468940", 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de alimento e higiene. Tlf: 04125718482." 
  },
  { 
    name: "Antonio Jose Villaroel Mata", 
    document_id: "7997682", 
    location: "San Julian", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 colchoneta (vecino de San Julian, sector El Hambrón, Johan Colón). Tlf: 04129374816." 
  },

  // --- IMAGE 3 ---
  { 
    name: "Maritza Prietto", 
    document_id: "6800079", 
    location: "Calle Real", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 2 kit de alimentación y 1 kit de artículos personales para la familia. Subida principal de San Julian adyacente a la bomba de repuestos." 
  },
  { 
    name: "Luis Delgado", 
    document_id: "20409244", 
    location: "27 de Julio", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 kit de alimentación, productos de higiene y enlatados (Paciente). Tlf: 04123980567." 
  },
  { 
    name: "Andrea Carolina", 
    document_id: null, 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 2 colchonetas Morales Arévalo. Tiene dos niñas de 9 y 6 años. Sobrina de Eduardo Coraspe (empleado de Los Cotolengos)." 
  },

  // --- IMAGE 4 ---
  { 
    name: "Celestina De Teixeira", 
    document_id: null, 
    location: "Casco Central", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros colectiva (retiró 12 kit personal y 12 kit de artículos personales para el sector Casco Central)." 
  },
  { 
    name: "Carolina Torrealba", 
    document_id: null, 
    location: "Calle Real", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 2 cajas de agua, 2 paquetes de toallas sanitarias (modes), medicina varia, y 2 kit de bebés con pañales y toallitas." 
  },
  { 
    name: "Hermanas Hernandez", 
    document_id: null, 
    location: "Desconocido", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros colectiva: varios kit de alimentos, personal y de emergencia para las Hermanas Hernández (servidoras de la parroquia)." 
  }
];

async function runCleanupAndImport3() {
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
  for (const act of newActs3) {
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

  console.log(`\n✅ Acta import 3 complete!`);
  console.log(`   - Imported ${insertedCount} new records from delivery acts.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport3().catch(console.error);
