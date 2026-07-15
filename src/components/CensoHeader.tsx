import React from "react";
import { Plus, Sparkles, Database, LogOut, ScanLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CensoHeaderProps {
  onAddOpen: () => void;
  onScanOpen: () => void;
  role: "admin" | "visor";
  onLogout: () => void;
}

export function CensoHeader({ onAddOpen, onScanOpen, role, onLogout }: CensoHeaderProps) {
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
          <Badge variant="outline" className={`text-xs capitalize font-semibold border ${
            role === "admin" 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:text-emerald-400 dark:border-emerald-900/40"
              : "bg-amber-500/10 text-amber-600 border-amber-200/50 dark:text-amber-400 dark:border-amber-900/40"
          }`}>
            Rol: {role === "admin" ? "Administrador" : "Visor"}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-100 dark:via-indigo-200 dark:to-slate-100 bg-clip-text text-transparent sm:text-3xl">
          Censo de Damnificados
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualización, búsqueda y gestión de vulnerabilidad para asignación de suministros.
        </p>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto">
        {role === "admin" && (
          <>
            <Button
              onClick={onScanOpen}
              variant="outline"
              className="flex-1 md:flex-initial shadow-sm border-indigo-200/70 text-indigo-700 hover:bg-indigo-500/10 hover:text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-500/10 transition-all"
              title="Escanear una lista manuscrita con Gemini"
            >
              <ScanLine className="size-4 mr-2" /> Escanear Lista
            </Button>
            <Button
              onClick={onAddOpen}
              className="flex-1 md:flex-initial shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 transition-all"
            >
              <Plus className="size-4 mr-2" /> Registrar Damnificado
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={() => {
            const tableElement = document.getElementById("tabla-damnificados");
            if (tableElement) {
              tableElement.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className="flex-1 md:flex-initial shadow-sm transition-all"
        >
          <Users className="size-4 mr-2" /> Ver Personas
        </Button>
        <Button
          variant="outline"
          onClick={onLogout}
          className="flex-1 md:flex-initial text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:text-red-400"
        >
          <LogOut className="size-4 mr-2" /> Cerrar Sesión
        </Button>
      </div>
    </header>
  );
}
