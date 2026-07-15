import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF protection middleware.
 * 
 * Validates Origin / Referer headers for state-changing requests (POST, PUT, DELETE, PATCH).
 * GET, HEAD, OPTIONS are not checked — they should be idempotent.
 * 
 * Relies on SameSite=Strict cookies as the primary CSRF defense; this is a second layer.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Routes excluded from CSRF checks (e.g., login has no session yet)
const CSRF_EXCLUDED = new Set(["/api/auth/login"]);

function getOriginHost(request: NextRequest): string | null {
  // Origin header is the most reliable
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      return null;
    }
  }

  // Fallback to Referer
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host;
    } catch {
      return null;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;

  // Only check state-changing methods
  if (SAFE_METHODS.has(method)) {
    return NextResponse.next();
  }

  // Skip excluded routes
  if (CSRF_EXCLUDED.has(nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Only apply to API routes
  if (!nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const originHost = getOriginHost(request);
  const targetHost = request.headers.get("host") || nextUrl.host;

  // If no Origin/Referer, allow (server-to-server calls, some mobile apps)
  // This is acceptable because SameSite=Strict cookies are the primary defense.
  if (!originHost) {
    return NextResponse.next();
  }

  // Validate origin matches host
  if (originHost !== targetHost) {
    return NextResponse.json(
      { error: "Cross-origin request blocked." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
