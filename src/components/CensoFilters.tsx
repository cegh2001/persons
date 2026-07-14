import React from "react";
import { Search, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

interface CensoFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  sectors: string[];
  locationFilter: string;
  onLocationFilterChange: (val: string) => void;
  vulnerabilityFilter: string;
  onVulnerabilityFilterChange: (val: string) => void;
}

export function CensoFilters({
  search,
  onSearchChange,
  sectors,
  locationFilter,
  onLocationFilterChange,
  vulnerabilityFilter,
  onVulnerabilityFilterChange
}: CensoFiltersProps) {
  return (
    <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
      
      {/* Search Input */}
      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, cédula, notas..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background border-slate-200/80 dark:border-slate-800/80 h-8 text-sm"
        />
      </div>

      {/* Filter Sectors Combobox */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:inline flex-shrink-0">
          Sector:
        </span>
        <Combobox
          items={["Todos los Sectores", ...sectors]}
          value={locationFilter === "all" ? "Todos los Sectores" : locationFilter}
          onValueChange={(val) => {
            onLocationFilterChange(val === "Todos los Sectores" ? "all" : (val ?? "all"));
          }}
        >
          <ComboboxInput
            placeholder="Seleccionar sector..."
            className="w-full md:w-[220px]"
            showTrigger
            showClear={locationFilter !== "all"}
          />
          <ComboboxContent>
            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item} className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>{item}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Filter Vulnerability Segmented Control */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 w-full md:w-auto justify-center">
        <button
          onClick={() => onVulnerabilityFilterChange("all")}
          className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
            vulnerabilityFilter === "all"
              ? "bg-white text-slate-950 dark:bg-slate-900 dark:text-slate-50 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => onVulnerabilityFilterChange("vulnerable")}
          className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
            vulnerabilityFilter === "vulnerable"
              ? "bg-red-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-red-500"
          }`}
        >
          <AlertTriangle className="size-3" /> Vulnerables
        </button>
        <button
          onClick={() => onVulnerabilityFilterChange("stable")}
          className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
            vulnerabilityFilter === "stable"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-emerald-500"
          }`}
        >
          <CheckCircle2 className="size-3" /> Estables
        </button>
      </div>
    </div>
  );
}
