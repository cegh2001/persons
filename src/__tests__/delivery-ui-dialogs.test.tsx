/**
 * Unit tests for QuickDeliveryDialog + QuickMedicalDialog.
 *
 * The dialogs render into a portal via @base-ui/react, so `fireEvent.click`
 * on the submit button does not always trigger the React `onSubmit` handler
 * in jsdom. We trigger the form's submit event directly to drive validation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Toaster } from "sonner";

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

const mockCreateDelivery = vi.fn();
const mockCreateAttention = vi.fn();

vi.mock("@/hooks/useDeliveries", () => ({
  useDeliveries: () => ({
    deliveries: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    createDelivery: mockCreateDelivery,
  }),
}));
vi.mock("@/hooks/useMedicalAttentions", () => ({
  useMedicalAttentions: () => ({
    attentions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    createAttention: mockCreateAttention,
  }),
}));

import { QuickDeliveryDialog } from "@/components/QuickDeliveryDialog";
import { QuickMedicalDialog } from "@/components/QuickMedicalDialog";
import type { Person } from "@/types/person";

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

function renderWithToaster(ui: React.ReactElement) {
  return render(<>{ui}<Toaster /></>);
}

function submitForm() {
  const form = document.querySelector("form") as HTMLFormElement;
  expect(form).toBeTruthy();
  fireEvent.submit(form);
}

describe("QuickDeliveryDialog", () => {
  it("blocks submit when no person is selected", async () => {
    renderWithToaster(
      <QuickDeliveryDialog
        open
        onOpenChange={() => {}}
        persons={[]}
      />
    );
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/Seleccioná una persona/i)).toBeTruthy();
    });
    expect(mockCreateDelivery).not.toHaveBeenCalled();
  });

  it("blocks submit when no items are selected", async () => {
    renderWithToaster(
      <QuickDeliveryDialog
        open
        onOpenChange={() => {}}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    submitForm();
    await waitFor(() => {
      expect(
        screen.getByText(/Seleccioná al menos un ítem/i)
      ).toBeTruthy();
    });
    expect(mockCreateDelivery).not.toHaveBeenCalled();
  });

  it("blocks submit when colectiva is on but beneficiary_count < 1", async () => {
    renderWithToaster(
      <QuickDeliveryDialog
        open
        onOpenChange={() => {}}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    // Toggle the collective switch on.
    const collectiveToggle = document.getElementById(
      "qd-collective"
    ) as HTMLInputElement;
    expect(collectiveToggle).toBeTruthy();
    fireEvent.click(collectiveToggle);
    // Check at least one item.
    const agua = screen.getByLabelText("Agua") as HTMLInputElement;
    fireEvent.click(agua);
    // Set beneficiary count to 0.
    const count = (screen.getByLabelText(
      "Personas alcanzadas"
    )) as HTMLInputElement;
    fireEvent.change(count, { target: { value: "0" } });
    // Submit.
    submitForm();
    await waitFor(() => {
      expect(
        screen.getByText(/Beneficiarios alcanzados debe ser al menos 1/i)
      ).toBeTruthy();
    });
    expect(mockCreateDelivery).not.toHaveBeenCalled();
  });

  it("calls createDelivery and closes the dialog on a valid submit", async () => {
    mockCreateDelivery.mockResolvedValueOnce({
      id: 1,
      person_id: 1,
      delivery_type: "individual",
      beneficiary_count: 1,
      created_at: "2026-01-15T10:00:00Z",
      items: [{ id: 1, delivery_id: 1, item: "agua" }],
    });
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    renderWithToaster(
      <QuickDeliveryDialog
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    // Check the agua item.
    const agua = screen.getByLabelText("Agua") as HTMLInputElement;
    fireEvent.click(agua);
    // Submit.
    submitForm();
    await waitFor(() => {
      expect(mockCreateDelivery).toHaveBeenCalledWith({
        person_id: 1,
        delivery_type: "individual",
        beneficiary_count: 1,
        items: ["agua"],
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces a server error message in the dialog when createDelivery returns null", async () => {
    mockCreateDelivery.mockResolvedValueOnce(null);
    renderWithToaster(
      <QuickDeliveryDialog
        open
        onOpenChange={() => {}}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    const agua = screen.getByLabelText("Agua") as HTMLInputElement;
    fireEvent.click(agua);
    submitForm();
    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo registrar la entrega/i)
      ).toBeTruthy();
    });
  });
});

describe("QuickMedicalDialog", () => {
  it("blocks submit when no person is selected", async () => {
    renderWithToaster(
      <QuickMedicalDialog open onOpenChange={() => {}} persons={[]} />
    );
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/Seleccioná una persona/i)).toBeTruthy();
    });
    expect(mockCreateAttention).not.toHaveBeenCalled();
  });

  it("blocks submit when professional is empty", async () => {
    renderWithToaster(
      <QuickMedicalDialog
        open
        onOpenChange={() => {}}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/Ingresá el profesional/i)).toBeTruthy();
    });
    expect(mockCreateAttention).not.toHaveBeenCalled();
  });

  it("blocks submit when no specialty is selected", async () => {
    renderWithToaster(
      <QuickMedicalDialog
        open
        onOpenChange={() => {}}
        persons={[PERSON]}
        prefillPersonId={1}
      />
    );
    // Fill the professional field via the native input.
    const professional = document.getElementById(
      "qm-professional"
    ) as HTMLInputElement;
    expect(professional).toBeTruthy();
    fireEvent.change(professional, { target: { value: "Dra. Pérez" } });
    submitForm();
    await waitFor(() => {
      expect(
        screen.getByText(/Seleccioná una especialidad válida/i)
      ).toBeTruthy();
    });
    expect(mockCreateAttention).not.toHaveBeenCalled();
  });
});
