import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs2 = [
  // --- IMAGE 1 (Notebook page 4/07) ---
  { 
    name: "Yolanda Gonzalez", 
    document_id: "11060644", 
    location: "La Miel", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 kit de emergencia, 2 cajas de agua, 2 kit personal, 2 kit de comida. Medicamentos entregados: 1 Acetaminofén, 1 Loratadina, Cetirizina. Tlf: 0412597876." 
  },
  { 
    name: "Eudys Rodriguez", 
    document_id: "10578101", 
    location: "Montesano", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: kit de higiene y 2 combos de comida. Tlf: 04127564509." 
  },

  // --- IMAGE 2 & 3 (Julio Valerio) ---
  { 
    name: "Julio Valerio", 
    document_id: "7993692", 
    location: "Caraballeda", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 par de zapatos de color azul tipo botines (trabajador del Ambulatorio Carlos Soublette). Tlf: 04142845987." 
  },

  // --- IMAGE 4 (Caridad Lopez) ---
  { 
    name: "Caridad Lopez", 
    document_id: "9481519", 
    location: "Tanaguarena", 
    is_vulnerable: 0, 
    notes: "Entrega de suministros: 1 colchoneta de uso personal (donación de la Iglesia La Candelaria). Tlf: 04123640350." 
  }
];

async function runCleanupAndImport2() {
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
  for (const act of newActs2) {
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

  console.log(`\n✅ Acta import 2 complete!`);
  console.log(`   - Imported ${insertedCount} new records from delivery acts.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport2().catch(console.error);
