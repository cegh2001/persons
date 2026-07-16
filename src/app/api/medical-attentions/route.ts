import { NextRequest, NextResponse } from "next/server";
import {
  createAttention,
  listAttentions,
  getAttention,
} from "@/lib/db-medical";
import { getServerSession } from "@/lib/auth";
import {
  createMedicalAttentionSchema,
  listMedicalAttentionsQuerySchema,
} from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { getPerson } from "@/lib/db";
import { ZodError } from "zod";

/**
 * GET /api/medical-attentions
 * List medical attentions. Optional filters via query string:
 *   person_id, professional, specialty, page, pageSize
 *
 * Auth: any session (admin or visor).
 */
export async function GET(req: NextRequest) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const rawParams: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = listMedicalAttentionsQuerySchema.parse(rawParams);

    const result = await listAttentions(undefined, {
      person_id: parsed.person_id,
      professional: parsed.professional,
      specialty: parsed.specialty,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Error listing medical attentions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/medical-attentions
 * Create a medical attention for an existing person. Body:
 *   { person_id, professional, specialty, patient_age?, patient_sex?,
 *     diagnosis?, notes? }
 *
 * Auth: admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Permisos de administrador requeridos." },
        { status: 403 }
      );
    }

    // Rate limit.
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

    const body = await req.json();
    const parsed = createMedicalAttentionSchema.parse(body);

    // Verify the person exists — FK would also catch it, but a 404 is
    // friendlier than a 500 from the FK violation.
    const person = await getPerson(parsed.person_id);
    if (!person) {
      return NextResponse.json(
        { error: `La persona con id ${parsed.person_id} no existe.` },
        { status: 404 }
      );
    }

    const created = await createAttention(
      parsed.person_id,
      parsed.professional,
      parsed.specialty,
      parsed.patient_age,
      parsed.patient_sex,
      parsed.diagnosis,
      parsed.notes
    );

    // Return the full row from the DB so the response is round-trippable
    // (avoids fabricating a placeholder shape on the client).
    const full = await getAttention(created.id);
    return NextResponse.json(full ?? created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Error creating medical attention:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
