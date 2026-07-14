import React from "react";
import { Users, Package, Stethoscope, MapPin } from "lucide-react";
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

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
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
          title={suppliesFilter === "yes" ? "Quitar filtro de suministros" : "Filtrar por suministros entregados"}
          className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-indigo-500/5 to-transparent ${
            suppliesFilter === "yes" 
              ? "ring-2 ring-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm" 
              : "shadow-sm"
          }`}
        >
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suministros</span>
              <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight">{stats?.suppliesTotal || 0}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                <span>entregados</span>
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
          title={medicalFilter === "yes" ? "Quitar filtro de atención médica" : "Filtrar por atención médica recibida"}
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
      <div className="space-y-1.5">
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
    </div>
  );
}
