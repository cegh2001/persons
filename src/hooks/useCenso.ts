import { useState, useEffect, useCallback } from "react";
import { Person, Stats } from "@/types/person";

export function useCenso() {
  // Auth states
  const [user, setUser] = useState<{ email: string; role: "admin" | "visor" } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data states
  const [persons, setPersons] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState("all"); // "all", "vulnerable", "stable"
  const [suppliesFilter, setSuppliesFilter] = useState("all"); // "all", "yes", "no"
  const [medicalFilter, setMedicalFilter] = useState("all"); // "all", "yes", "no"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    document_id: "",
    location: "Calle Paez",
    is_vulnerable: false,
    notes: "",
    received_supplies: true,
    received_medical: false
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic list of sectors from stats, fallback to standard ones
  const sectors = stats && stats.byLocation.length > 0 
    ? stats.byLocation.map((l) => l.location) 
    : ["Calle Paez", "Casco Central", "El Collao", "Palmar Este", "San Julian", "Catia La Mar", "La Llanada", "Boca de Río / Caribe", "La Tomita / Casco Central", "Calle Vargas", "Calle La Iglesia", "El Dispensario", "Calle Guaicaipuro", "Maiquetia", "Quebrada Seca"];

  // Verify authentication on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch data only if authenticated
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
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
        fetch("/api/stats")
      ]);

      if (resPersons.status === 401 || resStats.status === 401) {
        setUser(null);
        return;
      }

      if (resPersons.ok) {
        const data = await resPersons.json();
        setPersons(data.persons);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [search, locationFilter, vulnerabilityFilter, suppliesFilter, medicalFilter, page, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user]);

  // Handle successful login from component
  const handleLoginSuccess = (userData: { email: string; role: "admin" | "visor" }) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        setPersons([]);
        setStats(null);
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  // Reset page when filter or search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleLocationFilterChange = (val: string) => {
    setLocationFilter(val);
    setPage(1);
  };

  const handleVulnerabilityFilterChange = (val: string) => {
    setVulnerabilityFilter(val);
    setPage(1);
  };

  const handleSuppliesFilterChange = (val: string) => {
    setSuppliesFilter(val);
    setPage(1);
  };

  const handleMedicalFilterChange = (val: string) => {
    setMedicalFilter(val);
    setPage(1);
  };

  // Toggle vulnerable status instantly (Admin only)
  const handleToggleVulnerable = async (person: Person) => {
    if (user?.role !== "admin") return;
    try {
      const res = await fetch(`/api/persons/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_vulnerable: person.is_vulnerable === 1 ? 0 : 1
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error toggling vulnerable status:", err);
    }
  };

  // Toggle supplies status instantly (Admin only)
  const handleToggleSupplies = async (person: Person) => {
    if (user?.role !== "admin") return;
    try {
      const res = await fetch(`/api/persons/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received_supplies: person.received_supplies === 1 ? 0 : 1
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error toggling supplies status:", err);
    }
  };

  // Toggle medical status instantly (Admin only)
  const handleToggleMedical = async (person: Person) => {
    if (user?.role !== "admin") return;
    try {
      const res = await fetch(`/api/persons/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received_medical: person.received_medical === 1 ? 0 : 1
        })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error toggling medical status:", err);
    }
  };

  // Open add dialog (Admin only)
  const openAddDialog = () => {
    if (user?.role !== "admin") return;
    setFormData({
      id: 0,
      name: "",
      document_id: "",
      location: sectors.includes(locationFilter) ? locationFilter : "Calle Paez",
      is_vulnerable: false,
      notes: "",
      received_supplies: true,
      received_medical: false
    });
    setError("");
    setIsAddOpen(true);
  };

  // Open edit dialog (Admin only)
  const openEditDialog = (person: Person) => {
    if (user?.role !== "admin") return;
    setFormData({
      id: person.id,
      name: person.name,
      document_id: person.document_id || "",
      location: person.location,
      is_vulnerable: person.is_vulnerable === 1,
      notes: person.notes || "",
      received_supplies: person.received_supplies === 1,
      received_medical: person.received_medical === 1
    });
    setError("");
    setIsEditOpen(true);
  };

  // Open delete dialog (Admin only)
  const openDeleteDialog = (person: Person) => {
    if (user?.role !== "admin") return;
    setFormData({
      id: person.id,
      name: person.name,
      document_id: person.document_id || "",
      location: person.location,
      is_vulnerable: person.is_vulnerable === 1,
      notes: person.notes || "",
      received_supplies: person.received_supplies === 1,
      received_medical: person.received_medical === 1
    });
    setIsDeleteOpen(true);
  };

  // Submit create person (Admin only)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") return;
    if (!formData.name.trim() || !formData.location) {
      setError("El nombre y el sector son obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          document_id: formData.document_id.trim() || null,
          location: formData.location,
          is_vulnerable: formData.is_vulnerable,
          notes: formData.notes.trim(),
          received_supplies: formData.received_supplies,
          received_medical: formData.received_medical
        })
      });

      if (res.ok) {
        setIsAddOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Ocurrió un error al registrar.");
      }
    } catch (err) {
      setError("Error de red al registrar.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit update person (Admin only)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") return;
    if (!formData.name.trim() || !formData.location) {
      setError("El nombre y el sector son obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/persons/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          document_id: formData.document_id.trim() || null,
          location: formData.location,
          is_vulnerable: formData.is_vulnerable,
          notes: formData.notes.trim(),
          received_supplies: formData.received_supplies,
          received_medical: formData.received_medical
        })
      });

      if (res.ok) {
        setIsEditOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Ocurrió un error al guardar cambios.");
      }
    } catch (err) {
      setError("Error de red al actualizar.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit delete person (Admin only)
  const handleDeleteSubmit = async () => {
    if (user?.role !== "admin") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/persons/${formData.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setIsDeleteOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting person:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    user,
    authLoading,
    persons,
    total,
    totalPages,
    stats,
    loading,
    search,
    locationFilter,
    vulnerabilityFilter,
    suppliesFilter,
    medicalFilter,
    page,
    setPage,
    isAddOpen,
    setIsAddOpen,
    isEditOpen,
    setIsEditOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    formData,
    setFormData,
    sectors,
    error,
    setError,
    submitting,
    fetchData,
    handleLoginSuccess,
    handleLogout,
    handleSearchChange,
    handleLocationFilterChange,
    handleVulnerabilityFilterChange,
    handleSuppliesFilterChange,
    handleMedicalFilterChange,
    handleToggleVulnerable,
    handleToggleSupplies,
    handleToggleMedical,
    openAddDialog,
    openEditDialog,
    openDeleteDialog,
    handleAddSubmit,
    handleEditSubmit,
    handleDeleteSubmit
  };
}
