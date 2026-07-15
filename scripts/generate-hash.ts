/**
 * Generates PBKDF2-SHA512 password hashes compatible with the auth module.
 * 
 * Usage:
 *   npx tsx scripts/generate-hash.ts
 * 
 * The output format is "salt:hexHash" and can be used directly in the
 * AUTH_USERS environment variable.
 */

import crypto from "crypto";

const SALT_BYTES = 16;
const ITERATIONS = 100_000;
const KEY_LEN = 64;
const DIGEST = "sha512";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

// Read password from CLI argument or prompt
const password = process.argv[2];

if (!password) {
  console.error("Usage: npx tsx scripts/generate-hash.ts <password>");
  console.error("  Example: npx tsx scripts/generate-hash.ts 'my-secret-password'");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Warning: Password is less than 8 characters. Consider using a stronger password.");
}

const storedHash = hashPassword(password);
console.log("\n✅ Password hash generated (PBKDF2-SHA512, 100k iterations):\n");
console.log(storedHash);
console.log("\nAdd this to your AUTH_USERS env var as the passwordHash field.");
console.log("Example entry:");
console.log(`  {"email":"user@example.com","role":"visor","passwordHash":"${storedHash}"}`);
console.log();
