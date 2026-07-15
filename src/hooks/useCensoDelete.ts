import { useState, useCallback } from "react";
import type { Person } from "@/types/person";
import type { AuthUser } from "./useAuth";

export function useCensoDelete(
  user: AuthUser | null,
  onDataChanged: () => void
) {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openDelete = useCallback(
    (person: Person) => {
      if (user?.role !== "admin") return;
      setTarget({ id: person.id, name: person.name });
      setIsOpen(true);
    },
    [user]
  );

  const closeDelete = useCallback(() => {
    setIsOpen(false);
    setTarget(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!target || user?.role !== "admin") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/persons/${target.id}`, { method: "DELETE" });
      if (res.ok) {
        closeDelete();
        onDataChanged();
      }
    } catch (err) {
      console.error("Error deleting person:", err);
    } finally {
      setSubmitting(false);
    }
  }, [target, user, closeDelete, onDataChanged]);

  return {
    isOpen,
    setIsOpen: closeDelete, // alias for compatibility
    nameToDelete: target?.name ?? "",
    submitting,
    openDelete,
    handleDelete,
  };
}
