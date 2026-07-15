"use client";

import React, { Suspense } from "react";
import "@/bones/registry";
import { CensoDashboard } from "@/components/CensoDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="h-16 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl animate-pulse" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="h-96 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <CensoDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}
