import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

const mapping = [
  // --- SHEET 1 (Nos. 15 to 26) ---
  {
    dbSearchName: "Vicente Ferrer",
    name: "Vicente Ferrer",
    document_id: "9990343",
    notes: "Entrega de suministros: 2 toallas, 2 gel. Talla XG y G. Damnificado Res. Canton. Ant. x P. Landinez. Tlf: 04241244106."
  },
  {
    dbSearchName: "Mauro Iriarte",
    name: "Mauro Iriarte",
    document_id: null,
    notes: "Entrega de suministros: 1 pañal talla XG, 1 toalla, 1 gel (entregado a Mayra Pulido)."
  },
  {
    dbSearchName: "Jhon Lee",
    name: "Jhon Lee",
    document_id: null,
    notes: "Entrega de suministros: 1 pañal talla XG, 1 toalla, 1 gel (entregado a Mayra Pulido)."
  },
  {
    dbSearchName: "Oralia Reina",
    name: "Oralia Reina",
    document_id: "12866578",
    notes: "Entrega de suministros: Talla M y P, 2 toallas y gel, 2 protector cama. 2 niños de 4 y 8 meses. 1 Sra 84 años."
  },
  {
    dbSearchName: "Adela Perez",
    name: "Adela Perez",
    document_id: "3890056",
    notes: "Entrega de suministros: 1 paquete de pañales G, 1 toalla, gel."
  },
  {
    dbSearchName: "Tarcisio Gonzalez",
    name: "Traisimar Gonzalez",
    document_id: "24806444",
    notes: "Entrega de suministros: 1 paquete de pañales M, 1 toalla, gel."
  },
  {
    dbSearchName: "Belkis Gil",
    name: "Betkis Gil",
    document_id: "4564820",
    notes: "Entrega de suministros: 1 pañal adulto M, 1 toalla, gel."
  },
  {
    dbSearchName: "Luzmilla Mendoza",
    name: "Luzmila Mendoza",
    document_id: "6475032",
    notes: "Entrega de suministros: 2 pañales M (6 meses), 1 toalla y gel."
  },
  {
    dbSearchName: "Iraida Perez",
    name: "Iraffo Perez",
    document_id: "6481664",
    notes: "Entrega de suministros: pañal adulto, gel y toalla. 68 años."
  },
  {
    dbSearchName: "Juana Pacheco",
    name: "Tucur Pacheco",
    document_id: "3888353",
    notes: "Entrega de suministros: pañal adulto, toalla, gel. 78 años."
  },
  {
    dbSearchName: "Sara Velasquez",
    name: "Sara Velásquez",
    document_id: "26223317",
    notes: "Entrega de suministros: 2 pañales talla G, toalla y gel."
  },
  {
    dbSearchName: "Yudit Diaz",
    name: "Judith Sigo",
    document_id: "7558753",
    notes: "Entrega de suministros: Centro cama (2) Pañal adulto, gel y toalla."
  },

  // --- SHEET 2 (Nos. 27 to 38) ---
  {
    name: "Luis Vera",
    document_id: "6007206",
    notes: "Entrega de suministros: Toalla y gel."
  },
  {
    name: "Yurianny Parejo",
    document_id: "28305431",
    notes: "Entrega de suministros: 2 pañales G, 2 pañales adultos, toalla y gel."
  },
  {
    name: "Yudania Suarez",
    document_id: "6482112",
    notes: "Entrega de suministros: 2 pañales G, toalla y gel."
  },
  {
    name: "Nancy Jimenez",
    document_id: null,
    notes: "Entrega de suministros: 2 pañales Secura G, gel, toallas húmedas."
  },
  {
    name: "Meida Reina",
    document_id: "11059440",
    notes: "Entrega de suministros: pañales talla G y M, toalla y gel."
  },
  {
    name: "Octavia Silva",
    document_id: "13828997",
    notes: "Entrega de suministros: 2 pañales P, gel y toalla."
  },
  {
    dbSearchName: "Lucia Meza",
    name: "Lucia Meza",
    document_id: "6491529",
    notes: "Entrega de suministros: (2) Pañales adulto, toalla y gel."
  },
  {
    name: "Celestina Sierra",
    document_id: null,
    notes: "Entrega de suministros: pañales XG, gel y toalla."
  },
  {
    dbSearchName: "Ada Saavedra",
    name: "Ada Saavedra",
    document_id: "6481743",
    notes: "Entrega de suministros: Toalla y Gel, pañales XG."
  },
  {
    name: "Nakari Lopez",
    document_id: "12164170",
    notes: "Entrega de suministros: agua, gel, colchoneta."
  },
  {
    name: "Luisina Carter",
    document_id: "30632585",
    notes: "Entrega de suministros: pañales XG, pañal adulto grande, gel y toalla."
  },
  {
    name: "Alejandro Ramirez",
    document_id: "15779007",
    notes: "Entrega de suministros: Toalla y Gel, pañales adulto."
  },

  // --- SHEET 3 (Nos. 39 to 50) ---
  {
    dbSearchName: "Jeammi Rivas",
    name: "Jeanni Rivas",
    document_id: "18132580",
    notes: "Entrega de suministros: Pañales M, gel, toallas."
  },
  {
    name: "Katherin Cauran",
    document_id: null,
    notes: "Entrega de suministros: pañales M y XG, gel, toallas."
  },
  {
    dbSearchName: "Wilmer Cassiani",
    name: "Wilmer Casauis",
    document_id: null,
    notes: "Entrega de suministros: 1 gel, 2 toallas (11 años)."
  },
  {
    dbSearchName: "Feliciana Jackson",
    name: "Felician Jackson",
    document_id: null,
    notes: "Entrega de suministros: gel, toalla."
  },
  {
    dbSearchName: "Luis Perez",
    name: "Luis Perez",
    document_id: null,
    notes: "Entrega de suministros: Centro cama, 2 pañales adulto."
  },
  {
    dbSearchName: "Mary Duarte",
    name: "Centeno Cova / Mary Duarte",
    document_id: null,
    notes: "Entrega de suministros: gel + toallas."
  },
  {
    dbSearchName: "Jolery Farfan",
    name: "Joleixy Farfan",
    document_id: "17509774",
    notes: "Entrega de suministros: pañal único, 10 compotas, toallas, gel."
  },
  {
    dbSearchName: "Arianny Lavan",
    name: "Arianny Lora",
    document_id: null,
    notes: "Entrega de suministros: 20 compotas, 3 pañales M, toalla, gel."
  },
  {
    dbSearchName: "Iray Flores",
    name: "Yulicia Pinto",
    document_id: null,
    notes: "Entrega de suministros: 2 pañales G, 1 gel, toallas, compotas."
  },
  {
    dbSearchName: "Yordy Quiros",
    name: "Hanyerling Cova",
    document_id: "28404842",
    notes: "Entrega de suministros: compotas, gel, toallas, 2 pañales XG."
  },
  {
    name: "Yordy Quirpa",
    document_id: null,
    notes: "Entrega de suministros: colchoneta, compotas, paquete pañal."
  },
  {
    dbSearchName: "Leticia Abrantes",
    dbSearchCI: "12865848",
    name: "Leticia Abrantes",
    document_id: "12868848",
    notes: "Entrega de suministros: colchoneta, compotas, paquete pañal. Tlf: 04242403471."
  },

  // --- SHEET 4 (Nos. 51 to 69) ---
  {
    dbSearchName: "Pegris Rodriguez",
    name: "Pegris Rodriguez",
    document_id: "28697026",
    notes: "Entrega de suministros: compotas, gel, toallas, pañales XG."
  },
  {
    dbSearchName: "Gabriela Avila",
    name: "Gabriela Orta",
    document_id: null,
    notes: "Entrega de suministros: compotas, gel, toallas."
  },
  {
    dbSearchName: "Dionira Fajardo",
    name: "Dioner Fajardo",
    document_id: null,
    notes: "Entrega de suministros: gel, toalla."
  },
  {
    dbSearchName: "Mercedes Gomez",
    name: "Mercedes Gomez",
    document_id: null,
    notes: "Entrega de suministros: gel, toalla."
  },
  {
    dbSearchName: "Leticia Abrantes",
    dbSearchCI: null,
    name: "Leticia Abrantes",
    document_id: null,
    notes: "Entrega de suministros: 1 gel, 1 toallitas."
  },
  {
    dbSearchName: "Iris de Arboleda",
    name: "Alis de Abolio",
    document_id: null,
    notes: "Entrega de suministros: 1 paquete pañal Suaveyyp Adulto M, gel, toalla, 1 toallitas. sector El Corral / Lomo seco."
  },
  {
    dbSearchName: "José Morales",
    name: "Jose Morales",
    document_id: null,
    notes: "Entrega de suministros: 1 paquete pañal Secura M, adulto M. El Corral."
  },
  {
    dbSearchName: "Mirian Suarez",
    name: "Miriam Suarez",
    document_id: null,
    notes: "Entrega de suministros: 1 gel, 1 toallitas."
  },
  {
    dbSearchName: "Adelys Alonzo",
    name: "Aidely Monzo",
    document_id: null,
    notes: "Entrega de suministros: 1 paquete pañal chico, pañal XG, 1 toallitas."
  },
  {
    dbSearchName: "Abril Soublette",
    name: "Centeno de Cova",
    document_id: null,
    notes: "Entrega de suministros: Centro de Cama 3. Tlf: 04267116442. Calle Paez / El Corral."
  },
  {
    dbSearchName: "Candida Prieto",
    name: "Candida Prieto",
    document_id: null,
    notes: "Entrega de suministros: 1 paquete pañal adulto. Tlf: 04241951973. Calle Vargas / El Corral."
  },
  {
    dbSearchName: "Lucci Villani",
    name: "Lucci Villani",
    document_id: null,
    notes: "Entrega de suministros: 1 paquete pañal adulto, 1 gel, 1 toallitas. Tlf: 04143188387. Calle Vargas."
  },
  {
    dbSearchName: "Allin",
    name: "Allin",
    document_id: null,
    notes: "Entrega de suministros: 1 gel, 1 toallitas."
  },
  {
    dbSearchName: "Lileet Chavez",
    name: "Lilect Chivico",
    document_id: "11384138",
    notes: "Entrega de suministros: 2 sueros, gel, toallas. 27 de Enero."
  },
  {
    dbSearchName: "Carmen Arangui",
    name: "Carmen Astudillo",
    document_id: "11035464",
    notes: "Entrega de suministros: 1 gel, 1 toallita."
  },
  {
    dbSearchName: "Donni Figueroa",
    name: "Ronni Figueroa",
    document_id: "13828024",
    notes: "Entrega de suministros: 2 electrolit, gel, toallas."
  },
  {
    dbSearchName: "Foraiy Mora",
    name: "Faraj Mora",
    document_id: "8201398",
    notes: "Entrega de suministros: 2 paquetes de pañales, 2 sueros, gel, 4 compotas."
  },
  {
    dbSearchName: "Mary Iriarte",
    name: "Mary Prieto",
    document_id: "6480160",
    notes: "Entrega de suministros: 1 paquete pañal M, electrolitos, 4 toallitas, 3 gel, 10 compotas. Av. 5 de Julio / Calle El Municipal / 27 de Julio."
  },
  {
    dbSearchName: "Edilia",
    name: "Edilia",
    document_id: "3608086",
    notes: "Entrega de suministros: 4 electrolitos, 4 toallitas, 3 gel, 10 compotas."
  }
];

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log("Registering/Updating users for location 'Casco Central'...");

  for (const person of mapping) {
    let personId = null;

    // Search logic:
    // 1. By dbSearchName and dbSearchCI (if applicable)
    if (person.dbSearchName) {
      let query = "SELECT id FROM persons WHERE name = ?";
      let params = [person.dbSearchName];
      if (person.dbSearchCI !== undefined) {
        query += " AND (document_id = ? OR (document_id IS NULL AND ? IS NULL))";
        params.push(person.dbSearchCI, person.dbSearchCI);
      }
      
      const stmt = db.prepare(query);
      stmt.bind(params);
      if (stmt.step()) {
        personId = stmt.getAsObject().id;
      }
      stmt.free();
    }

    // 2. Fallback: by document_id if not null
    if (!personId && person.document_id) {
      const stmt = db.prepare("SELECT id FROM persons WHERE document_id = ?");
      stmt.bind([person.document_id]);
      if (stmt.step()) {
        personId = stmt.getAsObject().id;
      }
      stmt.free();
    }

    // 3. Fallback: by name
    if (!personId) {
      const stmt = db.prepare("SELECT id FROM persons WHERE name = ?");
      stmt.bind([person.name]);
      if (stmt.step()) {
        personId = stmt.getAsObject().id;
      }
      stmt.free();
    }

    const rawName = person.document_id ? `${person.name} ${person.document_id}` : person.name;

    if (personId) {
      // Update
      console.log(`Updating user: ${person.name} (id: ${personId})`);
      db.run(
        `UPDATE persons 
         SET name = ?, raw_name = ?, document_id = ?, location = 'Casco Central', 
             is_vulnerable = 1, notes = ?, received_supplies = 1, received_medical = 0 
         WHERE id = ?`,
        [person.name, rawName, person.document_id, person.notes, personId]
      );

      // Clean up duplicates
      if (person.document_id) {
        db.run(
          "DELETE FROM persons WHERE document_id = ? AND id != ?",
          [person.document_id, personId]
        );
      } else {
        db.run(
          "DELETE FROM persons WHERE name = ? AND id != ?",
          [person.name, personId]
        );
      }
    } else {
      // Insert
      console.log(`Inserting new user: ${person.name}`);
      db.run(
        `INSERT INTO persons 
         (raw_name, name, document_id, location, is_vulnerable, notes, received_supplies, received_medical) 
         VALUES (?, ?, ?, 'Casco Central', 1, ?, 1, 0)`,
        [rawName, person.name, person.document_id, person.notes]
      );
    }
  }

  // Export DB
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("Database successfully updated!");
}

run().catch(console.error);
