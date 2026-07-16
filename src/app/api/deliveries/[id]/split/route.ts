import { NextRequest, NextResponse } from "next/server";
import { splitCollectiveDelivery, DeliveryValidationError } from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { idParamSchema, splitDeliverySchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * POST /api/deliveries/[id]/split
 * Split a collective delivery into individual deliveries.
 * Body: { person_ids: number[] }
 * Auth: admin only.
 *
 * The DB layer runs the operation inside a `BEGIN IMMEDIATE` transaction
 * with a post-write verify step. If the input is invalid (e.g.
 * person_ids.length > beneficiary_count, or the delivery is not
 * collective), the transaction is rolled back and a 400 is returned.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const parsedId = idParamSchema.parse(id);

    const body = await req.json();
    const parsed = splitDeliverySchema.parse(body);

    const result = await splitCollectiveDelivery(parsedId, parsed.person_ids);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    if (err instanceof DeliveryValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error splitting delivery:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
