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
  total: number;
  vulnerableTotal: number;
  suppliesTotal: number;
  medicalTotal: number;
  byLocation: { location: string; count: number; vulnerableCount: number }[];
}
