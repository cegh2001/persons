import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchWithRetry } from "@/lib/fetch";
import type { Delivery, PaginatedDeliveries } from "@/types/person";

interface UseDeliveriesResult {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createDelivery: (payload: {
    person_id: number;
    delivery_type: "individual" | "collective";
    beneficiary_count?: number;
    items?: string[];
  }) => Promise<Delivery | null>;
  deleteDelivery: (deliveryId: number) => Promise<boolean>;
}

/**
 * Fetch deliveries for a single person. When `personId` is null the
 * hook is inert (no fetch, empty list). The `createDelivery` helper
 * POSTs to `/api/deliveries` and returns the new row (or null on
 * failure). All errors surface via Sonner toasts.
 */
export function useDeliveries(personId: number | null): UseDeliveriesResult {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (personId === null || personId === undefined) {
      setDeliveries([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(
        `/api/deliveries?person_id=${personId}&pageSize=100`
      );
      if (!res.ok) {
        const msg = "No se pudieron cargar las entregas.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const data: PaginatedDeliveries = await res.json();
      setDeliveries(data.deliveries);
    } catch (err) {
      console.error("useDeliveries error:", err);
      const msg = "Error de red al cargar entregas.";
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

  const createDelivery = useCallback(
    async (payload: {
      person_id: number;
      delivery_type: "individual" | "collective";
      beneficiary_count?: number;
      items?: string[];
    }) => {
      try {
        const res = await fetchWithRetry("/api/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Error" }));
          toast.error(data.error || "No se pudo registrar la entrega.");
          return null;
        }
        const created: Delivery = await res.json();
        toast.success("Entrega registrada correctamente.");
        // Optimistic prepend so the new entry shows at the top.
        setDeliveries((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error("createDelivery error:", err);
        toast.error("Error de red al registrar la entrega.");
        return null;
      }
    },
    []
  );

  const deleteDelivery = useCallback(
    async (deliveryId: number): Promise<boolean> => {
      try {
        const res = await fetchWithRetry(`/api/deliveries/${deliveryId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Error" }));
          toast.error(data.error || "No se pudo eliminar la entrega.");
          return false;
        }
        toast.success("Entrega eliminada correctamente.");
        setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
        return true;
      } catch (err) {
        console.error("deleteDelivery error:", err);
        toast.error("Error de red al eliminar la entrega.");
        return false;
      }
    },
    []
  );

  return { deliveries, loading, error, refetch: load, createDelivery, deleteDelivery };
}
