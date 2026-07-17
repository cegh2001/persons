/**
 * Tests for PersonDetailSheet and extended CensoStats fields.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner");
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock both hooks so the sheet doesn't fire real network calls.
// Use mutable references so individual tests can override state.

const mockDeliveriesDefault = {
  deliveries: [
    {
      id: 1,
      person_id: 1,
      delivery_type: "individual",
      beneficiary_count: 1,
      created_at: "2026-01-10T10:00:00Z",
      items: [{ id: 1, delivery_id: 1, item: "agua" }],
    },
    {
      id: 2,
      person_id: 1,
      delivery_type: "collective",
      beneficiary_count: 5,
      created_at: "2026-01-12T14:00:00Z",
      items: [
        { id: 2, delivery_id: 2, item: "kit_alimento" },
        { id: 3, delivery_id: 2, item: "pañales" },
      ],
    },
  ] as any[],
  loading: false,
  error: null as Error | null,
  refetch: vi.fn(),
  createDelivery: vi.fn(),
  deleteDelivery: vi.fn(),
};

const mockAttentionsDefault = {
  attentions: [
    {
      id: 1,
      person_id: 1,
      professional: "Dra. Pérez",
      specialty: "medicina_general",
      patient_age: 30,
      patient_sex: "F",
      diagnosis: null,
      notes: null,
      created_at: "2026-01-11T09:00:00Z",
    },
  ] as any[],
  loading: false,
  error: null as Error | null,
  refetch: vi.fn(),
  createAttention: vi.fn(),
  deleteAttention: vi.fn(),
};

vi.mock("@/hooks/useDeliveries", () => ({
  useDeliveries: () => mockDeliveriesDefault,
}));
vi.mock("@/hooks/useMedicalAttentions", () => ({
  useMedicalAttentions: () => mockAttentionsDefault,
}));

import { PersonDetailSheet } from "@/components/PersonDetailSheet";
import { CensoStats } from "@/components/CensoStats";
import type { Person, Stats } from "@/types/person";

const PERSON: Person = {
  id: 1,
  raw_name: "Maria Rodriguez",
  name: "Maria Rodriguez",
  document_id: "V-12345678",
  location: "Calle Paez",
  is_vulnerable: 1,
  notes: "",
  received_supplies: 1,
  received_medical: 0,
  created_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PersonDetailSheet", () => {
  it("renders the person's name and document", () => {
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Maria Rodriguez")).toBeTruthy();
    expect(screen.getByText("V-12345678")).toBeTruthy();
  });

  it("renders delivery items with labels", () => {
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Agua")).toBeTruthy();
    expect(screen.getByText("Kit de alimento")).toBeTruthy();
    expect(screen.getByText("Pañales")).toBeTruthy();
  });

  it("renders medical attention details", () => {
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Dra. Pérez")).toBeTruthy();
    expect(screen.getByText("Medicina general")).toBeTruthy();
    expect(screen.getByText(/Edad: 30/)).toBeTruthy();
  });

  it("shows the 'Colectiva' badge and beneficiary count for collective deliveries", () => {
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Colectiva")).toBeTruthy();
    expect(screen.getByText(/5 personas alcanzadas/)).toBeTruthy();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={onClose}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    const closeBtn = screen.getByLabelText("Cerrar detalle");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("hides 'Nueva entrega' / 'Nueva atención' buttons for visor", () => {
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="visor"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.queryByText(/Nueva entrega/i)).toBeNull();
    expect(screen.queryByText(/Nueva atención/i)).toBeNull();
  });

  it("calls onNewDelivery when the 'Nueva entrega' button is clicked", () => {
    const onNewDelivery = vi.fn();
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={onNewDelivery}
        onNewAttention={() => {}}
      />
    );
    const btn = screen.getByText(/Nueva entrega/i);
    fireEvent.click(btn);
    expect(onNewDelivery).toHaveBeenCalledWith(1);
  });

  it("shows loading skeleton while deliveries are being fetched", () => {
    mockDeliveriesDefault.loading = true;
    mockDeliveriesDefault.deliveries = [];
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    // Skeleton rows should appear instead of "Sin entregas registradas"
    expect(screen.queryByText("Sin entregas registradas")).toBeNull();
    // Reset
    mockDeliveriesDefault.loading = false;
  });

  it("shows loading skeleton while medical attentions are being fetched", () => {
    mockAttentionsDefault.loading = true;
    mockAttentionsDefault.attentions = [];
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    // Skeleton rows should appear instead of "Sin atenciones registradas"
    expect(screen.queryByText("Sin atenciones registradas")).toBeNull();
    // Reset
    mockAttentionsDefault.loading = false;
  });

  it("shows empty state when person has no deliveries", () => {
    mockDeliveriesDefault.loading = false;
    mockDeliveriesDefault.deliveries = [];
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Sin entregas registradas")).toBeTruthy();
  });

  it("shows empty state when person has no medical attentions", () => {
    mockAttentionsDefault.loading = false;
    mockAttentionsDefault.attentions = [];
    render(
      <PersonDetailSheet
        person={PERSON}
        isOpen
        onClose={() => {}}
        role="admin"
        onNewDelivery={() => {}}
        onNewAttention={() => {}}
      />
    );
    expect(screen.getByText("Sin atenciones registradas")).toBeTruthy();
  });
});

describe("CensoStats extended fields", () => {
  const FULL_STATS: Stats = {
    total: 100,
    vulnerableTotal: 12,
    suppliesTotal: 80,
    medicalTotal: 30,
    byLocation: [
      { location: "Calle Paez", count: 50, vulnerableCount: 5 },
      { location: "Casco Central", count: 50, vulnerableCount: 7 },
    ],
    totalDeliveries: 87,
    personsReached: 142,
    itemsDistributed: {
      agua: 50,
      kit_alimento: 30,
      electrolit: 20,
      kit_higiene: 15,
      medicamentos: 10,
    },
    totalMedicalAttentions: 33,
    medicalBySpecialty: {
      medicina_general: 12,
      pediatria: 8,
      traumatologia: 5,
      psicologia: 4,
      medicina_interna: 3,
      fisioterapia: 1,
    },
    medicalByProfessional: {
      "Dra. Pérez": 12,
      "Dr. López": 8,
    },
  };

  it("renders the 3 new KPI cards with values from the extended Stats", () => {
    render(
      <CensoStats
        stats={FULL_STATS}
        sectors={["Calle Paez", "Casco Central"]}
        locationFilter="all"
        onLocationFilterChange={() => {}}
        suppliesFilter="all"
        onSuppliesFilterChange={() => {}}
        medicalFilter="all"
        onMedicalFilterChange={() => {}}
      />
    );
    expect(screen.getByText("Entregas realizadas")).toBeTruthy();
    expect(screen.getByText("87")).toBeTruthy();
    expect(screen.getByText("Personas alcanzadas")).toBeTruthy();
    expect(screen.getByText("142")).toBeTruthy();
    expect(screen.getByText("Atenciones médicas")).toBeTruthy();
    expect(screen.getByText("33")).toBeTruthy();
  });

  it("renders the 'Ítems más entregados' section with top 5 items", () => {
    render(
      <CensoStats
        stats={FULL_STATS}
        sectors={["Calle Paez", "Casco Central"]}
        locationFilter="all"
        onLocationFilterChange={() => {}}
        suppliesFilter="all"
        onSuppliesFilterChange={() => {}}
        medicalFilter="all"
        onMedicalFilterChange={() => {}}
      />
    );
    expect(screen.getByText("Ítems más entregados")).toBeTruthy();
    // Top 5 items, sorted by count desc.
    const labels = ["Agua", "Kit de alimento", "Electrolit", "Kit de higiene", "Medicamentos"];
    for (const l of labels) {
      expect(screen.getByText(l)).toBeTruthy();
    }
  });

  it("renders the 'Atenciones por especialidad' section with all specialties", () => {
    render(
      <CensoStats
        stats={FULL_STATS}
        sectors={["Calle Paez", "Casco Central"]}
        locationFilter="all"
        onLocationFilterChange={() => {}}
        suppliesFilter="all"
        onSuppliesFilterChange={() => {}}
        medicalFilter="all"
        onMedicalFilterChange={() => {}}
      />
    );
    expect(screen.getByText("Atenciones por especialidad")).toBeTruthy();
    expect(screen.getByText("Medicina general")).toBeTruthy();
    expect(screen.getByText("Pediatría")).toBeTruthy();
    expect(screen.getByText("Traumatología")).toBeTruthy();
    expect(screen.getByText("Psicología")).toBeTruthy();
  });

  it("renders '0' / 'Sin datos' placeholders for empty stats", () => {
    const emptyStats: Stats = {
      total: 0,
      vulnerableTotal: 0,
      suppliesTotal: 0,
      medicalTotal: 0,
      byLocation: [],
      totalDeliveries: 0,
      personsReached: 0,
      itemsDistributed: {},
      totalMedicalAttentions: 0,
      medicalBySpecialty: {},
      medicalByProfessional: {},
    };
    render(
      <CensoStats
        stats={emptyStats}
        sectors={[]}
        locationFilter="all"
        onLocationFilterChange={() => {}}
        suppliesFilter="all"
        onSuppliesFilterChange={() => {}}
        medicalFilter="all"
        onMedicalFilterChange={() => {}}
      />
    );
    // Empty-state copy.
    expect(screen.getByText(/Sin entregas registradas aún/i)).toBeTruthy();
    expect(screen.getByText(/Sin atenciones registradas/i)).toBeTruthy();
  });

  it("renders skeleton placeholders when stats is null (loading state)", () => {
    const { container } = render(
      <CensoStats
        stats={null as unknown as Stats}
        sectors={[]}
        locationFilter="all"
        onLocationFilterChange={() => {}}
        suppliesFilter="all"
        onSuppliesFilterChange={() => {}}
        medicalFilter="all"
        onMedicalFilterChange={() => {}}
      />
    );
    // The skeleton grid should render instead of actual KPI values.
    // With null stats, "Entregas realizadas" text should NOT appear.
    expect(screen.queryByText("Entregas realizadas")).toBeNull();
    // The container should have skeleton structure rendered (not empty)
    expect(container.querySelectorAll("div").length).toBeGreaterThan(1);
  });
});
