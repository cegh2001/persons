import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function fix() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. Delete id: 534 (Leticia Abraham) since it is a duplicate/misspelling of the Leticia Abrantes from sheet 3
  console.log("Deleting Leticia Abraham (id 534)...");
  db.run("DELETE FROM persons WHERE id = 534");

  // 2. Update id: 439 to be the Leticia Abrantes from sheet 4 (without CI)
  console.log("Updating Leticia Abrantes (id 439) with sheet 4 supplies...");
  db.run(
    `UPDATE persons 
     SET name = 'Leticia Abrantes', raw_name = 'Leticia Abrantes', document_id = NULL, 
         location = 'Casco Central', is_vulnerable = 1, 
         notes = 'Entrega de suministros: 1 gel, 1 toallitas.',
         received_supplies = 1, received_medical = 0 
     WHERE id = 439`
  );

  // 3. Insert Leticia Abrantes from sheet 3 (with CI 12868848) as a new record
  console.log("Inserting Leticia Abrantes from sheet 3 (CI 12868848)...");
  db.run(
    `INSERT INTO persons 
     (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) 
     VALUES ('Leticia Abrantes 12868848', 'Leticia Abrantes', '12868848', 'Casco Central', 1, 
             'Entrega de suministros: colchoneta, compotas, paquete pañal. Tlf: 04242403471.', 1, 0)`
  );

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Leticia Abrantes records fixed successfully!");
}

fix().catch(console.error);
