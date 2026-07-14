import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newActs6 = [
  // --- IMAGE 1 ---
  { name: "Carlos Torres", document_id: null, location: "Calle La Mar", is_vulnerable: 0, notes: "Medicamentos y suministros entregados: electrólitos, agua y medicinas varias para niños (Rescatista). Tlf: 04145002394." },
  { name: "Manuel Vegas", document_id: null, location: "Los Corales", is_vulnerable: 0, notes: "Medicamentos y suministros entregados: 2 litros de alcohol y 2 cajas de Loratadina (Rescatista en Mar de Leva)." },
  { name: "Yaklin Gonzalez Medina", document_id: "15544526", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 silla de ruedas (45 años de edad, lesión medular, previa autorización de sacerdotes)." },

  // --- IMAGE 2 & 3 (identical page) ---
  { name: "Farin Rojas", document_id: "723013", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 sueros, agua, 2 toallas, 4 electrólitos, 10 pañales. Tlf: 5575240." },
  { name: "Barbara Toledo", document_id: "20161313", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: toalla, gel, compota." },
  { name: "Yosimar Rodriguez", document_id: "6887861", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: electrólitos, toalla." },
  { name: "Carla Funes", document_id: "33423677", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañales G, toalla, electrólito." },
  { name: "Reinaldo Canache", document_id: "18142569", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal M, compota." },
  { name: "Saray Noguera", document_id: "36593501", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal adulto, toalla, gel, electrólitos." },
  { name: "Anabel Piñero", document_id: "19272032", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal, gel, toalla, 4 electrólitos, compotas." },
  { name: "Eloina Peña", document_id: "1093489", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal adulto, gel, toalla, electrólitos, 2 compotas." },
  { name: "Beatriz Fernandes", document_id: "2974147", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 pañal adulto, toalla, gel, compota." },
  { name: "Aranza Lopez", document_id: "13825451", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 pañales G, gel, electrólitos, toalla, pañal adulto." },

  // --- IMAGE 3 (Date 07/07/26) ---
  { name: "Alexa Jimenez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 6 pañales talla XG o XXG, 1 colchoneta o coche. Tlf: 04241473844." },
  { name: "Leticia Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XL o XG, 1 toalla, 1 gel. 1 año y 9 meses. Tlf: 04129472581." },
  { name: "Luis Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 5 pañales, 1 toalla, 1 gel. 1 mes. Tlf: 04129472581." },
  { name: "Amanda Lazo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla M, 1 toalla, 1 gel. 3 meses. Tlf: 04249384927." },
  { name: "Noah Alessandro", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 9 meses. Tlf: Albani Medina 04142503237." },
  { name: "Rose Suariz", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla M, 1 toalla, 1 gel. 1 año. Tlf: Lisangel Jimenez 04142033021." },
  { name: "Moises Longa", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 3 años. Tlf: Dianitza Avila 04141131233." },
  { name: "Luciano Garcia", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 2 toallas, 1 gel. 6 meses. Tlf: Joelia Amora 04120197310." },
  { name: "Jazmin Miranda", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla P, 1 toalla, 1 gel. 4 meses. Tlf: Deivelys Guerrero 04241716143." },
  { name: "Jose Brito", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 pañales adultos M, 1 toalla, 1 gel. Ant. x P. Landince. Tlf: 04123856426." },
  { name: "Sebastian Reyes", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 1 año. Tlf: Génesis Piña 04248753904." },
  { name: "Alanis Moreno", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla XG, 1 toalla, 1 gel. 8 meses. Tlf: Gleisy Rodriguez 04120774792." },
  { name: "Guillermo Valera", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 2 años. Tlf: Anileidy Iriarte 04147891972." },
  { name: "Raimary Vereguete", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal talla G, 1 toalla, 1 gel. 1 año. Tlf: Genesis Alfonzo 04241345880." },

  // --- IMAGE 4 (List starting at 52) ---
  { name: "Pegris Rodriguez", document_id: "28697020", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 pañales, toalla, gel (Recibió Mayra Pulido)." },
  { name: "Gabriela Avila", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: compotas, toalla." },
  { name: "Dionira Fajardo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: gel, toalla." },
  { name: "Mercedes Gomez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: gel, toalla." },
  { name: "Leticia Abrantes", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 gel, 1 toallita." },
  { name: "Iris de Arboleda", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal adulto M (Dormiseco), toalla, gel, 1 toallita." },
  { name: "José Morales", document_id: null, location: "El Corral", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal adulto M (Dormiseco, responsable la Sra. Celestina de Teixeira, sector El Corral)." },
  { name: "Mirian Suarez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 gel, 1 toallita." },
  { name: "Adelys Alonzo", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal (chico), toalla, gel." },
  { name: "Candida Prieto", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 3 pañales chico, toalla, gel." },
  { name: "Abril Soublette", document_id: null, location: "Calle Paez", is_vulnerable: 0, notes: "Entrega de suministros: Centro de Cama 3. Tlf: 04267116442." },
  { name: "Candida Prieto", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal adulto M. Tlf: 04241951973." },
  { name: "Lucci Villani", document_id: null, location: "Calle Vargas", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal adulto M, 1 gel, 1 toallita. Tlf: 04143188387." },
  { name: "Allin", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 gel, 1 toallita." },
  { name: "Lileet Chavez", document_id: "11384138", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: 2 sueros." },
  { name: "Carmen Arangui", document_id: "11635464", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 gel, 1 toallita." },
  { name: "Donni Figueroa", document_id: "13828024", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 2 electrólitos." },
  { name: "Foraiy Mora", document_id: "89201398", location: "El Collao", is_vulnerable: 0, notes: "Entrega de suministros: 2 paquetes de pañales, 2 sueros, 4 compotas." },
  { name: "Mary Iriarte", document_id: "6480160", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: 1 paquete pañal M." },
  { name: "Edilia", document_id: "3608086", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 4 electrólitos, 4 toallitas, 3 suplementos 10cc." },

  // --- IMAGE 5 ---
  { name: "Jeammi Rivas", document_id: "18132180", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: pañal adulto (centro cama), pañales XL y G, toalla." },
  { name: "Wilmer Cassiani", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 1 gel, 1 toallita (11 años)." },
  { name: "Feliciana Jackson", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis Perez", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: Centro cama, 2 pañales adulto." },
  { name: "Mary Duarte", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: Centro cama, gel y toallas." },
  { name: "Jolery Farfan", document_id: "17509774", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: Pañal único, 10 compotas, toallitas, gel." },
  { name: "Arianny Lavan", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 20 compotas, 3 pañales M, toalla, gel." },
  { name: "Iray Flores", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 20 compotas, 2 pañales G, 1 gel, 1 toallita." },
  { name: "Yordy Quiros", document_id: "28404842", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: 20 compotas, 2 pañales XG, toallita." },
  { name: "Leticia Abrantes", document_id: "12865848", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: Colchoneta, pañal. Tlf: 04242403471." },

  // --- ACTAS FROM IMAGE 4 OF THIS BATCH ---
  { name: "Zoraida Fernandez", document_id: "11639560", location: "Calle del Hambre", is_vulnerable: 0, notes: "Entrega de suministros: 2 colchonetas, alimentos y pañales para una damnificada en Calle del Hambre." },
  { name: "Diácono Manolo", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros colectiva: 1 caja de leche, agua suficiente, electrolitos y 2 bolsas de higiene personal (recibió Diácono Manolo como responsable de La Tomita)." },
  { name: "Hermanas de los Cotolengos", document_id: null, location: "Desconocido", is_vulnerable: 0, notes: "Medicamentos y suministros entregados: centros de cama, 2 bultos de pañales de bebé talla G, 2 cajas de sardinas, 2 cajas de atunes, electrolitos y agua suficientes, y medicamentos (5 cajas de Losartán de 30, 4 cajas de Loratadina de 10)." },

  // --- ACTAS FROM IMAGE 5 OF THIS BATCH ---
  { name: "Jose Manuel Machado", document_id: null, location: "Los Corales", is_vulnerable: 0, notes: "Entrega de suministros colectiva: kit de aseo personal para 16 rescatistas del Edo. Bolívar alojados frente al Edificio Mar de Leva en Los Corales (responsable José Manuel Machado). Tlf: 04120239738." },
  { name: "Jaiyer Figueroa", document_id: null, location: "Tanaguarena", is_vulnerable: 0, notes: "Entrega de suministros: 1 colchón para niño de 9 años damnificado frente al club en Tanaguarena." },
  { name: "Celestina De Teixeira", document_id: null, location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: alcohol, agua, electrolitos, algodón." }
];

async function runCleanupAndImport6() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1. INSERT new records from actas
  console.log("Importing new actas...");
  const insertStmt = db.prepare(
    "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let insertedCount = 0;
  for (const act of newActs6) {
    const cleanedDoc = cleanCI(act.document_id);
    const rawName = cleanedDoc ? `${act.name} ${cleanedDoc}` : act.name;

    // Check if this person and notes already exist to prevent duplicate insertions
    const checkStmt = db.prepare("SELECT COUNT(*) as count FROM persons WHERE name = ? AND location = ? AND notes = ?");
    checkStmt.bind([act.name, act.location, act.notes]);
    checkStmt.step();
    const exists = checkStmt.getAsObject().count > 0;
    checkStmt.free();

    if (!exists) {
      insertStmt.run([rawName, act.name, cleanedDoc, act.location, act.is_vulnerable, act.notes]);
      insertedCount++;
    }
  }

  insertStmt.free();

  // 2. DEDUPLICATE database
  console.log("Running deduplication...");
  db.run(`
    DELETE FROM persons
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM persons
      GROUP BY name, COALESCE(document_id, ''), location, notes
    )
  `);

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Acta import 6 complete!`);
  console.log(`   - Imported ${insertedCount} new records.`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

runCleanupAndImport6().catch(console.error);
