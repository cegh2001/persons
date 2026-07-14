import { createClient } from "@libsql/client";
import xlsx from "xlsx";
import fs from "fs";

const DB_PATH = "persons.db";
const EXCEL_PATH = "Bolsas entregadas.xlsx";

async function seed() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Archivo Excel no encontrado en la ruta: ${EXCEL_PATH}`);
    process.exit(1);
  }

  console.log(`Reading Excel file: ${EXCEL_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Rows found: ${rows.length}`);

  // Create client for local db file
  const client = createClient({
    url: `file:${DB_PATH}`,
  });

  // Create table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS persons (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name      TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      document_id   TEXT,
      location      TEXT    NOT NULL,
      is_vulnerable INTEGER NOT NULL DEFAULT 0,
      notes         TEXT    NOT NULL DEFAULT '',
      received_supplies INTEGER NOT NULL DEFAULT 1,
      received_medical  INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_document_id ON persons(document_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_location ON persons(location)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_vulnerable ON persons(is_vulnerable)");
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_supplies ON persons(received_supplies)");
  } catch (e) {}
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS idx_persons_received_medical ON persons(received_medical)");
  } catch (e) {}

  await client.execute("DELETE FROM persons");

  let currentLoc = "Desconocido";
  let count = 0;
  const insertStatements = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const colA = row[0]; // Person
    const colD = row[3]; // Location

    if (colD && String(colD).trim() !== "") {
      let tempLoc = String(colD).trim();
      
      // Fix typos and formatting
      if (tempLoc.toLowerCase() === "callado") {
        currentLoc = "El Collao";
      } else {
        currentLoc = tempLoc;
      }
    }

    if (colA && String(colA).trim() !== "") {
      const rawName = String(colA).trim();

      // Skip table headers
      if (rawName.toLowerCase() === "nombre y documento" || rawName.toLowerCase() === "nombre") {
        continue;
      }

      // Regex to split Name and Document (number at the end)
      const numMatch = rawName.match(/(.+?)\s+(\d+)$/);
      let name = rawName;
      let docId = null;

      if (numMatch) {
        name = numMatch[1].trim();
        docId = numMatch[2].trim();
      }

      const isVulnerable = 1;
      const notes = "Entrega de suministros: agua, electrolit, pañales, kit de aseo personal, etc.";
      const receivedSupplies = 1;
      const receivedMedical = 0;

      insertStatements.push({
        sql: "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [rawName, name, docId, currentLoc, isVulnerable, notes, receivedSupplies, receivedMedical]
      });
      count++;
    }
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < insertStatements.length; i += batchSize) {
    const batch = insertStatements.slice(i, i + batchSize);
    await client.batch(batch, "write");
  }

  client.close();

  console.log(`\n✅ Seeding complete!`);
  console.log(`   - Imported ${count} persons`);
  console.log(`   - Marked all as vulnerable`);
  console.log(`   - Added default notes for sismo supplies delivery`);
  console.log(`   - Fixed "Callado" -> "El Collao"`);
  console.log(`   - Database saved to: ${DB_PATH}`);
}

seed().catch(console.error);
