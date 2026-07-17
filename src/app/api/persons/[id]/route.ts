import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, deletePerson, patchPerson, type PersonInput } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { updatePersonSchema, patchPersonSchema, idParamSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

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
    const person = await getPerson(parsedId);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error getting person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const parsedId = idParamSchema.parse(id);
    const body = await req.json();
    const parsed = updatePersonSchema.parse(body);

    const updateData: Partial<PersonInput> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.document_id !== undefined) updateData.document_id = parsed.document_id;
    if (parsed.location !== undefined) updateData.location = parsed.location;
    if (parsed.is_vulnerable !== undefined) updateData.is_vulnerable = parsed.is_vulnerable ? 1 : 0;
    if (parsed.notes !== undefined) updateData.notes = parsed.notes;
    if (parsed.received_supplies !== undefined) updateData.received_supplies = parsed.received_supplies ? 1 : 0;
    if (parsed.received_medical !== undefined) updateData.received_medical = parsed.received_medical ? 1 : 0;

    const person = await updatePerson(parsedId, updateData);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Error updating person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // ── Validate params ─────────────────────────────────────────
    const { id } = await params;
    const parsedId = idParamSchema.parse(id);

    const deleted = await deletePerson(parsedId);
    if (!deleted) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const errStr = String(err);
    if (errStr.includes("FOREIGN KEY") || errStr.includes("foreign key")) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar la persona porque tiene entregas o atenciones médicas asociadas. Primero debés eliminar sus entregas o atenciones desde el detalle del usuario.",
        },
        { status: 400 }
      );
    }
    console.error("Error deleting person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // ── Validate params + body ──────────────────────────────────
    const { id } = await params;
    const parsedId = idParamSchema.parse(id);

    const body = await req.json();
    const parsed = patchPersonSchema.parse(body);

    const patchData: {
      name?: string;
      document_id?: string | null;
      location?: string;
      is_vulnerable?: number;
      notes?: string;
      received_supplies?: number;
      received_medical?: number;
    } = {};
    if (parsed.name !== undefined) patchData.name = parsed.name;
    if (parsed.document_id !== undefined) patchData.document_id = parsed.document_id;
    if (parsed.location !== undefined) patchData.location = parsed.location;
    if (parsed.is_vulnerable !== undefined) patchData.is_vulnerable = parsed.is_vulnerable ? 1 : 0;
    if (parsed.notes !== undefined) patchData.notes = parsed.notes;
    if (parsed.received_supplies !== undefined) patchData.received_supplies = parsed.received_supplies ? 1 : 0;
    if (parsed.received_medical !== undefined) patchData.received_medical = parsed.received_medical ? 1 : 0;

    const person = await patchPerson(parsedId, patchData);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Error patching person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
