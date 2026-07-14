import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.endsWith('.mjs'));

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.toLowerCase().includes('omaira')) {
    console.log(`Found "Omaira" in: ${file}`);
  }
}
