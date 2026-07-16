"use client";

/**
 * ScanUpload — dialog that orchestrates the full Gemini scan flow.
 *
 * Step 1 (upload): file input + client-side resize + POST to /api/persons/scan.
 * Step 2 (preview): editable table with per-row match resolution.
 * Step 3 (confirm): summary of INSERTs vs UPDATEs + final commit.
 *
 * The dialog chrome wraps the entire flow; internal `step` state controls
 * which content is rendered. All data and side effects live in the
 * useScanData hook — this component is purely presentational + glue.
 */

import * as React from "react";
import { ArrowLeft, ArrowRight, Camera, Loader2, ScanLine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScanData } from "@/hooks/useScanData";
import { ScanPreviewTable } from "@/components/scan/ScanPreviewTable";
import { ConfirmDialog } from "@/components/scan/ConfirmDialog";
import { cn } from "@/lib/utils";

export interface ScanUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommitted?: (count: number) => void;
}

const ALLOWED_ACCEPT = "image/jpeg,image/jpg,image/png";

export function ScanUpload({ open, onOpenChange, onCommitted }: ScanUploadProps) {
  const scan = useScanData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [showCachePrompt, setShowCachePrompt] = React.useState(false);
  const wasOpenRef = React.useRef(open);

  // ── When dialog opens, check for cached data ────────────────────
  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened. If there's cached data and no rows loaded yet, prompt.
      if (scan.hasCachedData && !scan.hasRows) {
        setShowCachePrompt(true);
      }
    }
    wasOpenRef.current = open;
  }, [open, scan.hasCachedData, scan.hasRows]);

  // ── Reset local UI state (image preview, file input) — does NOT
  //     touch hook data so the cache survives modal close. ──────────
  const resetLocalState = React.useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDragOver(false);
    setShowCachePrompt(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        resetLocalState();
      }
      onOpenChange(next);
    },
    [onOpenChange, resetLocalState]
  );

  // ── Cache actions ───────────────────────────────────────────────
  const handleRestore = () => {
    scan.restoreFromCache();
    setShowCachePrompt(false);
  };

  const handleDiscard = () => {
    scan.discardCache();
    setShowCachePrompt(false);
  };

  // ── File selection handler ───────────────────────────────────────
  const handleFile = React.useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      await scan.startScan(file);
    },
    [previewUrl, scan]
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  // ── Step navigation ──────────────────────────────────────────────
  const goToConfirm = () => scan.setConfirming(true);
  const goToPreview = () => scan.setConfirming(false);

  const handleConfirm = async () => {
    const count = await scan.commit();
    if (count !== null && count > 0) {
      onCommitted?.(count);
      handleOpenChange(false);
    }
    // On error, the hook shows the toast; user stays on the dialog.
  };

  const isUploading = scan.phase === "uploading";
  const isCommitting = scan.phase === "committing";
  const showPreview = scan.hasRows && !isUploading;
  const showConfirm = scan.confirming && scan.hasRows && !isUploading;

  // Dialog width adapts to the step content.
  const contentClass = showConfirm
    ? "sm:max-w-md"
    : showPreview
      ? "sm:max-w-5xl"
      : "sm:max-w-md";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", contentClass)}>
        {/* ── Cache restoration prompt ──────────────────────────── */}
        {showCachePrompt && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3">
            <div className="flex items-start gap-2">
              <ScanLine className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Tenés un escaneo pendiente
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Se encontraron datos de un escaneo anterior que no fue confirmado.
                  Podés restaurarlo para seguir editando o descartarlo.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleRestore}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Restaurar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
              >
                <Trash2 className="size-3.5 mr-1" />
                Descartar
              </Button>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-4 text-indigo-600 dark:text-indigo-400" />
            Escanear Lista de Damnificados
          </DialogTitle>
          <DialogDescription>
            Subí una foto de la lista manuscrita. La aplicación extrae los datos
            y te permite revisarlos antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          {/* ── Step 1: Upload ──────────────────────────────────── */}
          {!showPreview && !showConfirm && (
            <UploadStep
              isUploading={isUploading}
              previewUrl={previewUrl}
              dragOver={dragOver}
              fileInputRef={fileInputRef}
              allowedAccept={ALLOWED_ACCEPT}
              errorMessage={scan.errorMessage}
              onFileInputChange={onFileInputChange}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onPickFile={() => fileInputRef.current?.click()}
              onClearPreview={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                scan.clearError();
              }}
            />
          )}

          {/* ── Step 2: Preview ────────────────────────────────── */}
          {showPreview && !showConfirm && (
            <PreviewStep
              rows={scan.rows}
              disabled={isCommitting}
              errorMessage={scan.errorMessage}
              onUpdate={scan.updateRow}
              onToggleInclude={scan.toggleInclude}
              onSetMergeAction={scan.setMergeAction}
            />
          )}

          {/* ── Step 3: Confirm ────────────────────────────────── */}
          {showConfirm && (
            <ConfirmDialog
              rows={scan.rows}
              committing={isCommitting}
              onConfirm={handleConfirm}
              onBack={goToPreview}
            />
          )}
        </div>

        {!showConfirm && (
          <DialogFooter>
            {showPreview ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    handleDiscard();
                    handleOpenChange(false);
                  }}
                  disabled={isUploading || isCommitting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Descartar
                </Button>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={isUploading || isCommitting}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={goToConfirm}
                  disabled={isCommitting || scan.rows.filter((r) => r.include).length === 0}
                >
                  Continuar
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isUploading || isCommitting}
              >
                Cancelar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Step 1: Upload ────────────────────────────────────────────────────

interface UploadStepProps {
  isUploading: boolean;
  previewUrl: string | null;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  allowedAccept: string;
  errorMessage: string | null;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onPickFile: () => void;
  onClearPreview: () => void;
}

function UploadStep({
  isUploading,
  previewUrl,
  dragOver,
  fileInputRef,
  allowedAccept,
  errorMessage,
  onFileInputChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onPickFile,
  onClearPreview,
}: UploadStepProps) {
  return (
    <div className="space-y-3">
      <div
        onClick={isUploading ? undefined : onPickFile}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Subir imagen de lista"
        aria-disabled={isUploading}
        onKeyDown={(e) => {
          if (!isUploading && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onPickFile();
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          "border-slate-300 dark:border-slate-700",
          "hover:border-indigo-400 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10",
          dragOver && "border-indigo-500 bg-indigo-500/10",
          isUploading && "cursor-wait opacity-80",
          !isUploading && "cursor-pointer"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedAccept}
          onChange={onFileInputChange}
          disabled={isUploading}
          className="sr-only"
          aria-hidden="true"
        />

        {isUploading ? (
          <>
            <Loader2 className="size-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Procesando imagen con Gemini...</p>
              <p className="text-xs text-muted-foreground">
                Esto puede tardar unos segundos.
              </p>
            </div>
          </>
        ) : previewUrl ? (
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vista previa de la lista"
                className="max-h-40 w-auto rounded-md border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearPreview();
                }}
                className="absolute -top-2 -right-2 inline-flex items-center justify-center size-6 rounded-full bg-slate-900 text-white shadow hover:bg-slate-700"
                aria-label="Quitar imagen"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hacé clic para cambiar la imagen, o volvé a intentarlo.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center size-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Camera className="size-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">
                Hacé clic o arrastrá una imagen
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos aceptados: JPG, PNG. Máximo 8 MB.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPickFile();
              }}
            >
              Seleccionar archivo
            </Button>
          </>
        )}
      </div>

      {errorMessage && !isUploading && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        La imagen se redimensiona automáticamente a 2048px antes de enviarse.
      </p>
    </div>
  );
}

// ── Step 2: Preview ───────────────────────────────────────────────────

interface PreviewStepProps {
  rows: ReturnType<typeof useScanData>["rows"];
  disabled: boolean;
  errorMessage: string | null;
  onUpdate: ReturnType<typeof useScanData>["updateRow"];
  onToggleInclude: ReturnType<typeof useScanData>["toggleInclude"];
  onSetMergeAction: ReturnType<typeof useScanData>["setMergeAction"];
}

function PreviewStep({
  rows,
  disabled,
  errorMessage,
  onUpdate,
  onToggleInclude,
  onSetMergeAction,
}: PreviewStepProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
        <ScanLine className="size-3.5 mt-0.5 shrink-0" />
        <p>
          Revisá los datos extraídos. Editá cualquier celda antes de
          confirmar. Las filas sin tilde en “Incluir” se omiten.
        </p>
      </div>

      <ScanPreviewTable
        rows={rows}
        disabled={disabled}
        onUpdate={onUpdate}
        onToggleInclude={onToggleInclude}
        onSetMergeAction={onSetMergeAction}
      />

      {errorMessage && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end items-center pt-1">
        <span className="text-[11px] text-muted-foreground">
          {rows.filter((r) => r.include).length} de {rows.length} seleccionados
        </span>
      </div>
    </div>
  );
}
