import { NextRequest, NextResponse } from "next/server";
import { listDeliveries, createDelivery, getDelivery, DeliveryValidationError } from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { createDeliverySchema, listDeliveriesQuerySchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { getPerson } from "@/lib/db";
import { ZodError } from "zod";

/**
 * GET /api/deliveries
 * List deliveries. Optional filters: person_id, type, page, pageSize.
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

    const parsed = listDeliveriesQuerySchema.parse(rawParams);

    const result = await listDeliveries(undefined, {
      person_id: parsed.person_id,
      type: parsed.type,
      page: parsed.page,
      pageSize: parsed.pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Error listing deliveries:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/deliveries
 * Create a delivery for a person. Body: { person_id, delivery_type, beneficiary_count?, items? }
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
    const parsed = createDeliverySchema.parse(body);

    // Verify the person exists — FK would also catch it, but a 404 is
    // friendlier than a 500 from the FK violation.
    const person = await getPerson(parsed.person_id);
    if (!person) {
      return NextResponse.json(
        { error: `La persona con id ${parsed.person_id} no existe.` },
        { status: 404 }
      );
    }

    const created = await createDelivery(
      parsed.person_id,
      parsed.delivery_type,
      parsed.beneficiary_count,
      parsed.items
    );

    // Return the delivery with its items inlined so the client does not
    // need an extra round-trip.
    const full = await getDelivery(created.id);
    return NextResponse.json(full ?? { ...created, items: [] }, { status: 201 });
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
    console.error("Error creating delivery:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
