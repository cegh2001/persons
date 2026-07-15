import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Person } from "@/types/person";
import type { AuthUser } from "./useAuth";

export interface CensoFormData {
  id: number;
  name: string;
  document_id: string;
  location: string;
  is_vulnerable: boolean;
  notes: string;
  received_supplies: boolean;
  received_medical: boolean;
}

const EMPTY_FORM: CensoFormData = {
  id: 0,
  name: "",
  document_id: "",
  location: "Calle Paez",
  is_vulnerable: false,
  notes: "",
  received_supplies: true,
  received_medical: false,
};

function personToForm(person: Person): CensoFormData {
  return {
    id: person.id,
    name: person.name,
    document_id: person.document_id || "",
    location: person.location,
    is_vulnerable: person.is_vulnerable === 1,
    notes: person.notes || "",
    received_supplies: person.received_supplies === 1,
    received_medical: person.received_medical === 1,
  };
}

export function useCensoForm(
  user: AuthUser | null,
  sectors: string[],
  locationFilter: string,
  onDataChanged: () => void
) {
  const [formData, setFormData] = useState<CensoFormData>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; mode: "add" | "edit" }>({
    open: false,
    mode: "add",
  });

  const openAdd = useCallback(() => {
    if (user?.role !== "admin") return;
    setFormData({
      ...EMPTY_FORM,
      location: sectors.includes(locationFilter) ? locationFilter : "Calle Paez",
    });
    setError("");
    setDialog({ open: true, mode: "add" });
  }, [user, sectors, locationFilter]);

  const openEdit = useCallback(
    (person: Person) => {
      if (user?.role !== "admin") return;
      setFormData(personToForm(person));
      setError("");
      setDialog({ open: true, mode: "edit" });
    },
    [user]
  );

  const closeDialog = useCallback(() => {
    setDialog({ open: false, mode: "add" });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (user?.role !== "admin") return;

      if (!formData.name.trim() || !formData.location) {
        setError("El nombre y el sector son obligatorios.");
        return;
      }

      setSubmitting(true);
      try {
        const isEdit = dialog.mode === "edit";
        const url = isEdit ? `/api/persons/${formData.id}` : "/api/persons";
        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            document_id: formData.document_id.trim() || null,
            location: formData.location,
            is_vulnerable: formData.is_vulnerable,
            notes: formData.notes.trim(),
            received_supplies: formData.received_supplies,
            received_medical: formData.received_medical,
          }),
        });

        if (res.ok) {
          closeDialog();
          onDataChanged();
        } else {
          const data = await res.json();
          setError(data.error || "Ocurrió un error.");
        }
      } catch {
        toast.error("Error de red.");
      } finally {
        setSubmitting(false);
      }
    },
    [user, formData, dialog.mode, closeDialog, onDataChanged]
  );

  return {
    formData,
    setFormData,
    error,
    setError,
    submitting,
    isOpen: dialog.open,
    dialogMode: dialog.mode,
    openAdd,
    openEdit,
    closeDialog,
    handleSubmit,
  };
}
