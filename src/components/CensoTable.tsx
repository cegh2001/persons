import React from "react";
import { Skeleton } from "boneyard-js/react";
import { 
  Map, 
  Heart, 
  HeartOff, 
  FileText, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Stethoscope 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { Person } from "@/types/person";
import { getLocationColor } from "@/lib/utils";

interface CensoTableProps {
  persons: Person[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onToggleVulnerable: (person: Person) => void;
  onToggleSupplies: (person: Person) => void;
  onToggleMedical: (person: Person) => void;
  onEditOpen: (person: Person) => void;
  onDeleteOpen: (person: Person) => void;
  role: "admin" | "visor";
}

export function CensoTable({
  persons,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onToggleVulnerable,
  onToggleSupplies,
  onToggleMedical,
  onEditOpen,
  onDeleteOpen,
  role
}: CensoTableProps) {
  const isAdmin = role === "admin";

  return (
    <>
      {/* Table Container */}
      <div className="relative min-h-[300px]">
        <Skeleton
          name="censo-table"
          loading={loading}
          animate="shimmer"
          stagger={50}
          transition={300}
          fixture={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula / Documento</TableHead>
                  <TableHead>Sector / Ubicación</TableHead>
                  <TableHead>Vulnerabilidad</TableHead>
                  <TableHead>Asistencia</TableHead>
                  <TableHead className="hidden md:table-cell max-w-md">Notas y Entregas</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      Nombre Apellido
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-slate-50 dark:bg-slate-900">
                        V-12345678
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border border-indigo-200 text-indigo-700">
                        Calle Paez
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                        <Heart className="size-3 fill-red-500 text-red-500" /> Vulnerable
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
                          <Package className="size-3" /> Suministros
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200 text-slate-400">
                          <Stethoscope className="size-3" /> Médica
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-md text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <FileText className="size-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="line-clamp-2">Notas de ejemplo para el registro</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="icon-xs" className="text-slate-500">
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" className="text-destructive/80">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          {persons.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400">
              <Map className="size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">No se encontraron personas</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Ajustá los filtros de búsqueda o registrá a una persona en este sector.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula / Documento</TableHead>
                <TableHead>Sector / Ubicación</TableHead>
                <TableHead>Vulnerabilidad</TableHead>
                <TableHead>Asistencia</TableHead>
                <TableHead className="hidden md:table-cell max-w-md">Notas y Entregas</TableHead>
                {isAdmin && <TableHead className="w-24 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map((person) => (
                <TableRow key={person.id} className="group/row">
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                    {person.name}
                  </TableCell>
                  <TableCell>
                    {person.document_id ? (
                      <Badge variant="outline" className="font-mono text-xs bg-slate-50 dark:bg-slate-900">
                        {person.document_id}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">Sin Cédula</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs border ${getLocationColor(person.location)}`}
                    >
                      {person.location}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {person.is_vulnerable === 1 ? (
                      isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onToggleVulnerable(person)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/50 transition-all"
                          title="Haz clic para quitar tilde de vulnerable"
                        >
                          <Heart className="size-3 fill-red-500 text-red-500" /> Vulnerable
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                          <Heart className="size-3 fill-red-500 text-red-500" /> Vulnerable
                        </div>
                      )
                    ) : (
                      isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onToggleVulnerable(person)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all"
                          title="Haz clic para marcar como vulnerable"
                        >
                          <HeartOff className="size-3 text-slate-400 group-hover:text-red-500" /> Estable
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
                          <HeartOff className="size-3 text-slate-400" /> Estable
                        </div>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onToggleSupplies(person)}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                            person.received_supplies === 1
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400"
                              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                          title="Click para cambiar estado de suministros"
                        >
                          <Package className="size-3 mr-1 inline" /> Suministros
                        </button>
                      ) : (
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            person.received_supplies === 1
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400"
                              : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                        >
                          <Package className="size-3 mr-1 inline" /> Suministros
                        </div>
                      )}

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => onToggleMedical(person)}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                            person.received_medical === 1
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400"
                              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                          title="Click para cambiar estado de atención médica"
                        >
                          <Stethoscope className="size-3 mr-1 inline" /> Médica
                        </button>
                      ) : (
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            person.received_medical === 1
                              ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400"
                              : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                        >
                          <Stethoscope className="size-3 mr-1 inline" /> Médica
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-md text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5">
                      <FileText className="size-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2" title={person.notes}>
                        {person.notes || <span className="italic text-muted-foreground/50">Sin notas agregadas...</span>}
                      </span>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          onClick={() => onEditOpen(person)}
                          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar damnificado"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          onClick={() => onDeleteOpen(person)}
                          className="text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar damnificado"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </Skeleton>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/10 dark:bg-slate-900/5">
          <span className="text-xs text-muted-foreground">
            Mostrando página <strong className="font-semibold text-foreground">{page}</strong> de <strong className="font-semibold text-foreground">{totalPages}</strong> (Total: {total} registros)
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="size-7 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              if (
                pNum === 1 ||
                pNum === totalPages ||
                Math.abs(pNum - page) <= 1
              ) {
                return (
                  <Button
                    key={pNum}
                    variant={page === pNum ? "default" : "outline"}
                    size="xs"
                    onClick={() => onPageChange(pNum)}
                    className="size-7"
                  >
                    {pNum}
                  </Button>
                );
              } else if (
                pNum === 2 ||
                pNum === totalPages - 1
              ) {
                return <span key={pNum} className="text-xs text-muted-foreground px-1">...</span>;
              }
              return null;
            })}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="size-7 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
