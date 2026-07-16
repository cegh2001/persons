"use client";

/**
 * State machine hook for the Gemini handwritten-list scan flow.
 *
 * Phases: idle → uploading → preview → committing → done
 *
 * Responsibilities:
 *  - Resize the uploaded image client-side via Canvas to ≤2048px before
 *    POSTing it to /api/persons/scan as multipart/form-data.
 *  - Hold an editable row array (with match classification + per-row
 *    "include" + per-partial "merge/create" resolution) so the preview
 *    table can be a plain controlled-input grid.
 *  - POST the resolved rows to /api/persons/scan/commit, mapping HTTP
 *    errors to localized toast messages.
 *  - Expose a `reset()` for the dialog's open/close cycle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ExtractedRecord } from "@/lib/gemini";
import type { MatchResult, MatchStatus } from "@/lib/db-scan";
import type { ScanCommitRow } from "@/lib/validation";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);
const CACHE_KEY = "scan-preview-cache";

interface ScanCache {
  rows: ScanRow[];
  extracted: ExtractedRecord[];
  matches: Record<number, MatchResult>;
}

function saveCache(data: ScanCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore.
  }
}

function loadCache(): ScanCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScanCache;
  } catch {
    clearCache();
    return null;
  }
}

function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export type ScanAction = ScanCommitRow["action"];

export interface ScanRow {
  /** Stable key for React list rendering. */
  key: string;
  include: boolean;
  matchStatus: MatchStatus;
  existingPersonId: number | undefined;
  existingPersonName: string | undefined;
  existingPersonLocation: string | undefined;
  action: ScanAction;
  name: string;
  document_id: string;
  location: string;
  received_supplies: boolean;
  received_medical: boolean;
  notes: string;
  is_vulnerable: boolean;
}

export type ScanPhase = "idle" | "uploading" | "committing";

export interface ScanDataState {
  phase: ScanPhase;
  /** True when rows are populated and the user can edit/preview. */
  hasRows: boolean;
  /** True when the preview step is in confirmation mode. */
  confirming: boolean;
  errorMessage: string | null;
  /** Last successful commit count (set when phase flips to done-equivalent). */
  lastCommitted: number | null;
}

const INITIAL_STATE: ScanDataState = {
  phase: "idle",
  hasRows: false,
  confirming: false,
  errorMessage: null,
  lastCommitted: null,
};

// ── Client-side image resize via Canvas ───────────────────────────────

async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) {
      // No resize needed — return the original blob untouched.
      return file;
    }
    const scale = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo obtener el contexto del canvas.");
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const isPng = file.type === "image/png";
    const outType = isPng ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outType, isPng ? undefined : JPEG_QUALITY);
    if (!blob) {
      throw new Error("No se pudo convertir la imagen.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useScanData() {
  const [state, setState] = useState<ScanDataState>(INITIAL_STATE);
  const [extracted, setExtracted] = useState<ExtractedRecord[]>([]);
  const [matches, setMatches] = useState<Record<number, MatchResult>>({});
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [hasCachedData, setHasCachedData] = useState(() => loadCache() !== null);

  /** Guards in-flight requests from writing to state after a reset. */
  const cancelledRef = useRef(false);

  // Persist every edit to localStorage so data survives modal close / refresh.
  useEffect(() => {
    if (state.hasRows && rows.length > 0) {
      saveCache({ rows, extracted, matches });
    }
  }, [rows, state.hasRows, extracted, matches]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    clearCache();
    setHasCachedData(false);
    setState(INITIAL_STATE);
    setExtracted([]);
    setMatches({});
    setRows([]);
  }, []);

  /** Restore a previously-cached scan session (e.g. after modal close / refresh). */
  const restoreFromCache = useCallback(() => {
    const cached = loadCache();
    if (!cached) return false;
    setExtracted(cached.extracted ?? []);
    setMatches(cached.matches ?? {});
    setRows(cached.rows ?? []);
    setState({
      phase: "idle",
      hasRows: (cached.rows ?? []).length > 0,
      confirming: false,
      errorMessage: null,
      lastCommitted: null,
    });
    return true;
  }, []);

  /** Discard cached data without committing. */
  const discardCache = useCallback(() => {
    clearCache();
    setHasCachedData(false);
    setState(INITIAL_STATE);
    setExtracted([]);
    setMatches({});
    setRows([]);
  }, []);

  const startScan = useCallback(async (file: File) => {
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Formato no soportado. Usá JPG o PNG.");
      setState((s) => ({ ...s, errorMessage: "Formato no soportado." }));
      return;
    }

    cancelledRef.current = false;
    setState({
      phase: "uploading",
      hasRows: false,
      confirming: false,
      errorMessage: null,
      lastCommitted: null,
    });
    setRows([]);

    let blob: Blob;
    try {
      blob = await resizeImage(file);
    } catch (err) {
      if (cancelledRef.current) return;
      const message = err instanceof Error ? err.message : "No se pudo procesar la imagen.";
      toast.error(message);
      setState({
        phase: "idle",
        hasRows: false,
        confirming: false,
        errorMessage: message,
        lastCommitted: null,
      });
      return;
    }

    if (cancelledRef.current) return;

    const formData = new FormData();
    const filename = file.name || `scan-${shortId()}.${blob.type === "image/png" ? "png" : "jpg"}`;
    formData.append("image", blob, filename);

    let res: Response;
    try {
      res = await fetch("/api/persons/scan", {
        method: "POST",
        body: formData,
      });
    } catch {
      if (cancelledRef.current) return;
      const message = "Error de red. Verificá tu conexión.";
      toast.error(message);
      setState({
        phase: "idle",
        hasRows: false,
        confirming: false,
        errorMessage: message,
        lastCommitted: null,
      });
      return;
    }

    if (cancelledRef.current) return;

    if (!res.ok) {
      const message = await mapScanError(res);
      toast.error(message);
      setState({
        phase: "idle",
        hasRows: false,
        confirming: false,
        errorMessage: message,
        lastCommitted: null,
      });
      return;
    }

    const data = (await res.json()) as {
      extracted: ExtractedRecord[];
      matches: Record<number, MatchResult>;
    };

    if (cancelledRef.current) return;

    const builtRows: ScanRow[] = (data.extracted ?? []).map((rec, idx) => {
      const m = data.matches?.[idx];
      const status: MatchStatus = m?.status ?? "none";
      const existing = m?.existingPerson;
      return {
        key: `row-${idx}-${shortId()}`,
        include: true,
        matchStatus: status,
        existingPersonId: existing?.id,
        existingPersonName: existing?.name,
        existingPersonLocation: existing?.location,
        action:
          status === "exact"
            ? "update"
            : status === "partial"
              ? "merge"
              : "create",
        name: rec.name ?? "",
        document_id: rec.document_id ?? "",
        location: rec.location ?? "",
        received_supplies: rec.type === "supplies",
        received_medical: rec.type === "medical",
        notes: rec.notes ?? "",
        is_vulnerable: false,
      };
    });

    setExtracted(data.extracted ?? []);
    setMatches(data.matches ?? {});
    setRows(builtRows);
    setHasCachedData(true);
    saveCache({
      rows: builtRows,
      extracted: data.extracted ?? [],
      matches: data.matches ?? {},
    });
    setState({
      phase: "idle",
      hasRows: builtRows.length > 0,
      confirming: false,
      errorMessage: null,
      lastCommitted: null,
    });
  }, []);

  const updateRow = useCallback(
    (index: number, patch: Partial<Omit<ScanRow, "key">>) => {
      setRows((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = prev.slice();
        next[index] = { ...next[index], ...patch };
        return next;
      });
    },
    []
  );

  const toggleInclude = useCallback((index: number) => {
    setRows((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.slice();
      next[index] = { ...next[index], include: !next[index].include };
      return next;
    });
  }, []);

  const setMergeAction = useCallback(
    (index: number, action: "merge" | "create") => {
      setRows((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const row = prev[index];
        if (row.matchStatus !== "partial") return prev;
        const next = prev.slice();
        next[index] = { ...row, action };
        return next;
      });
    },
    []
  );

  const setConfirming = useCallback((value: boolean) => {
    setState((s) => ({ ...s, confirming: value }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => (s.errorMessage ? { ...s, errorMessage: null } : s));
  }, []);

  const commit = useCallback(async (): Promise<number | null> => {
    if (cancelledRef.current) return null;

    const included = rows.filter((r) => r.include);
    if (included.length === 0) {
      const message = "No hay registros seleccionados para confirmar.";
      toast.error(message);
      setState((s) => ({ ...s, errorMessage: message }));
      return null;
    }

    // Client-side validation: name + location required.
    const invalidIdx = included.findIndex(
      (r) => !r.name.trim() || !r.location.trim()
    );
    if (invalidIdx !== -1) {
      const message = "Todos los registros deben tener nombre y sector.";
      toast.error(message);
      setState((s) => ({ ...s, errorMessage: message }));
      return null;
    }

    cancelledRef.current = false;
    setState((s) => ({ ...s, phase: "committing", errorMessage: null }));

    const payload: { rows: ScanCommitRow[] } = {
      rows: included.map((r) => ({
        name: r.name.trim(),
        document_id: r.document_id.trim() || null,
        location: r.location.trim(),
        type: r.received_supplies && r.received_medical ? "both" as const : r.received_supplies ? "supplies" : "medical",
        notes: r.notes.trim(),
        is_vulnerable: r.is_vulnerable,
        received_supplies: r.received_supplies,
        received_medical: r.received_medical,
        matchStatus: r.matchStatus,
        existingPersonId: r.existingPersonId,
        action: r.action,
      })),
    };

    let res: Response;
    try {
      res = await fetch("/api/persons/scan/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      if (cancelledRef.current) return null;
      const message = "Error de red. Verificá tu conexión.";
      toast.error(message);
      setState((s) => ({
        ...s,
        phase: "idle",
        errorMessage: message,
        confirming: false,
      }));
      return null;
    }

    if (cancelledRef.current) return null;

    if (!res.ok) {
      const message = await mapCommitError(res);
      toast.error(message);
      setState((s) => ({
        ...s,
        phase: "idle",
        errorMessage: message,
        confirming: false,
      }));
      return null;
    }

    const data = (await res.json()) as { committed: number };
    const count = Number(data.committed ?? included.length);
    if (cancelledRef.current) return null;

    toast.success(`${count} ${count === 1 ? "registro guardado" : "registros guardados"}.`);
    clearCache();
    setHasCachedData(false);
    cancelledRef.current = true; // Mark done — caller will close dialog
    setState({
      phase: "idle",
      hasRows: false,
      confirming: false,
      errorMessage: null,
      lastCommitted: count,
    });
    setExtracted([]);
    setMatches({});
    setRows([]);
    return count;
  }, [rows]);

  return {
    // State
    phase: state.phase,
    hasRows: state.hasRows,
    confirming: state.confirming,
    errorMessage: state.errorMessage,
    lastCommitted: state.lastCommitted,
    // Data
    extracted,
    matches,
    rows,
    // Cache
    hasCachedData,
    restoreFromCache,
    discardCache,
    startScan,
    updateRow,
    toggleInclude,
    setMergeAction,
    setConfirming,
    clearError,
    commit,
    reset,
  };
}

// ── Error mapping ─────────────────────────────────────────────────────

async function mapScanError(res: Response): Promise<string> {
  const body = await safeJson(res);
  switch (res.status) {
    case 401:
      return "No autorizado. Iniciá sesión.";
    case 403:
      return "Acceso denegado. Permisos de administrador requeridos.";
    case 429:
      return "Límite de escaneo alcanzado. Esperá unos minutos.";
    case 400: {
      const msg = body?.error;
      return typeof msg === "string" && msg.trim()
        ? msg
        : "No se pudo procesar la imagen.";
    }
    default:
      return "Error del servidor. Intentá de nuevo.";
  }
}

async function mapCommitError(res: Response): Promise<string> {
  const body = await safeJson(res);
  switch (res.status) {
    case 401:
      return "No autorizado. Iniciá sesión.";
    case 403:
      return "Acceso denegado. Permisos de administrador requeridos.";
    case 429:
      return "Demasiadas solicitudes. Esperá un momento.";
    case 400: {
      const msg = body?.error;
      return typeof msg === "string" && msg.trim()
        ? msg
        : "Error de validación. Revisá los datos ingresados.";
    }
    default:
      return "Error al guardar. Ningún registro fue modificado.";
  }
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
