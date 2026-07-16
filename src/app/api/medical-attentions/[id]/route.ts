import { NextRequest, NextResponse } from "next/server";
import {
  getAttention,
  updateAttention,
  deleteAttention,
} from "@/lib/db-medical";
import { getServerSession } from "@/lib/auth";
import {
  idParamSchema,
  patchMedicalAttentionSchema,
} from "@/lib/validation";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { ZodError } from "zod";

/**
 * GET /api/medical-attentions/[id]
 * Return a single medical attention. Auth: any session.
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

    const attention = await getAttention(parsedId);
    if (!attention) {
      return NextResponse.json({ error: "Atención médica no encontrada." }, { status: 404 });
    }
    return NextResponse.json(attention);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error getting medical attention:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/medical-attentions/[id]
 * Partial update. Auth: admin only. The `notes` field is appended to
 * any existing value with a " | " separator (same semantics as
 * `patchPerson`).
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
    const parsed = patchMedicalAttentionSchema.parse(body);

    // Notes: append to existing with " | " separator so the history
    // is preserved (mirrors the `patchPerson` behavior).
    const trimmedNew = parsed.notes?.trim() ?? "";
    const notesUpdate: string | null | undefined =
      parsed.notes === undefined
        ? undefined
        : trimmedNew === ""
          ? null
          : trimmedNew;

    const updateData: Parameters<typeof updateAttention>[1] = {};
    if (parsed.professional !== undefined) updateData.professional = parsed.professional;
    if (parsed.specialty !== undefined) updateData.specialty = parsed.specialty;
    if (parsed.patient_age !== undefined) updateData.patient_age = parsed.patient_age;
    if (parsed.patient_sex !== undefined) updateData.patient_sex = parsed.patient_sex;
    if (parsed.diagnosis !== undefined) updateData.diagnosis = parsed.diagnosis;
    if (notesUpdate !== undefined) {
      // Read existing to append if there's a current value and the
      // request is non-empty. The data layer's updateAttention stores
      // whatever we pass; we pre-compute the appended value here.
      if (trimmedNew !== "" && notesUpdate !== null) {
        const existing = await getAttention(parsedId);
        if (!existing) {
          return NextResponse.json(
            { error: "Atención médica no encontrada." },
            { status: 404 }
          );
        }
        const currentNotes = existing.notes ?? "";
        const appended =
          currentNotes === "" ? trimmedNew : `${currentNotes} | ${trimmedNew}`;
        updateData.notes = appended;
      } else {
        // Either an explicit empty string was sent (clear notes) or the
        // user did not include notes — pass through unchanged.
        updateData.notes = notesUpdate;
      }
    }

    const updated = await updateAttention(parsedId, updateData);
    if (!updated) {
      return NextResponse.json(
        { error: "Atención médica no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido." }, { status: 400 });
    }
    console.error("Error updating medical attention:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/medical-attentions/[id]
 * Delete a medical attention. Auth: admin only.
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

    const deleted = await deleteAttention(parsedId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Atención médica no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    console.error("Error deleting medical attention:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
