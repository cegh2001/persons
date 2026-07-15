import { NextRequest } from "next/server";
import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProduction ? "__Host-auth_session" : "auth_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Secrets (lazy — fail at runtime, never at build time) ──────────────

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required but not set.\n" +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
  // Block the old default value even if someone set it to the default string
  if (secret === "default-sismo-session-secret-key-2026-replace-in-prod") {
    throw new Error(
      "SESSION_SECRET is set to the insecure default value. Generate a real secret."
    );
  }
  return secret;
}

// ── Users from environment ────────────────────────────────────────────

interface StoredUser {
  email: string;
  role: "admin" | "visor";
  passwordHash: string; // format: salt:hexHash
}

function getUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) {
    throw new Error(
      "AUTH_USERS environment variable is required but not set.\n" +
      "Format: JSON array — [{\"email\":\"...\",\"role\":\"admin|visor\",\"passwordHash\":\"salt:hash\"}]\n" +
      "Generate hashes with: npx tsx scripts/generate-hash.ts"
    );
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("AUTH_USERS must be a non-empty JSON array.");
    }
    for (const u of parsed) {
      if (!u.email || !u.role || !u.passwordHash) {
        throw new Error(`AUTH_USERS entry missing required fields: ${JSON.stringify(u)}`);
      }
      if (u.role !== "admin" && u.role !== "visor") {
        throw new Error(`AUTH_USERS entry has invalid role "${u.role}": ${u.email}`);
      }
    }
    return parsed as StoredUser[];
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("AUTH_USERS is not valid JSON. Check your environment variable.");
    }
    throw err;
  }
}

export interface SessionData {
  email: string;
  role: "admin" | "visor";
  expiresAt: number;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computedHash, "hex"));
  } catch (err) {
    return false;
  }
}

export function authenticateUser(email: string, password: string): { email: string; role: "admin" | "visor" } | null {
  const trimmed = email.toLowerCase().trim();
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === trimmed);
  if (!user) return null;

  if (verifyPassword(password, user.passwordHash)) {
    return { email: user.email, role: user.role };
  }
  return null;
}

export function signToken(payload: Omit<SessionData, "expiresAt">): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const sessionData: SessionData = { ...payload, expiresAt };
  const payloadStr = JSON.stringify(sessionData);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
  
  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");
  
  return `${payloadBase64}.${signature}`;
}

export function verifyToken(token: string): SessionData | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const hmac = crypto.createHmac("sha256", getSessionSecret());
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const session = JSON.parse(payloadStr) as SessionData;

    if (Date.now() > session.expiresAt) {
      return null; // Expired
    }

    return session;
  } catch (err) {
    return null;
  }
}

export function getServerSession(req: NextRequest): SessionData | null {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  return verifyToken(cookie.value);
}

export const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60 // 1 day in seconds
  }
};
