/**
 * Unit tests for `useDeliveries` and `useMedicalAttentions` hooks.
 *
 * These hooks wrap fetch + state. We mock `fetchWithRetry` so the tests
 * stay isolated from the real network / API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock sonner first (the hooks toast on errors).
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetchWithRetry so we control the response shape.
const mockFetchWithRetry = vi.fn();
vi.mock("@/lib/fetch", () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}));

import { useDeliveries } from "@/hooks/useDeliveries";
import { useMedicalAttentions } from "@/hooks/useMedicalAttentions";
import { toast } from "sonner";

const SAMPLE_DELIVERY = {
  id: 1,
  person_id: 5,
  delivery_type: "individual" as const,
  beneficiary_count: 1,
  created_at: "2026-01-15T10:00:00Z",
  items: [{ id: 1, delivery_id: 1, item: "agua" }],
};

const SAMPLE_ATTENTION = {
  id: 1,
  person_id: 5,
  professional: "Dra. Pérez",
  specialty: "medicina_general",
  patient_age: 30,
  patient_sex: "F",
  diagnosis: null,
  notes: null,
  created_at: "2026-01-15T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDeliveries", () => {
  it("fetches deliveries for a given person_id", async () => {
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        deliveries: [SAMPLE_DELIVERY],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      }),
    });

    const { result } = renderHook(() => useDeliveries(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      "/api/deliveries?person_id=5&pageSize=100"
    );
    expect(result.current.deliveries).toHaveLength(1);
    expect(result.current.deliveries[0].id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("is inert (no fetch) when personId is null", async () => {
    const { result } = renderHook(() => useDeliveries(null));
    // Wait a tick for any effects to settle.
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetchWithRetry).not.toHaveBeenCalled();
    expect(result.current.deliveries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("surfaces a toast + sets error on a non-OK response", async () => {
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useDeliveries(7));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/entregas/i);
    expect(toast.error).toHaveBeenCalled();
  });

  it("createDelivery POSTs and prepends the new row on success", async () => {
    // First: initial fetch (empty).
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        deliveries: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      }),
    });
    // Second: create POST.
    const created = { ...SAMPLE_DELIVERY, id: 99 };
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => created,
    });

    const { result } = renderHook(() => useDeliveries(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: typeof created | null = null;
    await act(async () => {
      returned = await result.current.createDelivery({
        person_id: 5,
        delivery_type: "individual",
        items: ["agua"],
      });
    });

    expect(returned).toEqual(created);
    expect(toast.success).toHaveBeenCalled();
    expect(result.current.deliveries[0].id).toBe(99);
    expect(mockFetchWithRetry).toHaveBeenLastCalledWith(
      "/api/deliveries",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("createDelivery returns null and toasts on a non-OK response", async () => {
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        deliveries: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      }),
    });
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "Acceso denegado" }),
    });

    const { result } = renderHook(() => useDeliveries(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: unknown = "sentinel";
    await act(async () => {
      returned = await result.current.createDelivery({
        person_id: 5,
        delivery_type: "individual",
      });
    });
    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Acceso denegado");
  });
});

describe("useMedicalAttentions", () => {
  it("fetches attentions for a given person_id", async () => {
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        attentions: [SAMPLE_ATTENTION],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      }),
    });

    const { result } = renderHook(() => useMedicalAttentions(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      "/api/medical-attentions?person_id=5&pageSize=100"
    );
    expect(result.current.attentions[0].specialty).toBe("medicina_general");
  });

  it("is inert when personId is null", async () => {
    const { result } = renderHook(() => useMedicalAttentions(null));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetchWithRetry).not.toHaveBeenCalled();
    expect(result.current.attentions).toEqual([]);
  });

  it("createAttention POSTs and prepends the new row on success", async () => {
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        attentions: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      }),
    });
    const created = { ...SAMPLE_ATTENTION, id: 50 };
    mockFetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => created,
    });

    const { result } = renderHook(() => useMedicalAttentions(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: typeof created | null = null;
    await act(async () => {
      returned = await result.current.createAttention({
        person_id: 5,
        professional: "Dra. Pérez",
        specialty: "medicina_general",
      });
    });
    expect(returned).toEqual(created);
    expect(result.current.attentions[0].id).toBe(50);
    expect(toast.success).toHaveBeenCalled();
  });
});
