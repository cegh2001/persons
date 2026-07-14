import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs5 = [
  // --- IMAGE 1 (List starting at 15) ---
  { name: "Vicente Ferrer", document_id: "9990343", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 toallas, 2 gel. XG y G. Damnificado Res. Canter. Ant. x P. Landince. Tlf: 04241244106." },
  { name: "Mauro Iriarte", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal talla XG, 1 toalla, 1 gel (entregado a Mayra Pulido)." },
  { name: "Jhon Lee", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 3 pañales talla XG, 1 toalla, 1 gel (entregado a Mayra Pulido)." },
  { name: "Oralia Reina", document_id: "10866528", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: toalla, M y P, 2 toallas y gel, 2 protector cama. 2 niños de 4 y 8 meses. 1 Sra 84 años." },
  { name: "Adela Perez", document_id: "5890056", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete de pañales G, 1 toalla, gel." },
  { name: "Tarcisio Gonzalez", document_id: "24806444", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete de pañales M, 1 toalla, gel." },
  { name: "Belkis Gil", document_id: "4564820", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal adulto M, 1 toalla, gel." },
  { name: "Luzmilla Mendoza", document_id: "6475032", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 paquetes de pañales (6 meses), 1 toalla, gel." },
  { name: "Iraida Perez", document_id: "6481664", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal adulto, gel y toalla. 68 años." },
  { name: "Juana Pacheco", document_id: "3888353", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal adulto, toalla, gel. 78 años." },
  { name: "Sara Velasquez", document_id: "26223317", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 pañales talla G, toalla y gel." },
  { name: "Yudit Diaz", document_id: "7998753", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal adulto (centro cama), gel y toalla." },

  // --- IMAGE 3 (List starting at 1, date 07/07/26) ---
  { name: "Alexa Jimenez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 6 pañales talla XG o XXG, 1 colchoneta o coche. Tlf: 04241473844." },
  { name: "Leticia Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XL o XG, 1 toalla, 1 gel. 1 año y 9 meses. Tlf: 04129472581." },
  { name: "Luis Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 5 pañales, 1 toalla, 1 gel. 1 mes. Tlf: 04129472581." },
  { name: "Amanda Lazo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla M, 1 toalla, 1 gel. 3 meses. Tlf: 04249384927." },
  { name: "Noah Alessandro", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 9 meses. Tlf: Albani Medina 04142503237." },
  { name: "Rose Suariz", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla M, 1 toalla, 1 gel. 1 año. Tlf: Lisangel Jimenez 04142033021." },
  { name: "Moises Longa", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 3 años. Tlf: Dianitza Avila 04141131233." },
  { name: "Luciano Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 2 toallas, 1 gel. 6 meses. Tlf: Joelia Amora 04120197310." },
  { name: "Jazmin Miranda", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla P, 1 toalla, 1 gel. 4 meses. Tlf: Deivelys Guerrero 04241716143." },
  { name: "Jose Brito", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 pañales adultos M, 1 toalla, 1 gel. Ant. x P. Landince. Tlf: 04123856426." },
  { name: "Sebastian Reyes", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 1 año. Tlf: Génesis Piña 04248753904." },
  { name: "Alanis Moreno", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 8 meses. Tlf: Gleisy Rodriguez 04120774792." },
  { name: "Guillermo Valera", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 2 años. Tlf: Anileidy Iriarte 04147891972." },
  { name: "Raimary Vereguete", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 1 año. Tlf: Genesis Alfonzo 04241345880." },

  // --- IMAGE 4 ---
  { name: "Zoraida Fernandez", document_id: "11639560", location: "Calle del Hambre", is_vulnerable: 0, notes: "Entrega de suministros: 2 colchonetas, alimentos y pañales para una damnificada en Calle del Hambre." },
  { name: "Diácono Manolo", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros colectiva: 1 caja de leche, agua suficiente, electrolitos y 2 bolsas de higiene personal (recibió Diácono Manolo como responsable de La Tomita)." },
  { name: "Hermanas de los Cotolengos", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Medicamentos y suministros entregados: centros de cama, 2 bultos de pañales de bebé talla G, 2 cajas de sardinas, 2 cajas de atunes, electrolitos y agua suficientes, y medicamentos (5 cajas de Losartán de 30, 4 cajas de Loratadina de 10)." },

  // --- IMAGE 5 ---
  { name: "Jose Manuel Machado", document_id: null, location: "Los Corales", is_vulnerable: 0, notes: "Entrega de suministros colectiva: kit de aseo personal para 16 rescatistas del Edo. Bolívar alojados frente al Edificio Mar de Leva en Los Corales (responsable José Manuel Machado). Tlf: 04120239738." },
  { name: "Jaiyer Figueroa", document_id: null, location: "Tanaguarena", is_vulnerable: 0, notes: "Entrega de suministros: 1 colchón para niño de 9 años damnificado frente al club en Tanaguarena." },
  { name: "Celestina De Teixeira", document_id: null, location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: alcohol, agua, electrolitos, algodón." }
];

async function runCleanupAndImport5() {
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
  for (const act of newActs5) {
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

  console.log(`\n✅ Acta import 5 complete!`);
  console.log(`   - Imported ${insertedCount} new records from delivery acts.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport5().catch(console.error);
