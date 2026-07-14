import fs from 'fs';
import path from 'path';

const scratchDir = 'c:/Users/Lenovo/Documents/GitHub/persons/scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('import_acts') && f.endsWith('.mjs'));

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/(const\s+\w+\s*=\s*\[[\s\S]*?\];)/);
  if (match) {
    const arrayStr = match[1];
    // Evaluate or parse the array
    // Since it's JS, we can parse it roughly or use a simple regex to get names
    const names = [];
    const nameRegex = /name:\s*"([^"]+)"/g;
    let m;
    while ((m = nameRegex.exec(arrayStr)) !== null) {
      names.push(m[1]);
    }
    console.log(`\n=== ${file} (${names.length} items) ===`);
    console.log(names.slice(0, 10).join(', ') + (names.length > 10 ? ' ... and ' + (names.length - 10) + ' more' : ''));
    // Let's also check if "Pegris" or "Vicente" are in this file
    if (names.some(n => n.toLowerCase().includes('pegris'))) {
      console.log(`  -> Contains "Pegris"`);
    }
    if (names.some(n => n.toLowerCase().includes('vicente'))) {
      console.log(`  -> Contains "Vicente"`);
    }
  }
}
