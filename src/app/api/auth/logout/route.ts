import { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/auth";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit (logouts are mutations, but generous) ────────
    const rlKey = getRateLimitKey(req);
    const rl = checkRateLimit(rlKey, RATE_LIMITS.mutation);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = NextResponse.json({ success: true });
    // Expire the cookie immediately
    response.cookies.set(COOKIE_OPTIONS.name, "", {
      ...COOKIE_OPTIONS.options,
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
