import { NextRequest, NextResponse } from "next/server";
import {
  getDelivery,
  updateDelivery,
  deleteDelivery,
  DeliveryValidationError,
} from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { idParamSchema, patchDeliverySchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * GET /api/deliveries/[id]
 * Return a single delivery with its items. Auth: any session.
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

    const delivery = await getDelivery(parsedId);
    if (!delivery) {
      return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
    }
    return NextResponse.json(delivery);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error getting delivery:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/deliveries/[id]
 * Partial update of a delivery. Auth: admin only.
 *
 * Currently supports editing `delivery_type` and `beneficiary_count`.
 * The items themselves are managed through `/api/deliveries/[id]/items`.
 */
export async function PATCH(
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
    const parsed = patchDeliverySchema.parse(body);

    const updateData: {
      delivery_type?: "individual" | "collective";
      beneficiary_count?: number;
      items?: string[];
    } = {};
    if (parsed.delivery_type !== undefined) updateData.delivery_type = parsed.delivery_type;
    if (parsed.beneficiary_count !== undefined) {
      updateData.beneficiary_count = parsed.beneficiary_count;
    }
    if (parsed.items !== undefined) updateData.items = parsed.items;

    const updated = await updateDelivery(parsedId, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
    }

    // Return the full delivery (with items) so the client does not need
    // an extra round-trip.
    const full = await getDelivery(parsedId);
    return NextResponse.json(full ?? { ...updated, items: [] });
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
    console.error("Error updating delivery:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/deliveries/[id]
 * Delete a delivery and cascade its items. Auth: admin only.
 */
export async function DELETE(
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

    const deleted = await deleteDelivery(parsedId);
    if (!deleted) {
      return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error deleting delivery:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
