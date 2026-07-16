"use client";

import React, { useMemo, useState } from "react";
import { Package, Users, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { SUPPLY_ITEMS, type SupplyItem } from "@/lib/validation";
import { useDeliveries } from "@/hooks/useDeliveries";
import type { Person } from "@/types/person";

interface QuickDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillPersonId?: number;
  persons: Person[];
}

const SUPPLY_LABELS: Record<SupplyItem, string> = {
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

export function QuickDeliveryDialog({
  open,
  onOpenChange,
  onSuccess,
  prefillPersonId,
  persons,
}: QuickDeliveryDialogProps) {
  const { createDelivery } = useDeliveries(null);

  const [personId, setPersonId] = useState<number | null>(
    prefillPersonId ?? null
  );
  const [selectedItems, setSelectedItems] = useState<Set<SupplyItem>>(
    new Set()
  );
  const [isCollective, setIsCollective] = useState(false);
  const [beneficiaryCount, setBeneficiaryCount] = useState<number>(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when the dialog opens fresh.
  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonId(prefillPersonId ?? null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItems(new Set());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollective(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBeneficiaryCount(1);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitting(false);
    }
  }, [open, prefillPersonId]);

  const personItems = useMemo(
    () =>
      persons.map((p) => ({
        value: String(p.id),
        label: p.document_id ? `${p.name} (${p.document_id})` : p.name,
      })),
    [persons]
  );

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId]
  );

  const toggleItem = (item: SupplyItem) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!personId) return "Seleccioná una persona.";
    if (selectedItems.size === 0) return "Seleccioná al menos un ítem.";
    if (isCollective && (!beneficiaryCount || beneficiaryCount < 1)) {
      return "Beneficiarios alcanzados debe ser al menos 1.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createDelivery({
        person_id: personId!,
        delivery_type: isCollective ? "collective" : "individual",
        beneficiary_count: isCollective ? beneficiaryCount : 1,
        items: Array.from(selectedItems),
      });
      if (result) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError("No se pudo registrar la entrega.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-4 text-indigo-600 dark:text-indigo-400" />
            Nueva entrega
          </DialogTitle>
          <DialogDescription>
            Registrá una entrega individual o colectiva para una persona del
            censo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Person selector */}
          <div className="space-y-1.5">
            <Label htmlFor="qd-person">Persona</Label>
            <Combobox
              items={personItems}
              value={personId !== null ? String(personId) : null}
              onValueChange={(val) =>
                setPersonId(val !== null ? Number(val) : null)
              }
            >
              <ComboboxInput
                id="qd-person"
                placeholder="Buscar por nombre o cédula..."
                className="w-full"
                showTrigger
                showClear
              />
              <ComboboxContent>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {selectedPerson && (
              <p className="text-[10px] text-muted-foreground">
                {selectedPerson.location} ·{" "}
                {selectedPerson.document_id ?? "sin cédula"}
              </p>
            )}
          </div>

          {/* Items grid */}
          <div className="space-y-1.5">
            <Label>Ítems entregados</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5">
              {SUPPLY_ITEMS.map((item) => {
                const checked = selectedItems.has(item);
                return (
                  <label
                    key={item}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-colors ${
                      checked
                        ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item)}
                      className="size-3.5 rounded border-slate-300 accent-indigo-600 text-indigo-600 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                    {SUPPLY_LABELS[item]}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Collective toggle + count */}
          <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="qd-collective"
                  className="cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                >
                  <Users className="size-3.5 text-violet-600 dark:text-violet-400" />
                  Entrega colectiva
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Para múltiples beneficiarios en un solo registro.
                </p>
              </div>
              {/* Native toggle styled as switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="qd-collective"
                  type="checkbox"
                  checked={isCollective}
                  onChange={(e) => setIsCollective(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${
                    isCollective
                      ? "bg-violet-600"
                      : "bg-slate-300 dark:bg-slate-700"
                  } peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500/40 peer-focus-visible:ring-offset-2`}
                />
                <div
                  className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                    isCollective ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </label>
            </div>

            {isCollective && (
              <div className="space-y-1 pt-1">
                <Label htmlFor="qd-count" className="text-xs">
                  Personas alcanzadas
                </Label>
                <Input
                  id="qd-count"
                  type="number"
                  min={1}
                  value={beneficiaryCount}
                  onChange={(e) =>
                    setBeneficiaryCount(parseInt(e.target.value, 10) || 0)
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="ghost">Cancelar</Button>}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Registrando...
                </>
              ) : (
                "Registrar entrega"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
