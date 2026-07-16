import { NextRequest, NextResponse } from "next/server";
import {
  addDeliveryItem,
  getDeliveryItems,
  getDelivery,
  DeliveryValidationError,
} from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { idParamSchema, createDeliveryItemSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * GET /api/deliveries/[id]/items
 * List items belonging to a delivery. Auth: any session.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const { id } = await params;
    const parsedId = idParamSchema.parse(id);

    // Confirm the parent exists so the client gets a 404 (instead of an
    // empty array when the delivery itself is missing).
    const delivery = await getDelivery(parsedId);
    if (!delivery) {
      return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
    }

    const items = await getDeliveryItems(parsedId);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error listing delivery items:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/deliveries/[id]/items
 * Add a catalog item to a delivery. Body: { item }. Auth: admin only.
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
    const parsed = createDeliveryItemSchema.parse(body);

    // Confirm the parent exists.
    const delivery = await getDelivery(parsedId);
    if (!delivery) {
      return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
    }

    const created = await addDeliveryItem(parsedId, parsed.item);
    return NextResponse.json(created, { status: 201 });
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
    console.error("Error adding delivery item:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
