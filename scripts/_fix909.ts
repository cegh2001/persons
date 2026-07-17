import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
const envPath = resolve('.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); if (eq === -1) continue;
    const k = t.slice(0,eq).trim(); let v = t.slice(eq+1).trim();
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    process.env[k]=v;
  }
}
async function main() {
  const db = createClient({url:process.env.persons_TURSO_DATABASE_URL!,authToken:process.env.persons_TURSO_AUTH_TOKEN!});
  // Delete the bad collective delivery for #909
  await db.execute("DELETE FROM delivery_items WHERE delivery_id=882");
  await db.execute("DELETE FROM deliveries WHERE id=882");
  console.log('Deleted bad delivery #882');
}
main();
