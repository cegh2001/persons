import { NextRequest } from "next/server";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "default-sismo-session-secret-key-2026-replace-in-prod";
const COOKIE_NAME = "auth_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pre-calculated hashes using pbkdf2Sync (100k iterations, sha512, 64 bytes)
const USERS = [
  {
    email: "cargonzalez0601@gmail.com",
    role: "admin" as const,
    passwordHash: "8cbf09c21729043d5b3ad79d328fb343:b14bd66274989bef844a191c73c57ac0ea3ef093917511bc80a7c1370570c1b4223325ccfe6a9202878e41f031e7841b9a1701b5e64ad2f374c1d21851ad281c"
  },
  {
    email: "parrq.candelaria.c@gmail.com",
    role: "visor" as const,
    passwordHash: "cd88e3aced5286baa56ad3dd97a8ab2e:3db4de0fac9f0d858b4f82a6e3843362dc8a8f1540361b5305dcaa10e3f650163a3b392b8d902fc5a375bb4d98fc3afad9a10399901ad2b9a81b113cb172232f"
  }
];

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
  const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
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
  
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");
  
  return `${payloadBase64}.${signature}`;
}

export function verifyToken(token: string): SessionData | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 24 * 60 * 60 // 1 day in seconds
  }
};
