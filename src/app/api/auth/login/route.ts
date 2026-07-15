import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, signToken, COOKIE_OPTIONS } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────────────────────────
    const rlKey = getRateLimitKey(req);
    const rl = checkRateLimit(rlKey, RATE_LIMITS.auth);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un minuto e intentá de nuevo." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    // ── Validate input ──────────────────────────────────────────
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // ── Authenticate ────────────────────────────────────────────
    const user = authenticateUser(email, password);
    if (!user) {
      // Same error for wrong email AND wrong password — prevent user enumeration
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    const token = signToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(COOKIE_OPTIONS.name, token, COOKIE_OPTIONS.options);
    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
