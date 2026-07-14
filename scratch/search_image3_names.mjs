import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('import_acts') && f.endsWith('.mjs'));

const targets = [
  "Luis Vera", "Yurianny Parejo", "Yudania Suarez", "Nancy Jimenez", "Meida Reina",
  "Octavia Silva", "Lucia Meza", "Celestina Sierra", "Ada Saavedra", "Nakari Lopez",
  "Luisina Carter", "Alejandro Ramirez"
];

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const matched = [];
  for (const name of targets) {
    if (content.toLowerCase().includes(name.toLowerCase())) {
      matched.push(name);
    }
  }
  if (matched.length > 0) {
    console.log(`${file}: matched [${matched.join(', ')}]`);
  }
}
