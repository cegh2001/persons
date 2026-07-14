import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const newActs7 = [
  "Ada Allende", "Yibisei Rodriguez", "Gladys Poleo", "Libert Gil", "José Prada",
  "Thais Mendoza", "Angelica Alegria", "Iris De Abeli", "Carmen Olavarrieta", "Celia Gil",
  "Luicelis Ortega", "Fabiola Ramos", "Jesús Rivas", "Domingo De Paz", "Hilda Mar Polco",
  "Eurisdes Vilardia", "Maximo Piñero", "Juan Guerrero", "Richard Rodriguez", "Jose Rocket",
  "Dariamila Guzman", "Pedro Rodriguez", "Hidelis Longa", "Vladiney Suarez", "Moraima Polanco",
  "Alexis Avila", "Libeth Perez", "Jose Mendez", "Lis Castro", "Rafael Alvarez",
  "Yoleida Davila", "Jose Corre", "Nelly Rodriguez", "Luis Manrique", "Jaime Freitas",
  "Yudith Sojo", "Rogelis Anton", "Carlos Uriarte", "Jhon De Silva", "Mirian Castillo",
  "Apelis Castillo", "Arikalka Nato", "Luicelis Izquiel", "Maritza Marquez", "Jaon Iriarte",
  "Luis Alvarez", "Aquiles Blanado", "Elizabeth Belisario", "Nelida Rodriguez", "Gonzales Borges",
  "Vitzoribel Salazar", "Yaritza Avila", "Omar Barrero", "Nelrys Alvares", "Yohanna Alvarez",
  "Alberto Vega", "Jesús Hernandez", "Valentina Sanchez", "Luis Eduardo Ramos", "José Castillo",
  "Adela Perez", "Gilberto Gonzales", "Luis Delgado", "Gleidys Gutierrez", "Carlos Navarro",
  "Oralia Reina", "Neida Reina", "Erwin Becerra", "Corina Ferrer", "Esegiol Mandilla",
  "Gustavo Quintero", "José Silva", "Joao Arostegui", "Nella Mery", "Orlando David"
];

async function check() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Status of acts 7 names in DB:");
  for (const name of newActs7) {
    const stmt = db.prepare("SELECT * FROM persons WHERE name LIKE ?");
    stmt.bind([name]);
    let found = false;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`MATCH: id=${row.id}, name="${row.name}", document_id="${row.document_id}", location="${row.location}", is_vulnerable=${row.is_vulnerable}`);
      found = true;
    }
    stmt.free();
    if (!found) {
      console.log(`NOT FOUND: "${name}"`);
    }
  }
  db.close();
}

check().catch(console.error);
