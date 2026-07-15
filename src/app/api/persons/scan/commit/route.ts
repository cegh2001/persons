import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { scanCommitSchema } from "@/lib/validation";
import { commitScanBatch } from "@/lib/db-scan";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Permisos de administrador requeridos." }, { status: 403 });
    }

    // ── Rate limit ──────────────────────────────────────────────
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

    // ── Validate body ───────────────────────────────────────────
    const body = await req.json();
    const parsed = scanCommitSchema.parse(body);

    // ── Commit batch ────────────────────────────────────────────
    const result = await commitScanBatch(parsed.rows);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      // Map each issue to a row-level detail when possible. The
      // ZodError path for array items is like `rows.2.location` so we
      // strip the prefix and surface the row index.
      const details = err.issues.map((e) => {
        const path = e.path.join(".");
        const rowMatch = path.match(/^rows\.(\d+)/);
        const row = rowMatch ? Number(rowMatch[1]) : null;
        return { row, path, message: e.message };
      });
      const summary =
        details.find((d) => d.row !== null)?.message ??
        details[0]?.message ??
        "Error de validación.";
      return NextResponse.json(
        { error: summary, details },
        { status: 400 }
      );
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    // Transaction or DB failure — the batch was rolled back in db-scan.ts.
    console.error("Scan commit error:", err);
    return NextResponse.json(
      { error: "Error al guardar. Ningún registro fue modificado." },
      { status: 500 }
    );
  }
}
