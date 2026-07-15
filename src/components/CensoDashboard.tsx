"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCensoData } from "@/hooks/useCensoData";
import { useCensoForm } from "@/hooks/useCensoForm";
import { useCensoDelete } from "@/hooks/useCensoDelete";
import { CensoHeader } from "@/components/CensoHeader";
import { CensoStats } from "@/components/CensoStats";
import { CensoFilters } from "@/components/CensoFilters";
import { CensoTable } from "@/components/CensoTable";
import { PersonFormDialog } from "@/components/PersonFormDialog";
import { DeletePersonDialog } from "@/components/DeletePersonDialog";
import { Login } from "@/components/Login";

function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950 gap-3">
      <div className="size-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Verificando sesión...
      </span>
    </div>
  );
}

export function CensoDashboard() {
  const auth = useAuth();
  const data = useCensoData(auth.user);
  const form = useCensoForm(auth.user, data.sectors, data.locationFilter, data.fetchData);
  const del = useCensoDelete(auth.user, data.fetchData);

  if (auth.authLoading) return <AuthLoading />;
  if (!auth.user) {
    return <Login onLoginSuccess={auth.handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Decorative header glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-72 bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-[1400px] mx-auto relative space-y-6">
        <CensoHeader
          onAddOpen={form.openAdd}
          role={auth.user.role}
          onLogout={auth.handleLogout}
        />

        <CensoStats
          stats={data.stats}
          sectors={data.sectors}
          locationFilter={data.locationFilter}
          onLocationFilterChange={data.handleLocationFilterChange}
          suppliesFilter={data.suppliesFilter}
          onSuppliesFilterChange={data.handleSuppliesFilterChange}
          medicalFilter={data.medicalFilter}
          onMedicalFilterChange={data.handleMedicalFilterChange}
        />

        <section className="bg-card rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <CensoFilters
            search={data.search}
            onSearchChange={data.handleSearchChange}
            sectors={data.sectors}
            locationFilter={data.locationFilter}
            onLocationFilterChange={data.handleLocationFilterChange}
            vulnerabilityFilter={data.vulnerabilityFilter}
            onVulnerabilityFilterChange={data.handleVulnerabilityFilterChange}
          />

          <CensoTable
            persons={data.persons}
            loading={data.loading}
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={data.setPage}
            onToggleVulnerable={data.handleToggleVulnerable}
            onToggleSupplies={data.handleToggleSupplies}
            onToggleMedical={data.handleToggleMedical}
            onEditOpen={form.openEdit}
            onDeleteOpen={del.openDelete}
            role={auth.user.role}
          />
        </section>
      </div>

      <PersonFormDialog
        open={form.isOpen}
        mode={form.dialogMode}
        onOpenChange={form.closeDialog}
        formData={form.formData}
        setFormData={form.setFormData}
        sectors={data.sectors}
        error={form.error}
        submitting={form.submitting}
        onSubmit={form.handleSubmit}
      />

      <DeletePersonDialog
        isOpen={del.isOpen}
        onOpenChange={del.setIsOpen}
        nameToDelete={del.nameToDelete}
        submitting={del.submitting}
        onSubmit={del.handleDelete}
      />
    </div>
  );
}
