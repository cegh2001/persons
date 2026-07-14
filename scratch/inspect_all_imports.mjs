import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('import_acts') && f.endsWith('.mjs'));

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  // Match any array definition like const newActsX = [ ... ]
  const match = content.match(/(const\s+\w+\s*=\s*\[[\s\S]*?\];)/);
  if (match) {
    const arrayStr = match[1];
    // Find how many items it has by counting '{'
    const itemCount = (arrayStr.match(/\{/g) || []).length;
    // Get the first item name
    const firstNameMatch = arrayStr.match(/name:\s*"([^"]+)"/);
    const firstName = firstNameMatch ? firstNameMatch[1] : 'unknown';
    console.log(`${file}: has ${itemCount} items, first name is "${firstName}"`);
  } else {
    console.log(`${file}: no array found`);
  }
}
