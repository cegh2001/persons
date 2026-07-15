"use client";

/**
 * MatchBadge — small status pill that classifies an extracted row against
 * the existing persons table. Three variants mirror the three states the
 * server can return from the scan endpoint:
 *   - "exact"   → green  "Existente"        (CheckCircle2)
 *   - "partial" → amber  "Posible duplicado" (AlertTriangle)
 *   - "none"    → blue   "Nuevo"            (PlusCircle)
 */

import * as React from "react";
import { AlertTriangle, CheckCircle2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/db-scan";

const VARIANT_STYLES: Record<MatchStatus, { label: string; className: string }> = {
  exact: {
    label: "Existente",
    className:
      "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400",
  },
  partial: {
    label: "Posible duplicado",
    className:
      "border-amber-200/70 bg-amber-500/10 text-amber-700 dark:border-amber-900/50 dark:text-amber-400",
  },
  none: {
    label: "Nuevo",
    className:
      "border-sky-200/70 bg-sky-500/10 text-sky-700 dark:border-sky-900/50 dark:text-sky-400",
  },
};

const ICON_MAP: Record<MatchStatus, React.ComponentType<{ className?: string }>> = {
  exact: CheckCircle2,
  partial: AlertTriangle,
  none: PlusCircle,
};

export interface MatchBadgeProps {
  status: MatchStatus;
  className?: string;
}

export function MatchBadge({ status, className }: MatchBadgeProps) {
  const meta = VARIANT_STYLES[status];
  const Icon = ICON_MAP[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold",
        meta.className,
        className
      )}
      role="status"
      aria-label={meta.label}
    >
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
