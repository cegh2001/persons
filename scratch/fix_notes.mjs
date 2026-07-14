import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function fixNotes() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Correct notes for Myrka Martínez (she received both meds and food combos)
  db.run(`
    UPDATE persons 
    SET notes = 'Entrega de suministros: kit de medicamentos (Med.), kit de alimentos, y kit de bebé. Calle de la Iglesia (realmente es de Tarigua). Tlf: 04241209697.' 
    WHERE name = 'Myrka Martínez'
  `);

  // Correct notes for Nora Fariña (remove the grandfather's medicines that were accidentally merged here)
  db.run(`
    UPDATE persons 
    SET notes = 'Entrega de suministros: kit de comida, 16 kit de artículos personales, 1 kit de artículos de bebé, agua suficiente, enlatados de sardina y atún, 4 botellas de 5L de agua, y 2 kits de higiene. Tlf: 04241557291.' 
    WHERE name = 'Nora Fariña'
  `);

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Corrections complete!`);
  console.log(`   - Fixed Myrka Martínez notes (both meds and combos)`);
  console.log(`   - Fixed Nora Fariña notes (removed grandfather's medications)`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

fixNotes().catch(console.error);
