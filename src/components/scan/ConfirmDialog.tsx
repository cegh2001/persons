"use client";

/**
 * ConfirmDialog — summary panel + final commit step.
 *
 * Renders the count breakdown (new vs. updated) and a "Confirmar"
 * button. It is intended to be embedded inside the ScanUpload dialog
 * as the third step (after upload → preview). The "Dialog" name is
 * from the design spec — the actual dialog chrome is owned by
 * ScanUpload.
 */

import * as React from "react";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanRow } from "@/hooks/useScanData";

export interface ConfirmDialogProps {
  rows: ScanRow[];
  committing: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmDialog({
  rows,
  committing,
  onConfirm,
  onBack,
}: ConfirmDialogProps) {
  const included = rows.filter((r) => r.include);
  const newCount = included.filter(
    (r) => r.matchStatus === "none" || (r.matchStatus === "partial" && r.action === "create")
  ).length;
  const updateCount = included.filter(
    (r) => r.matchStatus === "exact" || (r.matchStatus === "partial" && r.action === "merge")
  ).length;
  const skippedCount = rows.length - included.length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-muted/20 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Resumen del lote
        </p>

        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            icon={<Plus className="size-4" />}
            label="Nuevos"
            value={newCount}
            tone="sky"
          />
          <SummaryTile
            icon={<RefreshCw className="size-4" />}
            label="Actualizados"
            value={updateCount}
            tone="emerald"
          />
        </div>

        {skippedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-3">
            {skippedCount} {skippedCount === 1 ? "registro será omitido" : "registros serán omitidos"} (sin incluir).
          </p>
        )}
      </div>

      <div className="rounded-lg border border-amber-200/70 bg-amber-500/5 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-300">
        <p className="font-semibold mb-1">Revisá antes de confirmar</p>
        <p className="text-amber-700/80 dark:text-amber-300/80">
          Esta acción registra los datos en el censo. Los registros marcados como
          “Existente” o “Fusionar” se actualizarán con los valores editados.
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={committing}
        >
          Volver a editar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={committing || included.length === 0}
        >
          {committing ? (
            <>
              <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4 mr-2" />
              Confirmar {included.length} {included.length === 1 ? "registro" : "registros"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface SummaryTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "sky" | "emerald";
}

function SummaryTile({ icon, label, value, tone }: SummaryTileProps) {
  const toneClass =
    tone === "sky"
      ? "border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-900/50 dark:text-sky-400"
      : "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 ${toneClass}`}
    >
      <div className="flex items-center justify-center size-8 rounded-md bg-background/40 dark:bg-background/20">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {label}
        </span>
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
    </div>
  );
}
