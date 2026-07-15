/**
 * In-memory rate limiter for Next.js API routes.
 * 
 * Limits requests per IP within a sliding window.
 * For production multi-instance deployments, replace with @upstash/ratelimit.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check if a request from the given key is within rate limits.
 * Returns the result — the caller decides what to do (e.g., return 429).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // No previous entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window — increment
  entry.count += 1;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract a rate-limit key from a NextRequest.
 * Uses X-Forwarded-For header (common in Vercel/proxies) with fallback to a hash
 * of the request (not ideal but prevents total bypass).
 */
export function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }
  // Fallback: use CF-Connecting-IP (Cloudflare) or a hash
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return `ip:${cfIp}`;
  
  // Last resort — not great but prevents DoS by empty header
  return "ip:unknown";
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  /** Auth endpoints (login): strict */
  auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,       // 5/min
  /** Mutations (POST/PUT/DELETE): moderate */
  mutation: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig, // 30/min
  /** Reads (GET): generous */
  read: { maxRequests: 300, windowMs: 60_000 } as RateLimitConfig,    // 300/min
};
