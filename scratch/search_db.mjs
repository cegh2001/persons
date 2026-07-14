import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

async function search() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("DB does not exist");
    return;
  }
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  
  const names = [
    "Vicente Ferrer", "Mauro Iriarte", "Jhon Lee", "Oralia Reina", "Adela Perez",
    "Tarcisio Gonzalez", "Belkis Gil", "Luzmilla Mendoza", "Iraida Perez", "Juana Pacheco",
    "Sara Velasquez", "Yudit Diaz", "Luis Vera", "Yurianny Parejo", "Yudania Suarez",
    "Nancy Jimenez", "Meida Reina", "Octavia Silva", "Lucia Meza", "Celestina Sierra",
    "Ada Saavedra", "Nakari Lopez", "Luisina Carter", "Alejandro Ramirez", "Jeanni Rivas",
    "Katherin Cauran", "Wilmer Cassiani", "Feliciana Jackson", "Luis Perez", "Centeno Cova",
    "Joleixy Farfan", "Arianny Lora", "Yulicia Pinto", "Hanyerling Cova", "Yordy Quirpa",
    "Leticia Abrantes", "Pegris Rodriguez", "Gabriela Orta", "Dioner Fajardo", "Mercedes Gomez",
    "Alis de Abolio", "Jose Morales", "Miriam Suarez", "Aidely Monzo", "Centeno de Cova",
    "Candida Prieto", "Lucci Villani", "Lilect Chivico", "Carmen Astudillo", "Ronni Figueroa",
    "Faraj Mora", "Mary Prieto"
  ];

  console.log("Searching names in persons table...");
  const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE ?");
  for (const name of names) {
    stmt.bind([`%${name}%`]);
    let found = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`FOUND: id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}"`);
      found = true;
    }
  }
  stmt.free();
  db.close();
}

search().catch(console.error);
