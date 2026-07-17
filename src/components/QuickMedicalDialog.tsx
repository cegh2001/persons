"use client";

import React, { useMemo, useState } from "react";
import { Stethoscope, Loader2, AlertTriangle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  MEDICAL_SPECIALTIES,
  type MedicalSpecialty,
} from "@/lib/validation";
import { useMedicalAttentions } from "@/hooks/useMedicalAttentions";
import type { Person } from "@/types/person";

interface QuickMedicalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillPersonId?: number;
  persons: Person[];
}

const SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  traumatologia: "Traumatología",
  fisioterapia: "Fisioterapia",
  medicina_interna: "Medicina interna",
  medicina_general: "Medicina general",
  pediatria: "Pediatría",
  psicologia: "Psicología",
  endocrinologia: "Endocrinología",
};

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "O", label: "Otro / No especificado" },
];

export function QuickMedicalDialog({
  open,
  onOpenChange,
  onSuccess,
  prefillPersonId,
  persons,
}: QuickMedicalDialogProps) {
  const { createAttention } = useMedicalAttentions(null);

  const [personId, setPersonId] = useState<number | null>(
    prefillPersonId ?? null
  );
  const [professional, setProfessional] = useState("");
  const [specialty, setSpecialty] = useState<MedicalSpecialty | null>(null);
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonId(prefillPersonId ?? null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfessional("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpecialty(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAge("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSex("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiagnosis("");
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

  const specialtyItems = useMemo(
    () =>
      MEDICAL_SPECIALTIES.map((s) => ({
        value: s,
        label: SPECIALTY_LABELS[s],
      })),
    []
  );

  const sexItems = useMemo(
    () => SEX_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId]
  );

  const validate = (): string | null => {
    if (!personId) return "Seleccioná una persona.";
    if (professional.trim() === "") return "Ingresá el profesional.";
    if (!specialty) return "Seleccioná una especialidad válida.";
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
      const ageNum = age.trim() === "" ? undefined : parseInt(age, 10);
      if (age !== "" && (isNaN(ageNum!) || ageNum! < 0)) {
        setError("La edad debe ser un número positivo.");
        setSubmitting(false);
        return;
      }
      const result = await createAttention({
        person_id: personId!,
        professional: professional.trim(),
        specialty: specialty!,
        patient_age: ageNum,
        patient_sex: sex === "" ? undefined : sex,
        diagnosis: diagnosis.trim() === "" ? undefined : diagnosis.trim(),
      });
      if (result) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError("No se pudo registrar la atención.");
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
            <Stethoscope className="size-4 text-rose-600 dark:text-rose-400" />
            Nueva atención médica
          </DialogTitle>
          <DialogDescription>
            Registrá una atención médica con profesional, especialidad y
            diagnóstico opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Person selector */}
          <div className="space-y-1.5">
            <Label htmlFor="qm-person">Persona</Label>
            {prefillPersonId && selectedPerson ? (
              <Input
                id="qm-person"
                value={
                  selectedPerson.document_id
                    ? `${selectedPerson.name} (${selectedPerson.document_id})`
                    : selectedPerson.name
                }
                disabled
                className="bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100"
              />
            ) : (
              <Combobox
                items={personItems}
                value={
                  selectedPerson
                    ? selectedPerson.document_id
                      ? `${selectedPerson.name} (${selectedPerson.document_id})`
                      : selectedPerson.name
                    : null
                }
                onValueChange={(val) => {
                  if (!val) {
                    setPersonId(null);
                    return;
                  }
                  const found = persons.find(
                    (p) =>
                      String(p.id) === val ||
                      p.name === val ||
                      `${p.name} (${p.document_id})` === val
                  );
                  setPersonId(found ? found.id : null);
                }}
              >
                <ComboboxInput
                  id="qm-person"
                  placeholder="Buscar por nombre o cédula..."
                  className="w-full"
                  showTrigger
                  showClear
                />
                <ComboboxContent>
                  <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.value} value={item.label}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
            {selectedPerson && (
              <p className="text-[10px] text-muted-foreground">
                {selectedPerson.location} ·{" "}
                {selectedPerson.document_id ?? "sin cédula"}
              </p>
            )}
          </div>

          {/* Professional */}
          <div className="space-y-1.5">
            <Label htmlFor="qm-professional">Profesional</Label>
            <Input
              id="qm-professional"
              placeholder="Ej. Dra. Pérez"
              value={professional}
              onChange={(e) => setProfessional(e.target.value)}
              required
            />
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label>Especialidad</Label>
            <Combobox
              items={specialtyItems}
              value={specialty}
              onValueChange={(val) => setSpecialty((val as MedicalSpecialty) ?? null)}
            >
              <ComboboxInput
                placeholder="Seleccionar especialidad..."
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
          </div>

          {/* Optional: age + sex */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qm-age" className="text-xs">
                Edad (opcional)
              </Label>
              <Input
                id="qm-age"
                type="number"
                min={0}
                max={150}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sexo (opcional)</Label>
              <Combobox
                items={sexItems}
                value={sex === "" ? null : sex}
                onValueChange={(val) => setSex(val ?? "")}
              >
                <ComboboxInput
                  placeholder="—"
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
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-1.5">
            <Label htmlFor="qm-diagnosis" className="text-xs">
              Diagnóstico (opcional)
            </Label>
            <Textarea
              id="qm-diagnosis"
              placeholder="Notas clínicas, hallazgos..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="min-h-[60px]"
            />
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
                "Registrar atención"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
