import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('import_acts') && f.endsWith('.mjs'));

const targetNames = [
  "Vicente Ferrer", "Mauro Iriarte", "Jhon Lee", "Oralia Reina", "Adela Perez",
  "Tarcisio Gonzalez", "Belkis Gil", "Luzmilla Mendoza", "Iraida Perez", "Juana Pacheco",
  "Sara Velasquez", "Yudit Diaz", "Luis Vera", "Yurianny Parejo", "Yudania Suarez",
  "Nancy Jimenez", "Meida Reina", "Octavia Silva", "Lucia Meza", "Celestina Sierra",
  "Ada Saavedra", "Nakari Lopez", "Luisina Castro", "Alejandro Ramirez", "Jeanni Rivas",
  "Katherin Cauran", "Wilmer Casauis", "Felician Jackson", "Luis Perez", "Centeno Cova",
  "Joleixy Farfan", "Arianny Lora", "Yulicia Pinto", "Hanyerling Cova", "Yordy Quirpa",
  "Leticia Abrantes", "Pegris Rodriguez", "Gabriela Orta", "Dioner Fajardo", "Mercedes Gomez",
  "Alis de Abolio", "Jose Morales", "Miriam Suarez", "Aidely Monzo", "Centeno de Cova",
  "Candida Prieto", "Lucci Villani", "Lilect Chivico", "Carmen Astudillo", "Ronni Figueroa",
  "Faraj Mora", "Mary Prieto"
];

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  let matchCount = 0;
  const matched = [];
  for (const name of targetNames) {
    if (content.toLowerCase().includes(name.toLowerCase())) {
      matchCount++;
      matched.push(name);
    }
  }
  if (matchCount > 0) {
    console.log(`${file}: matched ${matchCount} target names. Examples: ${matched.slice(0, 5).join(', ')}`);
  }
}
