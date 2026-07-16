import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchWithRetry } from "@/lib/fetch";
import type {
  MedicalAttention,
  PaginatedMedicalAttentions,
} from "@/types/person";

interface UseMedicalAttentionsResult {
  attentions: MedicalAttention[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAttention: (payload: {
    person_id: number;
    professional: string;
    specialty: string;
    patient_age?: number;
    patient_sex?: string;
    diagnosis?: string;
    notes?: string;
  }) => Promise<MedicalAttention | null>;
}

/**
 * Fetch medical attentions for a single person. When `personId` is
 * null the hook is inert. `createAttention` POSTs to
 * `/api/medical-attentions` and returns the new row.
 */
export function useMedicalAttentions(
  personId: number | null
): UseMedicalAttentionsResult {
  const [attentions, setAttentions] = useState<MedicalAttention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (personId === null || personId === undefined) {
      setAttentions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(
        `/api/medical-attentions?person_id=${personId}&pageSize=100`
      );
      if (!res.ok) {
        const msg = "No se pudieron cargar las atenciones.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const data: PaginatedMedicalAttentions = await res.json();
      setAttentions(data.attentions);
    } catch (err) {
      console.error("useMedicalAttentions error:", err);
      const msg = "Error de red al cargar atenciones.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const createAttention = useCallback(
    async (payload: {
      person_id: number;
      professional: string;
      specialty: string;
      patient_age?: number;
      patient_sex?: string;
      diagnosis?: string;
      notes?: string;
    }) => {
      try {
        const res = await fetchWithRetry("/api/medical-attentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Error" }));
          toast.error(data.error || "No se pudo registrar la atención.");
          return null;
        }
        const created: MedicalAttention = await res.json();
        toast.success("Atención médica registrada correctamente.");
        setAttentions((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error("createAttention error:", err);
        toast.error("Error de red al registrar la atención.");
        return null;
      }
    },
    []
  );

  return { attentions, loading, error, refetch: load, createAttention };
}
