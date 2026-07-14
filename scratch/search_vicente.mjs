import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir);

const namesToSearch = ["Pegris", "Jeanni", "Nancy", "Octavia", "Ada Saavedra", "Nakari Lopez", "Vicente Ferrer", "Mauro Iriarte", "Tarcisio"];

for (const file of files) {
  if (file.endsWith('.mjs')) {
    const filePath = path.join(scratchDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    for (const name of namesToSearch) {
      if (content.toLowerCase().includes(name.toLowerCase())) {
        console.log(`Found "${name}" in: ${file}`);
      }
    }
  }
}
