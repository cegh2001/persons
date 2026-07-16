import { NextRequest, NextResponse } from "next/server";
import { personsByItem, personsMissingItem } from "@/lib/db-deliveries";
import { getServerSession } from "@/lib/auth";
import { supplyItemSchema } from "@/lib/validation";
import { ZodError } from "zod";

/**
 * GET /api/delivery-items
 * Query persons by item received (or not received).
 *
 * Query params:
 *   - item (required): catalog item name (e.g. "agua", "kit_alimento")
 *   - missing (optional): if "true", return persons who have NOT received the item
 *
 * Auth: any session (admin or visor).
 */
export async function GET(req: NextRequest) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const item = req.nextUrl.searchParams.get("item");
    const missing = req.nextUrl.searchParams.get("missing") === "true";

    if (!item) {
      return NextResponse.json(
        { error: "El parámetro 'item' es requerido." },
        { status: 400 }
      );
    }

    const parsed = supplyItemSchema.safeParse(item);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Ítem inválido: "${item}". Debe ser uno del catálogo.` },
        { status: 400 }
      );
    }

    const personIds = missing
      ? await personsMissingItem(parsed.data)
      : await personsByItem(parsed.data);

    return NextResponse.json({
      item: parsed.data,
      missing,
      count: personIds.length,
      person_ids: personIds,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    console.error("Error querying delivery items:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
