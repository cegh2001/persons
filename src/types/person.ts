export interface Person {
  id: number;
  raw_name: string;
  name: string;
  document_id: string | null;
  location: string;
  is_vulnerable: number;
  notes: string;
  received_supplies: number;
  received_medical: number;
  created_at: string;
}

export interface Stats {
  // ── Existing fields — preserved ──────────────────────────────────────
  total: number;
  vulnerableTotal: number;
  suppliesTotal: number;
  medicalTotal: number;
  byLocation: { location: string; count: number; vulnerableCount: number }[];
  // ── Extended fields — `structured-deliveries` PR 3 ──────────────────
  totalDeliveries: number;
  personsReached: number;
  itemsDistributed: Record<string, number>;
  totalMedicalAttentions: number;
  medicalBySpecialty: Record<string, number>;
  medicalByProfessional: Record<string, number>;
}

// ── Delivery / Medical UI shapes ──────────────────────────────────────

export interface Delivery {
  id: number;
  person_id: number;
  delivery_type: "individual" | "collective";
  beneficiary_count: number;
  created_at: string;
  items: { id: number; delivery_id: number; item: string }[];
}

export interface PaginatedDeliveries {
  deliveries: Delivery[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MedicalAttention {
  id: number;
  person_id: number;
  professional: string;
  specialty: string;
  patient_age: number | null;
  patient_sex: string | null;
  diagnosis: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaginatedMedicalAttentions {
  attentions: MedicalAttention[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
