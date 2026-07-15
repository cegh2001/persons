"use client";

import React from "react";
import "@/bones/registry";
import { CensoDashboard } from "@/components/CensoDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <CensoDashboard />
    </ErrorBoundary>
  );
}
