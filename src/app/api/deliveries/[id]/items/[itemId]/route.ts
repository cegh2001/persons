import { NextRequest, NextResponse } from "next/server";
import { removeDeliveryItem } from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { idParamSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * DELETE /api/deliveries/[id]/items/[itemId]
 * Remove a single item from a delivery. Auth: admin only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { itemId } = await params;
    const parsedItemId = idParamSchema.parse(itemId);

    const removed = await removeDeliveryItem(parsedItemId);
    if (!removed) {
      return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error removing delivery item:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
