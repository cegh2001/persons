import React from "react";
import { Skeleton } from "boneyard-js/react";
import {
  Users,
  Package,
  Stethoscope,
  MapPin,
  Boxes,
  HeartPulse,
  ListOrdered,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Stats } from "@/types/person";

interface CensoStatsProps {
  stats: Stats | null;
  sectors: string[];
  locationFilter: string;
  onLocationFilterChange: (val: string) => void;
  suppliesFilter: string;
  onSuppliesFilterChange: (val: string) => void;
  medicalFilter: string;
  onMedicalFilterChange: (val: string) => void;
}

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
  colchoneta: "Colchoneta",
  carpas: "Carpas",
  silla_ruedas: "Silla de ruedas",
  muletas: "Muletas",
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

// ── Small inline skeleton blocks for the new sections ─────────────────

function KpiSkeleton() {
  return (
    <Card className="border-slate-200/60 dark:border-slate-800/60 bg-card/60 shadow-none">
      <CardContent className="p-4 flex flex-col gap-2 h-full min-h-24">
        <div className="h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
        <div className="h-7 w-16 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
        <div className="h-2.5 w-20 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
      </CardContent>
    </Card>
  );
}

function BarSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-24 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-2.5 w-6 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiSkeleton />
      <KpiSkeleton />
      <KpiSkeleton />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function CensoStats({
  stats,
  sectors,
  locationFilter,
  onLocationFilterChange,
  suppliesFilter,
  onSuppliesFilterChange,
  medicalFilter,
  onMedicalFilterChange
}: CensoStatsProps) {
  const hasActiveCardFilter = suppliesFilter !== "all" || medicalFilter !== "all";

  // Top 5 items by count, descending.
  const topItems = React.useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.itemsDistributed ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats]);

  const topItemMax = topItems.length > 0 ? topItems[0][1] : 1;

  const specialties = React.useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.medicalBySpecialty ?? {}).sort(
      (a, b) => b[1] - a[1]
    );
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <Skeleton
        name="censo-stats"
        loading={!stats}
        animate="pulse"
        transition={300}
        fixture={
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-slate-500/5 to-transparent shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Censo</span>
                    <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold tracking-tight">1,234</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-semibold text-red-500">156</span> vulnerables
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-indigo-500/5 to-transparent shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personas con suministros</span>
                    <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold tracking-tight">890</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span>con entrega</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-rose-500/5 to-transparent shadow-sm">
                <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atenc. Médica</span>
                    <Stethoscope className="size-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold tracking-tight">432</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span>atendidos</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-1.5 mt-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">
                Filtro rápido por sector
              </span>
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5">
                {["Calle Paez", "Casco Central", "El Collao", "Palmar Este", "San Julian"].map((sector) => (
                  <Card key={sector} className="border-slate-200/60 dark:border-slate-800/60 flex-shrink-0 w-36 shadow-sm">
                    <CardContent className="p-3 flex flex-col justify-between h-full min-h-20">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate w-full">{sector}</span>
                        <MapPin className="size-3.5 flex-shrink-0 text-indigo-500" />
                      </div>
                      <div className="mt-1">
                        <span className="text-xl font-bold tracking-tight">200</span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          <span className="font-semibold text-red-500">30</span> vulnerables
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* New sections placeholder */}
            <KpiGridSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
                  <BarSkeleton />
                </CardContent>
              </Card>
              <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="h-3 w-36 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
                  <BarSkeleton />
                </CardContent>
              </Card>
            </div>
          </>
        }
      >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total card */}
        <Card
          onClick={() => {
            if (hasActiveCardFilter) {
              onSuppliesFilterChange("all");
              onMedicalFilterChange("all");
            }
          }}
          title={hasActiveCardFilter ? "Hacé click para limpiar los filtros de suministros y atención médica" : undefined}
          className={`border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-slate-500/5 to-transparent ${
            hasActiveCardFilter
              ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ring-1 ring-slate-500/30"
              : "shadow-sm"
          }`}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Censo</span>
              <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">{stats?.total || 0}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span className="font-semibold text-red-500">{stats?.vulnerableTotal || 0}</span> vulnerables
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Supplies card */}
        <Card
          onClick={() => onSuppliesFilterChange(suppliesFilter === "yes" ? "all" : "yes")}
          title={suppliesFilter === "yes" ? "Quitar filtro" : "Filtrar por personas con suministros entregados"}
          className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-indigo-500/5 to-transparent ${
            suppliesFilter === "yes"
              ? "ring-2 ring-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm"
              : "shadow-sm"
          }`}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personas con suministros</span>
              <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">{stats?.suppliesTotal || 0}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                <span>con entrega</span>
                {suppliesFilter === "yes" && (
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">Filtrado</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medical card */}
        <Card
          onClick={() => onMedicalFilterChange(medicalFilter === "yes" ? "all" : "yes")}
          title={medicalFilter === "yes" ? "Quitar filtro" : "Filtrar por personas con atención médica recibida"}
          className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-rose-500/5 to-transparent ${
            medicalFilter === "yes"
              ? "ring-2 ring-rose-500/50 bg-rose-500/5 dark:bg-rose-500/10 shadow-sm"
              : "shadow-sm"
          }`}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atenc. Médica</span>
              <Stethoscope className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">{stats?.medicalTotal || 0}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                <span>atendidos</span>
                {medicalFilter === "yes" && (
                  <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">Filtrado</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector cards with horizontal scroll */}
      <div className="space-y-1.5 mt-4">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Filtro rápido por sector
          </span>
          {locationFilter !== "all" && (
            <button
              onClick={() => onLocationFilterChange("all")}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-thin scrollbar-thumb-slate-200/80 dark:scrollbar-thumb-slate-800/80">
          {sectors.map((sector) => {
            const sectorData = stats?.byLocation.find((l) => l.location === sector);
            const count = sectorData?.count || 0;
            const vulnCount = sectorData?.vulnerableCount || 0;

            let iconColor = "text-indigo-500";
            if (sector === "Casco Central") iconColor = "text-violet-500";
            if (sector === "El Collao") iconColor = "text-rose-500";
            if (sector === "Palmar Este") iconColor = "text-emerald-500";
            if (sector === "San Julian") iconColor = "text-amber-500";

            return (
              <Card
                key={sector}
                onClick={() => onLocationFilterChange(locationFilter === sector ? "all" : sector)}
                className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/60 dark:border-slate-800/60 flex-shrink-0 w-36 ${
                  locationFilter === sector
                    ? "ring-2 ring-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10"
                    : ""
                }`}
              >
                <CardContent className="p-3 flex flex-col justify-between h-full min-h-20">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate w-full" title={sector}>
                      {sector}
                    </span>
                    <MapPin className={`size-3.5 flex-shrink-0 ${iconColor}`} />
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-bold tracking-tight">{count}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      <span className="font-semibold text-red-500">{vulnCount}</span> vulnerables
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── New structured-deliveries KPIs ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-indigo-500/5 to-transparent shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregas realizadas</span>
              <Boxes className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">
                {stats?.totalDeliveries ?? 0}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span>entregas registradas</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-violet-500/5 to-transparent shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personas alcanzadas</span>
              <Users className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">
                {stats?.personsReached ?? 0}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span>individuales + colectivas</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-rose-500/5 to-transparent shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atenciones médicas</span>
              <HeartPulse className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">
                {stats?.totalMedicalAttentions ?? 0}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span>consultas registradas</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top items + Specialties ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6">
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Boxes className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Ítems más entregados
              </h3>
              <span className="text-[10px] font-semibold text-muted-foreground">
                top 5
              </span>
            </div>
            {topItems.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                Sin entregas registradas aún.
              </p>
            ) : (
              <ul className="space-y-2">
                {topItems.map(([item, count]) => {
                  const pct = topItemMax > 0 ? (count / topItemMax) * 100 : 0;
                  return (
                    <li key={item} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {SUPPLY_LABELS[item] ?? item}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500/80 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <ListOrdered className="size-3.5 text-rose-600 dark:text-rose-400" />
                Atenciones por especialidad
              </h3>
            </div>
            {specialties.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                Sin atenciones registradas todavía.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {specialties.map(([spec, count]) => (
                  <li
                    key={spec}
                    className="flex items-center justify-between text-[11px] py-1 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {SPECIALTY_LABELS[spec] ?? spec}
                    </span>
                    <span className="font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </Skeleton>
    </div>
  );
}
