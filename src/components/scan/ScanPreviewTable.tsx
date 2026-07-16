"use client";

/**
 * ScanPreviewTable — editable grid of extracted records.
 *
 * Per the design (Option A), each cell is a plain controlled <input>/
 * <select> bound to the local row state via the useScanData hook. The
 * "match resolution" cell surfaces the existing match status (badge) and
 * lets the user decide merge-vs-create for partial matches.
 *
 * Disabled while the parent is committing (controlled via `disabled`).
 */

import * as React from "react";
import { FileText, GitMerge, Package, Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchBadge } from "@/components/scan/MatchBadge";
import { cn } from "@/lib/utils";
import type { ScanRow } from "@/hooks/useScanData";

export interface ScanPreviewTableProps {
  rows: ScanRow[];
  disabled: boolean;
  onUpdate: (index: number, patch: Partial<Omit<ScanRow, "key">>) => void;
  onToggleInclude: (index: number) => void;
  onSetMergeAction: (index: number, action: "merge" | "create") => void;
}

const cellInputClass =
  "h-7 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-foreground/90 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const cellInputMutedClass =
  "h-7 w-full rounded-md border border-transparent bg-muted/30 px-2 text-sm text-foreground/80 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

export function ScanPreviewTable({
  rows,
  disabled,
  onUpdate,
  onToggleInclude,
  onSetMergeAction,
}: ScanPreviewTableProps) {
  const enabledCount = rows.filter((r) => r.include).length;

  return (
    <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-muted/30 px-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <FileText className="size-3.5" />
          {rows.length} {rows.length === 1 ? "registro extraído" : "registros extraídos"}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {enabledCount} seleccionados
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Incluir</TableHead>
            <TableHead className="min-w-[180px]">Nombre</TableHead>
            <TableHead className="w-36">Documento</TableHead>
            <TableHead className="min-w-[160px]">Sector</TableHead>
            <TableHead className="w-32">Tipo</TableHead>
            <TableHead className="min-w-[160px]">Notas</TableHead>
            <TableHead className="w-48">Coincidencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={row.key}
              className={cn(
                "align-top",
                !row.include && "opacity-50"
              )}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={() => onToggleInclude(idx)}
                  disabled={disabled}
                  aria-label={`Incluir fila ${idx + 1}`}
                  className="size-4 rounded border-slate-300 accent-indigo-600 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950"
                />
              </TableCell>

              <TableCell>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => onUpdate(idx, { name: e.target.value })}
                  disabled={disabled || !row.include}
                  placeholder="Nombre y apellido"
                  aria-label="Nombre"
                  className={cellInputClass}
                />
              </TableCell>

              <TableCell>
                <input
                  type="text"
                  value={row.document_id}
                  onChange={(e) => onUpdate(idx, { document_id: e.target.value })}
                  disabled={disabled || !row.include}
                  placeholder="Opcional"
                  aria-label="Documento"
                  className={cn(cellInputMutedClass, "font-mono text-xs")}
                />
              </TableCell>

              <TableCell>
                <input
                  type="text"
                  value={row.location}
                  onChange={(e) => onUpdate(idx, { location: e.target.value })}
                  disabled={disabled || !row.include}
                  placeholder="Sector"
                  aria-label="Sector"
                  className={cellInputClass}
                />
              </TableCell>

              <TableCell>
                <div className="flex flex-col gap-1">
                  {!row.received_supplies && !row.received_medical && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      ⚠ Sin tipo
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={row.received_supplies}
                        onChange={(e) =>
                          onUpdate(idx, { received_supplies: e.target.checked })
                        }
                        disabled={disabled || !row.include}
                        aria-label="Suministros"
                        className="size-3.5 rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed"
                      />
                      <Package className="size-3.5 text-indigo-500" />
                      <span className="text-[11px] font-medium text-foreground/80">
                        Sum.
                      </span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={row.received_medical}
                        onChange={(e) =>
                          onUpdate(idx, { received_medical: e.target.checked })
                        }
                        disabled={disabled || !row.include}
                        aria-label="Atención médica"
                        className="size-3.5 rounded border-slate-300 accent-rose-600 disabled:cursor-not-allowed"
                      />
                      <Stethoscope className="size-3.5 text-rose-500" />
                      <span className="text-[11px] font-medium text-foreground/80">
                        Méd.
                      </span>
                    </label>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <input
                  type="text"
                  value={row.notes}
                  onChange={(e) => onUpdate(idx, { notes: e.target.value })}
                  disabled={disabled || !row.include}
                  placeholder="Especialidad, médico, notas..."
                  aria-label="Notas"
                  className={cellInputMutedClass}
                />
              </TableCell>

              <TableCell>
                <MatchCell
                  row={row}
                  disabled={disabled || !row.include}
                  onSetMergeAction={(action) => onSetMergeAction(idx, action)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Per-row match cell ────────────────────────────────────────────────

interface MatchCellProps {
  row: ScanRow;
  disabled: boolean;
  onSetMergeAction: (action: "merge" | "create") => void;
}

function MatchCell({ row, disabled, onSetMergeAction }: MatchCellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <MatchBadge status={row.matchStatus} />

      {(row.matchStatus === "exact" || row.matchStatus === "partial") &&
        row.existingPersonName && (
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[10px] text-muted-foreground line-clamp-1"
              title={row.existingPersonName}
            >
              {row.matchStatus === "exact" ? "= " : "≈ "}
              {row.existingPersonName}
            </span>
            {row.existingPersonLocation && (
              <span className="text-[10px] text-muted-foreground/70 line-clamp-1">
                Sector: {row.existingPersonLocation}
              </span>
            )}
          </div>
        )}

      {row.matchStatus === "exact" && (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Se actualizará el registro existente
          </span>
          {row.location.trim() &&
            row.existingPersonLocation &&
            row.location.trim() !== row.existingPersonLocation && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                Sector se preserva. &ldquo;{row.location.trim()}&rdquo; va a las notas.
              </span>
            )}
        </div>
      )}

      {row.matchStatus === "partial" && (
        <PartialResolution
          row={row}
          disabled={disabled}
          onSetMergeAction={onSetMergeAction}
        />
      )}

      {row.matchStatus === "none" && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400">
          <Plus className="size-3" /> Se creará un nuevo registro
        </span>
      )}
    </div>
  );
}

function PartialResolution({
  row,
  disabled,
  onSetMergeAction,
}: {
  row: ScanRow;
  disabled: boolean;
  onSetMergeAction: (action: "merge" | "create") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="inline-flex w-full rounded-md border border-slate-200 bg-muted/40 p-0.5 dark:border-slate-800"
        role="radiogroup"
        aria-label="Resolver coincidencia parcial"
      >
        <Button
          type="button"
          variant={row.action === "merge" ? "default" : "ghost"}
          size="xs"
          onClick={() => onSetMergeAction("merge")}
          disabled={disabled}
          className="flex-1 h-6 px-1.5"
        >
          <GitMerge className="size-3 mr-1" />
          Fusionar
        </Button>
        <Button
          type="button"
          variant={row.action === "create" ? "default" : "ghost"}
          size="xs"
          onClick={() => onSetMergeAction("create")}
          disabled={disabled}
          className="flex-1 h-6 px-1.5"
        >
          <Plus className="size-3 mr-1" />
          Crear
        </Button>
      </div>

      <span className="text-[10px] text-muted-foreground">
        {row.action === "merge"
          ? "Actualiza el registro existente"
          : "Crea un nuevo registro"}
      </span>

      {row.action === "merge" &&
        row.location.trim() &&
        row.existingPersonLocation &&
        row.location.trim() !== row.existingPersonLocation && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            Sector se preserva. &ldquo;{row.location.trim()}&rdquo; va a las notas.
          </span>
        )}
    </div>
  );
}
