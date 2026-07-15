import { NextRequest, NextResponse } from "next/server";
import { listPersons, createPerson } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { createPersonSchema, listPersonsQuerySchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    // ── Validate query params ───────────────────────────────────
    const rawParams: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = listPersonsQuerySchema.parse(rawParams);

    const result = await listPersons({
      search: parsed.search,
      location: parsed.location,
      is_vulnerable: parsed.is_vulnerable,
      received_supplies: parsed.received_supplies,
      received_medical: parsed.received_medical,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Error listing persons:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // ── Validate input ──────────────────────────────────────────
    const body = await req.json();
    const parsed = createPersonSchema.parse(body);

    const newPerson = await createPerson({
      name: parsed.name,
      document_id: parsed.document_id ?? null,
      location: parsed.location,
      is_vulnerable: parsed.is_vulnerable ? 1 : 0,
      notes: parsed.notes,
      received_supplies: parsed.received_supplies ? 1 : 0,
      received_medical: parsed.received_medical ? 1 : 0,
    });

    return NextResponse.json(newPerson, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Error creating person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
