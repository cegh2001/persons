import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function search() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const names = [
    "Richar Rodriges", "Omaira Barrera", "Luis Carriel", "Nereida Rada",
    "Expedito Subero", "Leonardo Brumers", "Hilaria Liendo", "Leidy Velasquez",
    "Rafael Barreto", "Ernesto Jose", "Edgar Antonio", "Jose Antonio Lopez",
    "Mariana Chavez", "Mirtha Revenga", "Luz espinoza", "Glenda Castellano",
    "Alonzo Luis", "Jesus Perez", "Mirian Castillo", "Arelis Castillo"
  ];

  console.log("Searching batch 3 names in database...");
  for (const name of names) {
    const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE ? OR raw_name LIKE ?");
    const queryStr = `%${name.split(' ')[0]}%`; // search by first name
    stmt.bind([queryStr, queryStr]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.name.toLowerCase().includes(name.split(' ')[0].toLowerCase())) {
        console.log(`MATCH for "${name}": id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}"`);
      }
    }
    stmt.free();
  }
  db.close();
}

search().catch(console.error);
