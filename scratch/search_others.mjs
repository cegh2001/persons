import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.endsWith('.mjs'));

const searchNames = ["expedito", "brumers", "origüen", "arrieche", "revenga"];

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const name of searchNames) {
    if (content.toLowerCase().includes(name)) {
      console.log(`Found "${name}" in: ${file}`);
    }
  }
}
