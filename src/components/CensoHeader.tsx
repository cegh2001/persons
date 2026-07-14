import React from "react";
import { Plus, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CensoHeaderProps {
  onAddOpen: () => void;
}

export function CensoHeader({ onAddOpen }: CensoHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-200/50 dark:text-indigo-400 dark:border-indigo-900/40">
            <Sparkles className="size-3 mr-1 inline" /> Sismo 2026
          </Badge>
          <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-600 border-slate-200/50 dark:text-slate-400">
            <Database className="size-3 mr-1 inline" /> SQLite Activo
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-100 dark:via-indigo-200 dark:to-slate-100 bg-clip-text text-transparent sm:text-3xl">
          Censo de Damnificados
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualización, búsqueda y gestión de vulnerabilidad para asignación de suministros.
        </p>
      </div>

      <Button 
        onClick={onAddOpen} 
        className="w-full md:w-auto shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 transition-all"
      >
        <Plus className="size-4 mr-2" /> Registrar Damnificado
      </Button>
    </header>
  );
}
