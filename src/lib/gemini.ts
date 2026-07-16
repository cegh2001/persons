/**
 * Gemini image extraction — server-side wrapper around @google/genai.
 *
 * Receives a handwritten delivery list image (JPG/PNG) and extracts
 * structured person records via gemma-4-31b-it with a JSON-schema-enforced
 * response. All errors are caught and re-thrown as a typed `GeminiExtractionError`
 * so the calling route can map them to HTTP status codes without leaking
 * stack traces to the client.
 */

import { GoogleGenAI, Type, type Schema } from "@google/genai";

export type ExtractedType = "supplies" | "medical";

export interface ExtractedRecord {
  name: string;
  document_id: string;
  location: string;
  type: ExtractedType;
  notes: string;
}

export type GeminiErrorCode =
  | "rate_limited"
  | "invalid_image"
  | "auth"
  | "config"
  | "unknown";

export class GeminiExtractionError extends Error {
  public readonly code: GeminiErrorCode;
  public readonly status: number;
  public readonly userMessage: string;
  /** Safe technical detail for client-side debugging. Never contains secrets. */
  public readonly detail: string;

  constructor(
    code: GeminiErrorCode,
    message: string,
    userMessage: string,
    status = 500,
    detail?: string
  ) {
    super(message);
    this.name = "GeminiExtractionError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
    this.detail = detail ?? message;
  }
}

// ── Lazy client (fail at request time, never at import time) ───────────

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiExtractionError(
      "config",
      "GEMINI_API_KEY is not set",
      "Error de configuración del servidor.",
      500
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

// ── Constants ──────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_MODEL || "gemma-4-31b-it";
const MAX_RECORDS = 50;

// ── Prompt (Spanish — Venezuelan context) ──────────────────────────────

const SYSTEM_PROMPT = [
  "Extraé los datos de cada persona de esta lista manuscrita de entregas de ayuda humanitaria.",
  "Por cada persona, devolvé: nombre completo, número de documento/CI, ubicación/sector,",
  'tipo de entrega ("supplies" para suministros o "medical" para atención médica), y notas adicionales.',
  "",
  "REGLAS IMPORTANTES:",
  "- Cédulas: SOLO dígitos consecutivos, SIN puntos, SIN comas, SIN espacios. Ej: 12345678, no 12.345.678.",
  "- Ubicación: transcribí EXACTAMENTE como aparece en la lista. No corrijas ortografía ni inventes sectores.",
  "- Si un campo está ausente o ilegible, dejalo vacío. NUNCA inventes datos.",
  "",
  "Devolvé hasta " + MAX_RECORDS + " registros en un array JSON.",
].join("\n");

// ── Response schema ────────────────────────────────────────────────────

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Nombre completo de la persona.",
      },
      document_id: {
        type: Type.STRING,
        description: "Número de cédula SOLO con dígitos, sin puntos ni comas. Vacío si no aparece. Ej: 12345678",
      },
      location: {
        type: Type.STRING,
        description: "Sector o ubicación EXACTAMENTE como aparece escrito. No corregir ortografía.",
      },
      type: {
        type: Type.OBJECT,
        properties: {
          value: {
            type: Type.STRING,
            enum: ["supplies", "medical"],
          },
        },
        required: ["value"],
        description: 'Tipo de entrega: "supplies" o "medical".',
      },
      notes: {
        type: Type.STRING,
        description: "Notas adicionales. Vacío si no hay.",
      },
    },
    required: ["name", "document_id", "location", "type", "notes"],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

function normalizeType(raw: unknown): ExtractedType {
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (v === "medical" || v === "supplies") return v;
  }
  if (typeof raw === "string" && (raw === "medical" || raw === "supplies")) {
    return raw;
  }
  return "supplies";
}

/**
 * Strip all non-digit characters from a document ID.
 * Handles common OCR artifacts: dots, spaces, hyphens, parentheses.
 * "V-12.345.678" → "12345678"
 */
function normalizeDocumentId(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Normalize a location/sector name:
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove leading/trailing punctuation
 * Does NOT change spelling — that's the model's job.
 */
function normalizeLocation(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[.,;:\-]+|[.,;:\-]+$/g, "");
}

function mapGeminiError(err: unknown): GeminiExtractionError {
  if (err instanceof GeminiExtractionError) return err;

  // ── Dump the raw error for Vercel logs BEFORE classification ──
  // JSON.stringify on an Error yields {} — extract own properties manually.
  const rawKeys = err && typeof err === "object" ? Object.getOwnPropertyNames(err) : [];
  const rawSnapshot: Record<string, unknown> = {};
  for (const k of rawKeys) {
    try { rawSnapshot[k] = (err as Record<string, unknown>)[k]; } catch { /* ignore */ }
  }
  console.error("Raw Gemini SDK error dump:", JSON.stringify(rawSnapshot, null, 2));

  // The SDK exposes an ApiError-like shape: { name, message, status }
  // v2.x also has: code, details, errors[], request, response
  const anyErr = err as { name?: string; status?: number; message?: string; code?: number; cause?: unknown };
  const name = anyErr?.name ?? "";
  const status = anyErr?.status ?? anyErr?.code ?? 0;
  const message = anyErr?.message ?? String(err);

  // Include any nested cause for diagnostics
  const causeMsg =
    anyErr?.cause && typeof anyErr.cause === "object" && "message" in anyErr.cause
      ? String((anyErr.cause as { message: unknown }).message)
      : "";

  const fullMessage = causeMsg ? `${message} (cause: ${causeMsg})` : message;

  // ── Classification ──────────────────────────────────────────────

  if (status === 429 || /rate.?limit|quota|resource_exhausted/i.test(fullMessage)) {
    return new GeminiExtractionError(
      "rate_limited",
      `Gemini rate limit hit: ${fullMessage}`,
      "Límite de escaneo alcanzado. Intentá en unos minutos.",
      429
    );
  }
  if (status === 401 || status === 403 || /api.?key|permission|unauthenticated|unauthorized/i.test(fullMessage)) {
    return new GeminiExtractionError(
      "auth",
      `Gemini auth failure: ${fullMessage}`,
      "Error de configuración del servidor.",
      500
    );
  }
  if (status === 400 || /invalid|image|unsupported/i.test(fullMessage)) {
    return new GeminiExtractionError(
      "invalid_image",
      `Gemini rejected image: ${fullMessage}`,
      "No se pudo procesar la imagen. Verificá que sea una foto clara de la lista.",
      400
    );
  }

  // Model not found / not accessible (check name OR message)
  if (
    /model|gemma/i.test(name) &&
    /not[_\s]?found|invalid|unavailable/i.test(fullMessage)
  ) {
    return new GeminiExtractionError(
      "config",
      `Gemini model misconfig: ${fullMessage}`,
      "Error de configuración del servidor.",
      500
    );
  }

  // Model does not support requested feature (e.g., responseJsonSchema on a model that lacks it)
  if (/response.?schema|json.?schema|not.?support|unsupported/i.test(fullMessage)) {
    return new GeminiExtractionError(
      "config",
      `Gemini model doesn't support requested feature: ${fullMessage}`,
      "Error de configuración del servidor.",
      500
    );
  }

  // Network / fetch failures (DNS, TLS, connection refused)
  if (
    name === "TypeError" ||
    name === "FetchError" ||
    /fetch|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|TLS|SSL/i.test(fullMessage)
  ) {
    return new GeminiExtractionError(
      "unknown",
      `Gemini network/fetch error: ${fullMessage}`,
      "Error de conexión con el servicio de escaneo. Verificá tu conexión a internet.",
      502
    );
  }

  // Internal server error from Gemini (500, 502, 503, 504)
  if (status >= 500) {
    return new GeminiExtractionError(
      "unknown",
      `Gemini server error (HTTP ${status}): ${fullMessage}`,
      "El servicio de escaneo no está disponible en este momento. Reintentá en unos minutos.",
      502
    );
  }

  return new GeminiExtractionError(
    "unknown",
    `Gemini call failed (name=${name}, status=${status}): ${fullMessage}`,
    "Error al procesar la imagen. Intentá de nuevo.",
    500
  );
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Extract structured person records from a handwritten delivery list image.
 * Throws `GeminiExtractionError` on any failure — callers map to HTTP.
 *
 * @param imageBuffer  Raw image bytes (JPG or PNG).
 * @param mimeType     MIME type of the image (e.g. "image/jpeg", "image/png").
 */
export async function extractFromImage(
  imageBuffer: Buffer,
  mimeType = "image/jpeg"
): Promise<ExtractedRecord[]> {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new GeminiExtractionError(
      "invalid_image",
      "Empty image buffer",
      "No se pudo procesar la imagen. Verificá que sea una foto clara de la lista.",
      400
    );
  }

  const client = getClient();
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };

  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL,
      contents: [imagePart, SYSTEM_PROMPT],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema,
        temperature: 0.2,
      },
    });
  } catch (err) {
    throw mapGeminiError(err);
  }

  const text = response.text;
  if (!text) {
    return [];
  }

  // ── Resilient JSON parsing ─────────────────────────────────────
  // gemma models sometimes ignore responseJsonSchema and return:
  //   - JSON wrapped in ```json fences
  //   - JSON prefixed with explanatory text
  //   - Plain text (which we can't recover from)
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Attempt 2: extract from ```json … ``` code block
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        parsed = JSON.parse(fenceMatch[1].trim());
      } catch {
        // fall through to error below
      }
    }

    // Attempt 3: find the outermost JSON array
    if (parsed === undefined) {
      const arrayStart = text.indexOf("[");
      const arrayEnd = text.lastIndexOf("]");
      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        try {
          parsed = JSON.parse(text.slice(arrayStart, arrayEnd + 1));
        } catch {
          // fall through to error below
        }
      }
    }

    // If all extraction attempts fail, surface the raw response in the log
    // and return a diagnostic error to the client.
    if (parsed === undefined) {
      console.error(
        "Gemini non-JSON response (first 500 chars):",
        text.slice(0, 500)
      );
      throw new GeminiExtractionError(
        "unknown",
        `Gemini returned non-JSON response (${text.length} chars)`,
        "El modelo no devolvió datos estructurados. Probá con una foto más clara o recortá solo la lista.",
        422,
        `Non-JSON response. First 100 chars: "${text.slice(0, 100).replace(/\n/g, ' ')}"`
      );
    }
  }

  if (!Array.isArray(parsed)) {
    console.error(
      "Gemini non-array response (first 500 chars):",
      JSON.stringify(parsed).slice(0, 500)
    );
    throw new GeminiExtractionError(
      "unknown",
      "Gemini response was not an array",
      "El modelo no devolvió una lista de personas. Probá con una foto más clara.",
      422,
      `Response type: ${typeof parsed}. Expected array.`
    );
  }

  const records: ExtractedRecord[] = [];
  for (const raw of parsed as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;

    const rawDocId = typeof r.document_id === "string" ? r.document_id : "";
    const rawLoc = typeof r.location === "string" ? r.location : "";

    records.push({
      name,
      document_id: normalizeDocumentId(rawDocId),
      location: normalizeLocation(rawLoc),
      type: normalizeType(r.type),
      notes: typeof r.notes === "string" ? r.notes.trim() : "",
    });
  }

  return records.slice(0, MAX_RECORDS);
}
