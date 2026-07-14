import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs = [
  // --- IMAGE 1 (Acta 4) ---
  { name: "Rosaida Fernandez", document_id: null, location: "Coropal", is_vulnerable: 0, notes: "Acta de entrega colectiva (retiró 37 kits de aseo personal y 37 kits de alimentos para los sectores Coropal y Frente Marcal)." },

  // --- IMAGE 2 ---
  { name: "Jesús Rolando Mendible", document_id: null, location: "Caraballeda", is_vulnerable: 0, notes: "Entrega de suministros: 1 colchón individual para su hija Alejandra Mendible. Tlf: 04140242869." },

  // --- IMAGE 3 ---
  { name: "Gabriel Gina", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Medicamentos entregados para su abuelo: Metformina 500mg, Losartán potásico 50mg, Olmesartán medoxomilo 40mg, Enalapril 20mg, Ibuprofeno 400mg, Omeprazol 20mg, bolsa de orina, alcohol." },

  // --- IMAGE 4 ---
  { name: "Carolina Parejo", document_id: "6498477", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal. Tlf: 04142595571." },
  { name: "Mildred Luis", document_id: "11643494", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: 2 botellas de 5L de agua, 1 kit de alimentos, 1 kit de aseo, 1 kit de bebé. Tlf: 04199024051." },
  { name: "Fabio Arvelo", document_id: null, location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: 6 unidades de inyectadora para insulina, kit de comidas y limpieza." },

  // --- IMAGE 5 ---
  { name: "Myrka Martínez", document_id: "10583191", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de alimentos, kit de bebé. Calle de la Iglesia (realmente es de Tarigua). Tlf: 04241209697." },
  { 
    name: "Nora Fariña", 
    document_id: "6986542", 
    location: "San Her I.", 
    is_vulnerable: 0, 
    notes: "Medicamentos y suministros entregados: 16 kit de comida, 16 kit de artículos personales, 1 kit de artículos de bebé, agua suficiente, enlatados de sardina y atún, 4 botellas de 5L de agua, 2 kits de higiene, y medicamentos (Metformina 500mg, Losartán potásico 50mg, Olmesartán medoxomilo 40mg, Enalapril 20mg, Ibuprofeno 400mg, Omeprazol 20mg, bolsa de orina, alcohol). Tlf: 04241557291." 
  },
  { name: "Mariangelica Valeriano", document_id: "20501284", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de artículos personales para voluntarias de enfermería en área de farmacia. Tlf: 04242683166." }
];

async function runCleanupAndImport() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. DEDUPLICATE existing records
  // We want to delete duplicate entries that have the same cleaned document_id (if not null) or same name + location + notes
  console.log("Running deduplication...");
  
  // First, get count before deduplication
  const beforeCountRow = db.exec("SELECT COUNT(*) as count FROM persons");
  const countBefore = beforeCountRow[0].values[0][0];

  // We delete records where there is a newer record with the same name/document_id and location/notes
  db.run(`
    DELETE FROM persons
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM persons
      GROUP BY name, COALESCE(document_id, ''), location, notes
    )
  `);

  // Also deduplicate any records where C.I. is the same and they are both 'La Tomita' and stable (like Airan Guerra)
  db.run(`
    DELETE FROM persons
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM persons
      GROUP BY COALESCE(document_id, name), location
      HAVING document_id IS NOT NULL OR COUNT(*) = 1
    )
  `);

  const afterCountRow = db.exec("SELECT COUNT(*) as count FROM persons");
  const countAfter = afterCountRow[0].values[0][0];
  console.log(`Deduplication complete. Removed ${countBefore - countAfter} duplicate rows.`);

  // 2. INSERT new records from actas
  console.log("Importing new actas...");
  const insertStmt = db.prepare(
    "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let insertedCount = 0;
  for (const act of newActs) {
    const cleanedDoc = cleanCI(act.document_id);
    const rawName = cleanedDoc ? `${act.name} ${cleanedDoc}` : act.name;

    // Check if this person and notes already exist to prevent duplicate insertions if run multiple times
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

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Acta import complete!`);
  console.log(`   - Cleaned up duplicate records.`);
  console.log(`   - Imported ${insertedCount} new records from delivery acts.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport().catch(console.error);
