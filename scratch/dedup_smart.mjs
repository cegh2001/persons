import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\b(de|del|la|las|el|los|y|flia|flia\.|familia)\b/g, "") // Remove connectors and family prefixes
    .replace(/[^a-z0-9]/g, ""); // Keep only letters and numbers
}

async function smartDedup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Load all persons
  const rows = [];
  const stmt = db.prepare("SELECT * FROM persons");
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`Analyzing ${rows.length} records for duplicates...`);

  // Group by location
  const byLocation = {};
  for (const row of rows) {
    if (!byLocation[row.location]) {
      byLocation[row.location] = [];
    }
    byLocation[row.location].push(row);
  }

  const toDelete = new Set();
  const merges = [];

  for (const [loc, people] of Object.entries(byLocation)) {
    const visited = new Set();

    for (let i = 0; i < people.length; i++) {
      const p1 = people[i];
      if (toDelete.has(p1.id)) continue;

      const norm1 = normalizeName(p1.name);

      for (let j = i + 1; j < people.length; j++) {
        const p2 = people[j];
        if (toDelete.has(p2.id)) continue;

        const norm2 = normalizeName(p2.name);

        // Check if normalized names are identical
        const nameMatch = norm1 === norm2;
        
        // Check document ID match (both equal OR one is null and names match)
        const docMatch = p1.document_id === p2.document_id || 
                         (p1.document_id === null && p2.document_id === null && nameMatch) ||
                         (p1.document_id !== null && p2.document_id === null && nameMatch) ||
                         (p1.document_id === null && p2.document_id !== null && nameMatch);

        if (nameMatch && docMatch) {
          // Determine which one to keep
          let keep = p1;
          let remove = p2;

          // If p2 has document_id but p1 doesn't, keep p2
          if (p2.document_id && !p1.document_id) {
            keep = p2;
            remove = p1;
          }
          // If p2 has longer notes, keep p2
          else if ((p2.notes || "").length > (p1.notes || "").length) {
            keep = p2;
            remove = p1;
          }

          toDelete.add(remove.id);
          merges.push({
            kept: keep,
            removed: remove
          });
        }
      }
    }
  }

  if (toDelete.size > 0) {
    console.log(`\nFound ${toDelete.size} duplicates to merge:`);
    const deleteStmt = db.prepare("DELETE FROM persons WHERE id = ?");

    for (const merge of merges) {
      console.log(` - Merging [${merge.removed.name}] (ID: ${merge.removed.id}) -> [${merge.kept.name}] (ID: ${merge.kept.id}) in sector [${merge.kept.location}]`);
      deleteStmt.run([merge.removed.id]);
    }
    deleteStmt.free();

    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log(`\n✅ Database successfully updated. Merged ${toDelete.size} records.`);
  } else {
    console.log("\nNo duplicates found.");
  }

  db.close();
}

smartDedup().catch(console.error);
