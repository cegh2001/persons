import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const list = [
  { num: 21, name: "Mizoribel Solorzano", document_id: "10531726" },
  { num: 22, name: "Yasmin Pino", document_id: "20783452" },
  { num: 23, name: "Gabriel Noya", document_id: "22565052" },
  { num: 24, name: "Henry Gutierrez", document_id: "5400914" },
  { num: 25, name: "Marta Almeida", document_id: "8772301" },
  { num: 26, name: "Luis Ramos", document_id: "10580464" },
  { num: 27, name: "Ruben Ceballos", document_id: "24180505" },
  { num: 28, name: "Yesica Hernandez", document_id: "16724942" },
  { num: 29, name: "Rowely Suarez", document_id: "25574046" },
  { num: 30, name: "Yoledys Silva", document_id: "17710084" },
  { num: 31, name: "Diomar Fajardo", document_id: "17966348" },
  { num: 32, name: "Genesis Marquina", document_id: "28314103" },
  { num: 33, name: "Henry Aguilar", document_id: "5091703" },
  { num: 34, name: "Jose Mayora", document_id: "11639422" },
  { num: 35, name: "Jesus Rodriguez", document_id: "10584946" },
  { num: 36, name: "Omar Almeida", document_id: "11634164" },
  { num: 37, name: "Luis Manrique", document_id: "4676306" },
  { num: 38, name: "Maria Alcila", document_id: "13225063" },
  { num: 39, name: "Viviana Borges", document_id: "19915393" },
  { num: 40, name: "Cesar Bulmez", document_id: "1453629" },
  { num: 41, name: "Fernando Mesa", document_id: "4562209" },
  { num: 42, name: "Florencio Iriarte", document_id: "6468942" },
  { num: 43, name: "Maria Chavez", document_id: "6484040" },
  { num: 44, name: "Raquel Garcia", document_id: "17958255" }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Searching new sheet (21 to 44) in database...");
  for (const item of list) {
    const stmt = db.prepare("SELECT * FROM persons WHERE document_id = ?");
    stmt.bind([item.document_id]);
    let found = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`MATCH #${item.num} (${item.name}): id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}", notes="${row.notes}"`);
      found = true;
    }
    stmt.free();

    if (!found) {
      // Fuzzy check by name
      const nameParts = item.name.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts[1] || "";
      const stmt2 = db.prepare("SELECT * FROM persons WHERE name LIKE ?");
      stmt2.bind([`%${firstName}%${lastName}%`]);
      let fuzzyMatches = [];
      while (stmt2.step()) {
        const row = stmt2.getAsObject();
        fuzzyMatches.push(`id=${row.id} "${row.name}" (${row.document_id}) in ${row.location}`);
      }
      stmt2.free();
      if (fuzzyMatches.length > 0) {
        console.log(`NO EXACT MATCH for #${item.num} (${item.name}, ${item.document_id}). Fuzzy matches: ${fuzzyMatches.join(", ")}`);
      } else {
        console.log(`NO MATCH AT ALL for #${item.num} (${item.name}, ${item.document_id})`);
      }
    }
  }

  db.close();
}

run().catch(console.error);
