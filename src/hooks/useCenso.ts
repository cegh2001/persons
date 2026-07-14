import { useState, useEffect, useCallback } from "react";
import { Person, Stats } from "@/types/person";

export function useCenso() {
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

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim() !== "") params.append("search", search.trim());
      if (locationFilter !== "all") params.append("location", locationFilter);
      if (vulnerabilityFilter === "vulnerable") params.append("is_vulnerable", "1");
      if (vulnerabilityFilter === "stable") params.append("is_vulnerable", "0");
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const [resPersons, resStats] = await Promise.all([
        fetch(`/api/persons?${params}`),
        fetch("/api/stats")
      ]);

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
  }, [search, locationFilter, vulnerabilityFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Toggle vulnerable status instantly
  const handleToggleVulnerable = async (person: Person) => {
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

  // Toggle supplies status instantly
  const handleToggleSupplies = async (person: Person) => {
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

  // Toggle medical status instantly
  const handleToggleMedical = async (person: Person) => {
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

  // Open add dialog
  const openAddDialog = () => {
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

  // Open edit dialog
  const openEditDialog = (person: Person) => {
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

  // Open delete dialog
  const openDeleteDialog = (person: Person) => {
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

  // Submit create person
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Submit update person
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Submit delete person
  const handleDeleteSubmit = async () => {
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
    persons,
    total,
    totalPages,
    stats,
    loading,
    search,
    locationFilter,
    vulnerabilityFilter,
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
    handleSearchChange,
    handleLocationFilterChange,
    handleVulnerabilityFilterChange,
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
