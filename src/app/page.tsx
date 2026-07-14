"use client";

import React from "react";
import "@/bones/registry";
import { useCenso } from "@/hooks/useCenso";
import { CensoHeader } from "@/components/CensoHeader";
import { CensoStats } from "@/components/CensoStats";
import { CensoFilters } from "@/components/CensoFilters";
import { CensoTable } from "@/components/CensoTable";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { EditPersonDialog } from "@/components/EditPersonDialog";
import { DeletePersonDialog } from "@/components/DeletePersonDialog";
import { Login } from "@/components/Login";

export default function Home() {
  const censo = useCenso();

  if (censo.authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950 gap-3">
        <div className="size-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Verificando sesión...</span>
      </div>
    );
  }

  if (!censo.user) {
    return <Login onLoginSuccess={censo.handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Decorative header glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-72 bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-[1400px] mx-auto relative space-y-6">
        <CensoHeader 
          onAddOpen={censo.openAddDialog} 
          role={censo.user.role}
          onLogout={censo.handleLogout}
        />
        
        <CensoStats 
          stats={censo.stats} 
          sectors={censo.sectors} 
          locationFilter={censo.locationFilter}
          onLocationFilterChange={censo.handleLocationFilterChange}
          suppliesFilter={censo.suppliesFilter}
          onSuppliesFilterChange={censo.handleSuppliesFilterChange}
          medicalFilter={censo.medicalFilter}
          onMedicalFilterChange={censo.handleMedicalFilterChange}
        />

        <section className="bg-card rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <CensoFilters 
            search={censo.search}
            onSearchChange={censo.handleSearchChange}
            sectors={censo.sectors}
            locationFilter={censo.locationFilter}
            onLocationFilterChange={censo.handleLocationFilterChange}
            vulnerabilityFilter={censo.vulnerabilityFilter}
            onVulnerabilityFilterChange={censo.handleVulnerabilityFilterChange}
          />

          <CensoTable 
            persons={censo.persons}
            loading={censo.loading}
            page={censo.page}
            totalPages={censo.totalPages}
            total={censo.total}
            onPageChange={censo.setPage}
            onToggleVulnerable={censo.handleToggleVulnerable}
            onToggleSupplies={censo.handleToggleSupplies}
            onToggleMedical={censo.handleToggleMedical}
            onEditOpen={censo.openEditDialog}
            onDeleteOpen={censo.openDeleteDialog}
            role={censo.user.role}
          />
        </section>
      </div>

      <AddPersonDialog 
        isOpen={censo.isAddOpen}
        onOpenChange={censo.setIsAddOpen}
        formData={censo.formData}
        setFormData={censo.setFormData}
        sectors={censo.sectors}
        error={censo.error}
        submitting={censo.submitting}
        onSubmit={censo.handleAddSubmit}
      />

      <EditPersonDialog 
        isOpen={censo.isEditOpen}
        onOpenChange={censo.setIsEditOpen}
        formData={censo.formData}
        setFormData={censo.setFormData}
        sectors={censo.sectors}
        error={censo.error}
        submitting={censo.submitting}
        onSubmit={censo.handleEditSubmit}
      />

      <DeletePersonDialog 
        isOpen={censo.isDeleteOpen}
        onOpenChange={censo.setIsDeleteOpen}
        nameToDelete={censo.formData.name}
        submitting={censo.submitting}
        onSubmit={censo.handleDeleteSubmit}
      />
    </div>
  );
}
