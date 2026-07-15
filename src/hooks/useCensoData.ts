import { useState, useEffect, useCallback } from "react";
import type { Person, Stats } from "@/types/person";
import type { AuthUser } from "./useAuth";

interface Filters {
  search: string;
  locationFilter: string;
  vulnerabilityFilter: string; // "all" | "vulnerable" | "stable"
  suppliesFilter: string;      // "all" | "yes" | "no"
  medicalFilter: string;       // "all" | "yes" | "no"
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  locationFilter: "all",
  vulnerabilityFilter: "all",
  suppliesFilter: "all",
  medicalFilter: "all",
};

export function useCensoData(user: AuthUser | null) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dynamic list of sectors from stats, fallback to standard ones
  const sectors =
    stats && stats.byLocation.length > 0
      ? stats.byLocation.map((l) => l.location)
      : [
          "Calle Paez", "Casco Central", "El Collao", "Palmar Este", "San Julian",
          "Catia La Mar", "La Llanada", "Boca de Río / Caribe", "La Tomita / Casco Central",
          "Calle Vargas", "Calle La Iglesia", "El Dispensario", "Calle Guaicaipuro",
          "Maiquetia", "Quebrada Seca",
        ];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const { search, locationFilter, vulnerabilityFilter, suppliesFilter, medicalFilter } = filters;

      if (search.trim() !== "") params.append("search", search.trim());
      if (locationFilter !== "all") params.append("location", locationFilter);
      if (vulnerabilityFilter === "vulnerable") params.append("is_vulnerable", "1");
      if (vulnerabilityFilter === "stable") params.append("is_vulnerable", "0");
      if (suppliesFilter === "yes") params.append("received_supplies", "1");
      if (suppliesFilter === "no") params.append("received_supplies", "0");
      if (medicalFilter === "yes") params.append("received_medical", "1");
      if (medicalFilter === "no") params.append("received_medical", "0");
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const [resPersons, resStats] = await Promise.all([
        fetch(`/api/persons?${params}`),
        fetch("/api/stats"),
      ]);

      if (resPersons.status === 401 || resStats.status === 401) return;

      if (resPersons.ok) {
        const data = await resPersons.json();
        setPersons(data.persons);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }

      if (resStats.ok) {
        setStats(await resStats.json());
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, user]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  // ── Filter setters ──────────────────────────────────────────

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  // ── Toggle handlers (optimistic via refetch) ───────────────

  const makeToggleHandler = useCallback(
    (field: "is_vulnerable" | "received_supplies" | "received_medical") =>
      async (person: Person) => {
        if (user?.role !== "admin") return;
        const current = person[field] as number;
        const next = current === 1 ? 0 : 1;
        try {
          const res = await fetch(`/api/persons/${person.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: next }),
          });
          if (res.ok) fetchData();
        } catch (err) {
          console.error(`Error toggling ${field}:`, err);
        }
      },
    [fetchData, user]
  );

  const handleToggleVulnerable = makeToggleHandler("is_vulnerable");
  const handleToggleSupplies = makeToggleHandler("received_supplies");
  const handleToggleMedical = makeToggleHandler("received_medical");

  return {
    // Data
    persons,
    total,
    totalPages,
    stats,
    loading,
    // Filters
    search: filters.search,
    locationFilter: filters.locationFilter,
    vulnerabilityFilter: filters.vulnerabilityFilter,
    suppliesFilter: filters.suppliesFilter,
    medicalFilter: filters.medicalFilter,
    handleSearchChange: (v: string) => setFilter("search", v),
    handleLocationFilterChange: (v: string) => setFilter("locationFilter", v),
    handleVulnerabilityFilterChange: (v: string) => setFilter("vulnerabilityFilter", v),
    handleSuppliesFilterChange: (v: string) => setFilter("suppliesFilter", v),
    handleMedicalFilterChange: (v: string) => setFilter("medicalFilter", v),
    // Pagination
    page,
    setPage,
    // Sectors
    sectors,
    // Actions
    fetchData,
    handleToggleVulnerable,
    handleToggleSupplies,
    handleToggleMedical,
  };
}
