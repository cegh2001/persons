import initSqlJs from "sql.js";
import fs from "fs";

const DB_PATH = "persons.db";

// Helper to clean CI numbers (remove dots and spaces)
function cleanCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/[\.\s]/g, "");
}

const newPeople = [
  // --- IMAGE 1 ---
  { name: "Luis G. Palmero", document_id: "8179131", location: "Desconocido", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Airan Guerra", document_id: "26763133", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosbeltt Escalona", document_id: "16308877", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- IMAGE 2 ---
  { name: "Grisela Flores", document_id: "3365076", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Hipólito Montiel", document_id: "3892883", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Neri López", document_id: "4120828", location: "Plaza la Merced", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Carlos L. Delgado", document_id: "3364146", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Cesar Correa", document_id: "24804613", location: "Tarituca", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Basilio Iriarte", document_id: "5576027", location: "Boca Tanque", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Douglas Zorrilla", document_id: "12864205", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Airan Guerra", document_id: "26763133", location: "La Tomita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosana Tovar", document_id: "10182213", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rafael Alvarez", document_id: "6466747", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Belkys Suarez", document_id: "7995274", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Luis E. Chavez", document_id: "5578375", location: "Calle Real", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Wilfredo Vicent", document_id: "9996751", location: "Las Palmeras", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Ana Contreras", document_id: "6184714", location: "La Juanita", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "María Mosqueda", document_id: "16505355", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "José Escobar", document_id: "8176978", location: "El Caimito", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Selena Solórzano", document_id: "9996686", location: "Casco Central", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "José Brito", document_id: "6480405", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Javier Hernández", document_id: "6467095", location: "27 de Julio", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Josmar Regalado", document_id: "12166091", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Marta Almeida", document_id: "8772301", location: "Frente Marcal", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Rosbett Escalona", document_id: "16308877", location: "Tarigua", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- IMAGE 3 ---
  { name: "Jose Consales", document_id: "10579602", location: "Caribe", is_vulnerable: 0, notes: "Medicamentos entregados: Losartan 50mg, Buscapina caps, Omeprazol / Aseo personal." },
  { name: "Nelida Anzola", document_id: "5803169", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico, Acetaminofén." },
  { name: "Anais Bello", document_id: "13041175", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico, Diclofenac Potásico (gel)." },
  { name: "Carlos Lazo", document_id: null, location: "Palmar Este", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico." },
  { name: "Thais González", document_id: "10581790", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Celestina Gómez", document_id: null, location: "San Julian", is_vulnerable: 0, notes: "Medicamentos entregados: Nitrofurazona, Nifedipino, Nifedipino 20mg, Levotiroxina 100mcg." },
  { name: "Saraima Perez", document_id: "18725126", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Acetaminofén." },
  { name: "Luis Ramirez", document_id: "3365315", location: "Blanquita Perez", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },
  { name: "Marina Gil", document_id: "4856614", location: "Casco Central", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico." },
  { name: "Lenis Guerrero", document_id: "6497763", location: "Caraballeda", is_vulnerable: 0, notes: "Medicamentos entregados: Acetaminofén." },
  { name: "Luz Aguilar", document_id: "22206979", location: "San Julian", is_vulnerable: 0, notes: "Medicamentos entregados: Cetirizina, Loratadina." },
  { name: "Mireya Mosquera", document_id: "11629000", location: "La Tomita", is_vulnerable: 0, notes: "Medicamentos entregados: Levotiroxina, Diclofenac Potásico." },
  { name: "Atanacio Mosquera", document_id: "6241065", location: "La Tomita", is_vulnerable: 0, notes: "Medicamentos entregados: Acetaminofén." },
  { name: "Victor Febres", document_id: "11056633", location: "Caraballeda", is_vulnerable: 0, notes: "Medicamentos entregados: Ivermectina (spray)." },
  { name: "Yolibel Lopez", document_id: "20190332", location: "Corapal", is_vulnerable: 0, notes: "Medicamentos entregados: Keracimoten (Jarabe), Ibuprofeno (Ped), Axtarfon Jbe." },
  { name: "Maria Rondón", document_id: "19201511", location: "Caribe", is_vulnerable: 0, notes: "Medicamentos entregados: Acetaminofén, Tobramicina (Gotas Oftálmicas)." },
  { name: "Fabiola Romero", document_id: null, location: "La Tomita", is_vulnerable: 0, notes: "Medicamentos entregados: Ibuprofeno (Ped), Acetaminofén (Ped), Desloratadina (Ped)." },
  { name: "Neila Montiel", document_id: "16503815", location: "San Julian", is_vulnerable: 0, notes: "Entrega de suministros: kit de comida, agua y aseo personal." },

  // --- IMAGE 4 ---
  { name: "Analis Esmoris", document_id: "4578607", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Bisoprolol." },
  { name: "Cleo Carrillo", document_id: "13043541", location: "El Caimito", is_vulnerable: 0, notes: "Medicamentos entregados: Bisoprolol 2.5mg, Candesartán 16mg." },
  { name: "Javier González", document_id: "6887901", location: "Punto Fijo", is_vulnerable: 0, notes: "Medicamentos entregados: Rivaroxabán." },
  { name: "Yadira Sojo", document_id: "7998793", location: "Tarigua", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac." },
  { name: "Belkis Diaz", document_id: "6485855", location: "La Tomita", is_vulnerable: 0, notes: "Medicamentos entregados: Amlodipina, Diclofenac (gel), Levotiroxina, Ketoprofeno, Loratadina (Ped)." },
  { name: "Aisha Correa", document_id: "28458165", location: "Tarigua", is_vulnerable: 0, notes: "Medicamentos entregados: Ibuprofeno, Amoxicilina Ped." },
  { name: "Rita Acosta", document_id: "6476079", location: "Las Tucacas", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico." },
  { name: "Camila Trias", document_id: "6480093", location: "El Collao", is_vulnerable: 0, notes: "Medicamentos entregados: Losartán." },
  { name: "Olga Conus", document_id: "6093062", location: "Tarigua", is_vulnerable: 0, notes: "Medicamentos entregados: Amlodipina, Eutirox." },
  { name: "Olga Moreno", document_id: "21010711", location: "Tarigua", is_vulnerable: 0, notes: "Medicamentos entregados: Nifedipino, Aspirina." },
  { name: "Jonathan Chavez", document_id: "15544425", location: "San Julian", is_vulnerable: 0, notes: "Medicamentos entregados: Cetirizina, Pañales RN." },
  { name: "Nancy Hernández", document_id: "11064379", location: "Caraballeda", is_vulnerable: 0, notes: "Medicamentos entregados: Loratadina, Alcohol." },
  { name: "Perez José G.", document_id: "10579602", location: "27 de Julio", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico, Buscapina tabs, Metoclopramida." },
  { name: "Nelida Pineda", document_id: "11060858", location: "Caraballeda", is_vulnerable: 0, notes: "Medicamentos entregados: Diclofenac Potásico." },
  { name: "Pedro Guarepe", document_id: null, location: "27 de Julio", is_vulnerable: 0, notes: "Medicamentos entregados: Loratadina, Paracetamol." }
];

async function importImages() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ DB file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const insertStmt = db.prepare(
    "INSERT INTO persons (raw_name, name, document_id, location, is_vulnerable, notes) VALUES (?, ?, ?, ?, ?, ?)"
  );

  let insertedCount = 0;

  for (const person of newPeople) {
    const cleanedDoc = cleanCI(person.document_id);
    const rawName = cleanedDoc ? `${person.name} ${cleanedDoc}` : person.name;
    
    insertStmt.run([rawName, person.name, cleanedDoc, person.location, person.is_vulnerable, person.notes]);
    insertedCount++;
  }

  insertStmt.free();

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`\n✅ Image import complete!`);
  console.log(`   - Imported ${insertedCount} new records`);
  console.log(`   - Database updated at: ${DB_PATH}`);
}

importImages().catch(console.error);
