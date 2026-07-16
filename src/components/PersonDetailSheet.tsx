"use client";

import React, { useEffect } from "react";
import {
  X,
  Package,
  Stethoscope,
  Plus,
  Users,
  CalendarDays,
  UserCheck,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useMedicalAttentions } from "@/hooks/useMedicalAttentions";
import type { Person } from "@/types/person";

interface PersonDetailSheetProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  role: "admin" | "visor";
  onNewDelivery: (personId: number) => void;
  onNewAttention: (personId: number) => void;
}

// ── Tiny inline skeleton (no boneyard bone registered for these) ──────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="size-9 rounded-md bg-slate-200/70 dark:bg-slate-800/60 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
        <div className="h-2.5 w-1/3 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

const SUPPLY_LABELS: Record<string, string> = {
  agua: "Agua",
  electrolit: "Electrolit",
  kit_aseo: "Kit de aseo",
  kit_alimento: "Kit de alimento",
  pañales: "Pañales",
  kit_higiene: "Kit de higiene",
  medicamentos: "Medicamentos",
  ropa: "Ropa",
  protector_cama: "Protector de cama",
  toallas: "Toallas",
  otros: "Otros",
};

const SPECIALTY_LABELS: Record<string, string> = {
  traumatologia: "Traumatología",
  fisioterapia: "Fisioterapia",
  medicina_interna: "Medicina interna",
  medicina_general: "Medicina general",
  pediatria: "Pediatría",
  psicologia: "Psicología",
  endocrinologia: "Endocrinología",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function PersonDetailSheet({
  person,
  isOpen,
  onClose,
  role,
  onNewDelivery,
  onNewAttention,
}: PersonDetailSheetProps) {
  const personId = person?.id ?? null;
  const isAdmin = role === "admin";

  const {
    deliveries,
    loading: loadingDeliveries,
    refetch: refetchDeliveries,
  } = useDeliveries(personId);
  const {
    attentions,
    loading: loadingAttentions,
    refetch: refetchAttentions,
  } = useMedicalAttentions(personId);

  // Escape key dismiss.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Refetch when the sheet opens (so the user always sees fresh data).
  useEffect(() => {
    if (isOpen && personId !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refetchDeliveries();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refetchAttentions();
    }
  }, [isOpen, personId, refetchDeliveries, refetchAttentions]);

  if (!person) return null;

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${person.name}`}
        className={`absolute top-0 right-0 h-full w-full sm:w-[480px] bg-popover shadow-2xl ring-1 ring-foreground/10 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 p-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <Users className="size-3" /> Detalle de persona
            </div>
            <h2 className="text-lg font-bold tracking-tight truncate">
              {person.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {person.document_id && (
                <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900">
                  <Hash className="size-2.5 mr-1" />
                  {person.document_id}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {person.location}
              </Badge>
              {person.is_vulnerable === 1 && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-red-200 bg-red-50 text-red-700"
                >
                  Vulnerable
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <X className="size-4" />
          </Button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ── Entregas ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Entregas
                </h3>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  ({deliveries.length})
                </span>
              </div>
              {isAdmin && (
                <Button
                  size="xs"
                  variant="outline"
                  className="border-indigo-200/70 text-indigo-700 hover:bg-indigo-500/10 dark:border-indigo-900/50 dark:text-indigo-300"
                  onClick={() => onNewDelivery(person.id)}
                >
                  <Plus className="size-3" /> Nueva entrega
                </Button>
              )}
            </div>

            {loadingDeliveries ? (
              <SectionSkeleton rows={3} />
            ) : deliveries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                <Package className="size-5 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Sin entregas registradas
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {deliveries.map((d) => {
                  const items = d.items?.map((i) => i.item) ?? [];
                  const individual = d.delivery_type === "individual";
                  return (
                    <li
                      key={d.id}
                      className="rounded-lg border border-slate-200/70 dark:border-slate-800/70 p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            individual
                              ? "text-[10px] border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-300"
                              : "text-[10px] border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900/50 dark:text-violet-300"
                          }
                        >
                          {individual ? "Individual" : "Colectiva"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="size-2.5" />
                          {formatDate(d.created_at)}
                        </span>
                      </div>
                      {items.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {items.map((it) => (
                            <span
                              key={it}
                              className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                            >
                              {SUPPLY_LABELS[it] ?? it}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] italic text-muted-foreground">
                          Sin ítems registrados
                        </p>
                      )}
                      {!individual && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="size-2.5" />
                          {d.beneficiary_count} persona
                          {d.beneficiary_count === 1 ? "" : "s"} alcanzada
                          {d.beneficiary_count === 1 ? "" : "s"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── Atenciones Médicas ───────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Atenciones Médicas
                </h3>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  ({attentions.length})
                </span>
              </div>
              {isAdmin && (
                <Button
                  size="xs"
                  variant="outline"
                  className="border-rose-200/70 text-rose-700 hover:bg-rose-500/10 dark:border-rose-900/50 dark:text-rose-300"
                  onClick={() => onNewAttention(person.id)}
                >
                  <Plus className="size-3" /> Nueva atención
                </Button>
              )}
            </div>

            {loadingAttentions ? (
              <SectionSkeleton rows={2} />
            ) : attentions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                <Stethoscope className="size-5 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Sin atenciones registradas
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attentions.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-slate-200/70 dark:border-slate-800/70 p-3 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
                      >
                        {SPECIALTY_LABELS[a.specialty] ?? a.specialty}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="size-2.5" />
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      <UserCheck className="size-3 text-slate-400" />
                      {a.professional}
                    </div>
                    {(a.patient_age !== null ||
                      a.patient_sex !== null ||
                      a.diagnosis !== null) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        {a.patient_age !== null && (
                          <span>Edad: {a.patient_age}</span>
                        )}
                        {a.patient_sex !== null && (
                          <span>Sexo: {a.patient_sex}</span>
                        )}
                        {a.diagnosis !== null && a.diagnosis !== "" && (
                          <span className="line-clamp-1">
                            Dx: {a.diagnosis}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
