"use client";

import React from "react";
import { CensoTable } from "@/components/CensoTable";
import { CensoStats } from "@/components/CensoStats";
import { Person, Stats } from "@/types/person";

// Only available in development for boneyard CLI capture
export const dynamic = "force-static";

const MOCK_STATS: Stats = {
  total: 1234,
  vulnerableTotal: 156,
  suppliesTotal: 890,
  medicalTotal: 432,
  byLocation: [
    { location: "Calle Paez", count: 320, vulnerableCount: 42 },
    { location: "Casco Central", count: 280, vulnerableCount: 35 },
    { location: "El Collao", count: 210, vulnerableCount: 28 },
    { location: "Palmar Este", count: 190, vulnerableCount: 22 },
    { location: "San Julian", count: 234, vulnerableCount: 29 },
  ],
};

const MOCK_PERSONS: Person[] = [
  { id: 1, raw_name: "Maria Rodriguez", name: "Maria Rodriguez", document_id: "V-12345678", location: "Calle Paez", is_vulnerable: 1, notes: "Notas de ejemplo", received_supplies: 1, received_medical: 0, created_at: "2026-01-01" },
  { id: 2, raw_name: "Juan Perez", name: "Juan Perez", document_id: "V-23456789", location: "Casco Central", is_vulnerable: 0, notes: "", received_supplies: 1, received_medical: 1, created_at: "2026-01-02" },
  { id: 3, raw_name: "Ana Lopez", name: "Ana Lopez", document_id: null, location: "El Collao", is_vulnerable: 1, notes: null as unknown as string, received_supplies: 0, received_medical: 0, created_at: "2026-01-03" },
  { id: 4, raw_name: "Carlos Garcia", name: "Carlos Garcia", document_id: "V-34567890", location: "Palmar Este", is_vulnerable: 0, notes: null as unknown as string, received_supplies: 1, received_medical: 0, created_at: "2026-01-04" },
  { id: 5, raw_name: "Luisa Martinez", name: "Luisa Martinez", document_id: "V-45678901", location: "San Julian", is_vulnerable: 1, notes: "Requiere atención médica urgente", received_supplies: 1, received_medical: 1, created_at: "2026-01-05" },
];

export default function BonesCapturePage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-muted-foreground">Not available in production.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto relative space-y-6">
        <CensoStats
          stats={MOCK_STATS}
          sectors={["Calle Paez", "Casco Central", "El Collao", "Palmar Este", "San Julian"]}
          locationFilter="all"
          onLocationFilterChange={() => {}}
          suppliesFilter="all"
          onSuppliesFilterChange={() => {}}
          medicalFilter="all"
          onMedicalFilterChange={() => {}}
        />

        <section className="bg-card rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <CensoTable
            persons={MOCK_PERSONS}
            loading={false}
            page={1}
            totalPages={1}
            total={5}
            onPageChange={() => {}}
            onToggleVulnerable={() => {}}
            onToggleSupplies={() => {}}
            onToggleMedical={() => {}}
            onEditOpen={() => {}}
            onDeleteOpen={() => {}}
            role="admin"
          />
        </section>
      </div>
    </div>
  );
}
