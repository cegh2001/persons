import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Person, Stats } from "@/types/person";
import type { AuthUser } from "./useAuth";
import { fetchWithRetry } from "@/lib/fetch";

// ── URL param keys ─────────────────────────────────────────────────

const URL_KEYS = {
  search: "q",
  location: "loc",
  vulnerability: "vuln",
  supplies: "sup",
  medical: "med",
  page: "p",
} as const;

interface Filters {
  search: string;
  locationFilter: string;
  vulnerabilityFilter: string;
  suppliesFilter: string;
  medicalFilter: string;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  locationFilter: "all",
  vulnerabilityFilter: "all",
  suppliesFilter: "all",
  medicalFilter: "all",
};

const VULN_MAP: Record<string, string> = { vulnerable: "1", stable: "0" };
const VULN_REVERSE: Record<string, string> = { "1": "vulnerable", "0": "stable" };

// ── Read filters from URL search params ────────────────────────────

function readFiltersFromParams(params: URLSearchParams): { filters: Filters; page: number } {
  const vulnerability = params.get(URL_KEYS.vulnerability) ?? "";
  return {
    filters: {
      search: params.get(URL_KEYS.search) ?? "",
      locationFilter: params.get(URL_KEYS.location) ?? "all",
      vulnerabilityFilter: VULN_REVERSE[vulnerability] ?? "all",
      suppliesFilter: params.get(URL_KEYS.supplies) ?? "all",
      medicalFilter: params.get(URL_KEYS.medical) ?? "all",
    },
    page: Math.max(1, parseInt(params.get(URL_KEYS.page) ?? "1", 10) || 1),
  };
}

// ── Build URL search params from filters + page ────────────────────

function buildParams(filters: Filters, page: number): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.search) p.set(URL_KEYS.search, filters.search);
  if (filters.locationFilter !== "all") p.set(URL_KEYS.location, filters.locationFilter);
  if (filters.vulnerabilityFilter !== "all") p.set(URL_KEYS.vulnerability, VULN_MAP[filters.vulnerabilityFilter] ?? "");
  if (filters.suppliesFilter !== "all") p.set(URL_KEYS.supplies, filters.suppliesFilter);
  if (filters.medicalFilter !== "all") p.set(URL_KEYS.medical, filters.medicalFilter);
  if (page > 1) p.set(URL_KEYS.page, String(page));
  return p;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useCensoData(user: AuthUser | null) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitialMount = useRef(true);

  // Initialize from URL
  const [initialState] = useState(() => readFiltersFromParams(new URLSearchParams(searchParams.toString())));
  const [persons, setPersons] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialState.filters);
  const [page, setPage] = useState(initialState.page);
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

  // ── Sync URL when filters or page change (skip initial mount) ──
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = buildParams(filters, page);
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, page, router]);

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
        fetchWithRetry(`/api/persons?${params}`),
        fetchWithRetry("/api/stats"),
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
      toast.error("Error al cargar datos. Verificá tu conexión.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
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

  // ── Toggle handlers (with toast on error) ──────────────────

  const makeToggleHandler = useCallback(
    (field: "is_vulnerable" | "received_supplies" | "received_medical", label: string) =>
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
          if (res.ok) {
            fetchData();
          } else {
            toast.error(`No se pudo actualizar ${label}.`);
          }
        } catch {
          toast.error(`Error de red al actualizar ${label}.`);
        }
      },
    [fetchData, user]
  );

  const handleToggleVulnerable = makeToggleHandler("is_vulnerable", "vulnerabilidad");
  const handleToggleSupplies = makeToggleHandler("received_supplies", "suministros");
  const handleToggleMedical = makeToggleHandler("received_medical", "atención médica");

  return {
    // Data
    persons,
    total,
    totalPages,
    stats,
    loading,
    initialLoading,
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
