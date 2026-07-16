import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { extractFromImage, GeminiExtractionError, type ExtractedRecord } from "@/lib/gemini";
import { matchPersonRecord, classifyMatch, classifyScanError, type MatchResult } from "@/lib/db-scan";

// Scan endpoints get a stricter limit: 5 requests per minute per IP
// (one upload per ~12s). Generous enough for the preview-then-correct flow
// but tight enough to protect the free Gemini tier.
const SCAN_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 } as const;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/jpg"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Permisos de administrador requeridos." }, { status: 403 });
    }

    // ── Rate limit ──────────────────────────────────────────────
    const rlKey = getRateLimitKey(req);
    const rl = checkRateLimit(rlKey, SCAN_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados escaneos. Esperá un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // ── Parse multipart ─────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "No se pudo leer el formulario. Enviá la imagen como multipart/form-data." },
        { status: 400 }
      );
    }

    const imageField = formData.get("image");
    if (!imageField) {
      return NextResponse.json(
        { error: "No se recibió ninguna imagen." },
        { status: 400 }
      );
    }
    if (typeof imageField === "string") {
      return NextResponse.json(
        { error: "El campo 'image' debe ser un archivo, no texto." },
        { status: 400 }
      );
    }
    const file = imageField as File;
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usá JPG o PNG." },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Máximo 8 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Extract with Gemini ─────────────────────────────────────
    let extracted: ExtractedRecord[];
    try {
      extracted = await extractFromImage(buffer, file.type);
    } catch (err) {
      if (err instanceof GeminiExtractionError) {
        console.error("Gemini extraction error:", err.message);
        return NextResponse.json(
          { error: err.userMessage, code: err.code },
          { status: err.status }
        );
      }
      throw err;
    }

    // ── Classify matches per record ──────────────────────────────
    // Each record is matched independently so one bad query won't
    // kill the whole batch. If ALL queries fail we surface the first
    // error; otherwise we return partial results (failed records
    // default to status "none").
    const matches: Record<number, MatchResult> = {};
    let firstMatchError: unknown = null;

    await Promise.all(
      extracted.map(async (rec, idx) => {
        try {
          const candidates = await matchPersonRecord(rec.name, rec.document_id);
          matches[idx] = classifyMatch(rec.name, rec.document_id, candidates);
        } catch (err) {
          if (!firstMatchError) firstMatchError = err;
          console.error(
            `Match error for record ${idx} ("${rec.name}"):`,
            err instanceof Error ? err.message : err
          );
          matches[idx] = { status: "none" };
        }
      })
    );

    // If EVERY match query failed the DB is likely unreachable —
    // surface a clear error instead of silently returning "none" for all.
    if (firstMatchError && extracted.length > 0 && Object.values(matches).every((m) => m.status === "none")) {
      // Verify: were there actually candidates that should have matched?
      // We can't know for sure, so we treat it as a DB error.
      const info = classifyScanError(firstMatchError);
      console.error(`Scan error [${info.code}] — all match queries failed:`, firstMatchError);
      return NextResponse.json(
        {
          error: info.userMessage,
          code: info.code,
          // Still return extracted data so the user can work with it
          // once the DB is back.
          extracted,
          matches,
        },
        { status: info.status }
      );
    }

    return NextResponse.json({ extracted, matches });
  } catch (err) {
    // Gemini errors already handled in the inner catch; this covers
    // everything else: DB failures, timeouts, unexpected runtime errors.
    if (err instanceof GeminiExtractionError) {
      console.error("Gemini extraction error (outer):", err.message);
      return NextResponse.json({ error: err.userMessage, code: err.code }, { status: err.status });
    }

    const info = classifyScanError(err);
    console.error(`Scan error [${info.code}]:`, err);
    return NextResponse.json(
      { error: info.userMessage, code: info.code },
      { status: info.status }
    );
  }
}
