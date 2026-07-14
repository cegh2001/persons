import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('import_acts') && f.endsWith('.mjs'));

const names = [
  "Melvis Alvarez", "Yovanna Alvarez", "Carlos Iriarte", "Jhon De Silva",
  "Maximo Piñero", "Juan Guerrero", "Ada Allende", "Yibisei Rodriguez",
  "Farin Rojas", "Barbara Toledo"
];

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const matched = [];
  for (const name of names) {
    if (content.toLowerCase().includes(name.toLowerCase())) {
      matched.push(name);
    }
  }
  if (matched.length > 0) {
    console.log(`${file}: matched [${matched.join(', ')}]`);
  }
}
