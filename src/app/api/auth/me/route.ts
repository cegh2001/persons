import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // ── Rate limit (generous — this gets called on every page load) ──
    const rlKey = getRateLimitKey(req);
    const rl = checkRateLimit(rlKey, RATE_LIMITS.read);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: session.email,
        role: session.role,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
