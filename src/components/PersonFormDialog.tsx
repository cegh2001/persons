import React from "react";
import { AlertTriangle, Package, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { CensoFormData } from "@/hooks/useCensoForm";

interface PersonFormDialogProps {
  open: boolean;
  mode: "add" | "edit";
  onOpenChange: (open: boolean) => void;
  formData: CensoFormData;
  setFormData: React.Dispatch<React.SetStateAction<CensoFormData>>;
  sectors: string[];
  error: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function PersonFormDialog({
  open,
  mode,
  onOpenChange,
  formData,
  setFormData,
  sectors,
  error,
  submitting,
  onSubmit,
}: PersonFormDialogProps) {
  const isEdit = mode === "edit";

  const update = <K extends keyof CensoFormData>(key: K, value: CensoFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Damnificado" : "Registrar Damnificado"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá la información y notas de entrega del damnificado."
              : "Añadí a una persona al censo del sismo en su respectivo sector."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Nombre y Apellido</Label>
            <Input
              id="pf-name"
              placeholder="Ej. Liliana Perez"
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-doc">Documento / Cédula (Opcional)</Label>
            <Input
              id="pf-doc"
              placeholder="Ej. 9998866"
              value={formData.document_id}
              onChange={(e) => update("document_id", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 flex flex-col">
            <Label htmlFor="pf-loc">Sector / Ubicación</Label>
            <Combobox
              items={sectors}
              value={formData.location}
              onValueChange={(val) => update("location", val ?? "")}
            >
              <ComboboxInput
                id="pf-loc"
                placeholder="Seleccionar sector..."
                className="w-full"
                showTrigger
              />
              <ComboboxContent>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="pf-vulnerable"
              type="checkbox"
              checked={formData.is_vulnerable}
              onChange={(e) => update("is_vulnerable", e.target.checked)}
              className="size-4 rounded border-slate-300 accent-red-600 text-red-600 focus:ring-red-500 dark:border-slate-800 dark:bg-slate-950"
            />
            <Label htmlFor="pf-vulnerable" className="cursor-pointer font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 text-xs">
              <AlertTriangle className="size-3.5 fill-red-100 dark:fill-transparent" />
              {isEdit ? "Persona Vulnerable" : "Marcar como Persona Vulnerable"}
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4 py-1">
            <div className="flex items-center gap-2">
              <input
                id="pf-supplies"
                type="checkbox"
                checked={formData.received_supplies}
                onChange={(e) => update("received_supplies", e.target.checked)}
                className="size-4 rounded border-slate-300 accent-indigo-600 text-indigo-600 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
              <Label htmlFor="pf-supplies" className="cursor-pointer font-medium text-xs flex items-center gap-1">
                <Package className="size-3.5 text-indigo-600 dark:text-indigo-400" /> Suministros
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="pf-medical"
                type="checkbox"
                checked={formData.received_medical}
                onChange={(e) => update("received_medical", e.target.checked)}
                className="size-4 rounded border-slate-300 accent-rose-600 text-rose-600 focus:ring-rose-500 dark:border-slate-800 dark:bg-slate-950"
              />
              <Label htmlFor="pf-medical" className="cursor-pointer font-medium text-xs flex items-center gap-1">
                <Stethoscope className="size-3.5 text-rose-600 dark:text-rose-400" /> Atenc. Médica
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-notes">Notas / Suministros Entregados</Label>
            <Textarea
              id="pf-notes"
              placeholder="Ej. Entrega de agua, electrolit, pañales, etc."
              value={formData.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost">Cancelar</Button>} />
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Guardando..."
                  : "Registrando..."
                : isEdit
                  ? "Guardar Cambios"
                  : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
