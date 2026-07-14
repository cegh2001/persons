import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function search() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const names = [
    "Nereida Rada", "Expedito Subero", "Leonardo Brumers", "Ernesto Jose",
    "Edgar Antonio", "Mariana Chavez", "Mirtha Revenga", "Luz espinoza",
    "Glenda Castellano", "Alonzo Luis", "Willian Galarraga", "Esther Perez",
    "Maria Ferrer", "Abraham Isaac"
  ];

  console.log("Searching batch 3 names in database...");
  for (const name of names) {
    const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE ?");
    stmt.bind([`%${name}%`]);
    let found = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`FOUND: id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}"`);
      found = true;
    }
    stmt.free();
  }
  db.close();
}

search().catch(console.error);
