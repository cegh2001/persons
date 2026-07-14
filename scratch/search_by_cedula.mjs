import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const searchList = [
  { label: "1. Javier Fernandez", document_id: "13223779" },
  { label: "2. Ismael Alvarez", document_id: "13777451" },
  { label: "3. Ines Morales", document_id: "6489879" },
  { label: "4. Maria Bolivar", document_id: "10254676" },
  { label: "6. Awilda Yanez", document_id: "10575595" },
  { label: "7. Camila Trias", document_id: "6480073" },
  { label: "8. Alexis Avila", document_id: "4114668" },
  { label: "9. Thais Mendoza", document_id: "6485633" },
  { label: "10. Amanda Maitin", document_id: "25589803" },
  { label: "11. Candelaria Rodriguez", document_id: "4557318" },
  { label: "12. Yorashara Jara", document_id: "10547541" },
  { label: "13. Mery Canache", document_id: "14313813" },
  { label: "14. Genesis Rondon", document_id: "26180163" }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Searching by exact and cleaned document_id...");
  for (const item of searchList) {
    const stmt = db.prepare("SELECT * FROM persons WHERE document_id = ? OR document_id = ?");
    // Try exact and also check if there is a dot-removed version
    const cleanId = item.document_id;
    stmt.bind([cleanId, cleanId]);
    
    let found = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`MATCH for ${item.label} (${item.document_id}): id=${row.id}, name="${row.name}", location="${row.location}", notes="${row.notes}"`);
      found = true;
    }
    stmt.free();
    
    if (!found) {
      // Fuzzy search on name
      const firstName = item.label.split(". ")[1].split(" ")[0];
      const stmtName = db.prepare("SELECT * FROM persons WHERE name LIKE ?");
      stmtName.bind([`%${firstName}%`]);
      const matches = [];
      while (stmtName.step()) {
        const row = stmtName.getAsObject();
        matches.push(`id=${row.id} "${row.name}" (${row.document_id}) in ${row.location}`);
      }
      stmtName.free();
      console.log(`NO EXACT MATCH for ${item.label} (${item.document_id}). Fuzzy name matches: ${matches.slice(0, 3).join(", ")}`);
    }
  }
  
  db.close();
}

run().catch(console.error);
