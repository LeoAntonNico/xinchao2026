"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Calendar } from "lucide-react";
import { ReservationModal } from "./ReservationModal";

interface Location { id: string; name: string; }
interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string;
  time: string;
  partySize: number;
  notes: string | null;
  status: string;
  locationId: string;
  location?: Location;
}

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Reservation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resvRes, locsRes] = await Promise.all([
        fetch("/api/admin/reservations"),
        fetch("/api/admin/locations"),
      ]);
      const resvData = await resvRes.json();
      const locsData = await locsRes.json();
      setItems(resvRes.ok ? resvData : []);
      setLocations(locsRes.ok ? locsData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleEdit(item: Reservation) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function handleSave(saved: Reservation) {
    setItems((prev) => {
      if (editingItem) {
        return prev.map((i) => (i.id === saved.id ? saved : i));
      }
      return [saved, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this reservation?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleStatusChange(id: string, newStatus: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
  }

  const statusStyles: Record<string, string> = {
    CONFIRMED: "bg-green-500/20 text-green-400",
    SEATED: "bg-blue-500/20 text-blue-400",
    CANCELLED: "bg-red-500/20 text-red-400",
    NO_SHOW: "bg-gray-500/20 text-gray-400",
  };

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    const text = `${r.customerName} ${r.customerPhone} ${r.customerEmail || ""} ${r.time} ${r.location?.name || ""}`.toLowerCase();
    const matchSearch = !search || text.includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Group by date
  const grouped: Record<string, Reservation[]> = {};
  filtered.forEach((r) => {
    const key = r.date.slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  const sortedDates = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Reservations</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white">Reservations</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone..."
            className="bg-sidebar border border-border-default rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-sidebar border border-border-default rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
        >
          <option value="ALL">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SEATED">Seated</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} reservations</span>
      </div>

      {/* Grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="bg-sidebar border border-border-default rounded-xl px-6 py-12 text-center text-gray-400">
          No reservations found. Click "New Reservation" to create one.
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4 text-brand-gold" />
              {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              <span className="text-gray-500 ml-2">({grouped[date].length})</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Party</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {grouped[date]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-white font-medium">{r.time}</td>
                      <td className="px-4 py-2.5 text-gray-200">
                        {r.customerName}
                        {r.notes && <span className="text-gray-600 ml-2" title={r.notes}>📝</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{r.customerPhone}</td>
                      <td className="px-4 py-2.5 text-gray-300">{r.location?.name || "—"}</td>
                      <td className="px-4 py-2.5 text-white font-medium">{r.partySize}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={r.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            handleStatusChange(r.id, newStatus);
                            await fetch(`/api/admin/reservations/${r.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: newStatus }),
                            });
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border-0 outline-none cursor-pointer ${statusStyles[r.status] || ""}`}
                        >
                          <option value="CONFIRMED" className="bg-gray-800 text-white">CONFIRMED</option>
                          <option value="SEATED" className="bg-gray-800 text-white">SEATED</option>
                          <option value="CANCELLED" className="bg-gray-800 text-white">CANCELLED</option>
                          <option value="NO_SHOW" className="bg-gray-800 text-white">NO_SHOW</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <ReservationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        locations={locations}
      />
    </div>
  );
}
