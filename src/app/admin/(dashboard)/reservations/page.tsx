"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Search, Calendar, MapPin,
  ChevronDown, Download, Clock, Phone, Users,
  CheckCircle2, Clock3, Eye
} from "lucide-react";
import { ReservationModal } from "./ReservationModal";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

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

type DateScope = "TODAY" | "UPCOMING" | "PAST";

const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  CONFIRMED: {
    label: "CONFIRMED",
    bg: "bg-[#DCFCE7]",
    text: "text-[#15803D]",
    border: "border-[#86EFAC]",
  },
  SEATED: {
    label: "SEATED",
    bg: "bg-[#DBEAFE]",
    text: "text-[#1D4ED8]",
    border: "border-[#93C5FD]",
  },
  CANCELLED: {
    label: "CANCELLED",
    bg: "bg-[#FEE2E2]",
    text: "text-[#B91C1C]",
    border: "border-[#FCA5A5]",
  },
  NO_SHOW: {
    label: "NO SHOW",
    bg: "bg-[#F3F4F6]",
    text: "text-[#6B7280]",
    border: "border-[#D1D5DB]",
  },
};

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Reservation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [dateScope, setDateScope] = useState<DateScope>("TODAY");
  const [currentPage, setCurrentPage] = useState(1);
  const todayKey = format(new Date(), "yyyy-MM-dd");

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

  // Stats
  const stats = useMemo(() => {
    const todayCount = items.filter((r) => isToday(parseISO(r.date))).length;
    const weekCount = items.filter((r) => isThisWeek(parseISO(r.date), { weekStartsOn: 1 })).length;
    const confirmedCount = items.filter((r) => r.status === "CONFIRMED").length;
    const seatedCount = items.filter((r) => r.status === "SEATED").length;
    return { todayCount, weekCount, confirmedCount, seatedCount };
  }, [items]);

  const dateScopeCounts = useMemo(() => {
    return items.reduce(
      (counts, reservation) => {
        const reservationDate = reservation.date.slice(0, 10);
        if (reservationDate === todayKey) counts.TODAY += 1;
        if (reservationDate > todayKey) counts.UPCOMING += 1;
        if (reservationDate < todayKey) counts.PAST += 1;
        return counts;
      },
      { TODAY: 0, UPCOMING: 0, PAST: 0 }
    );
  }, [items, todayKey]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((r) => {
      const reservationDate = r.date.slice(0, 10);
      const q = search.toLowerCase().trim();
      const text = `${r.customerName} ${r.customerPhone} ${r.customerEmail || ""}`.toLowerCase();
      const matchSearch = !q || text.includes(q);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchLocation = locationFilter === "ALL" || r.locationId === locationFilter;
      const matchDate = !dateFilter || reservationDate === dateFilter;
      const matchScope = dateScope === "TODAY"
        ? reservationDate === todayKey
        : dateScope === "UPCOMING"
          ? reservationDate > todayKey
          : reservationDate < todayKey;
      return matchSearch && matchStatus && matchLocation && matchDate && matchScope;
    });
  }, [items, search, statusFilter, locationFilter, dateFilter, dateScope, todayKey]);

  // Group by date
  const grouped = useMemo(() => {
    const g: Record<string, Reservation[]> = {};
    filtered.forEach((r) => {
      const key = r.date.slice(0, 10);
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    Object.keys(g).forEach((k) => g[k].sort((a, b) => a.time.localeCompare(b.time)));
    return g;
  }, [filtered]);

  const sortedDates = useMemo(() => {
    const dates = Object.keys(grouped).sort();
    return dateScope === "PAST" ? dates.reverse() : dates;
  }, [grouped, dateScope]);

  // Flatten for pagination across groups
  const flatRows = useMemo(() => {
    const rows: ({ type: "header"; date: string; count: number } | { type: "row"; reservation: Reservation })[] = [];
    sortedDates.forEach((date) => {
      rows.push({ type: "header", date, count: grouped[date].length });
      grouped[date].forEach((r) => rows.push({ type: "row", reservation: r }));
    });
    return rows;
  }, [sortedDates, grouped]);

  const totalPages = Math.max(1, Math.ceil(flatRows.length / PAGE_SIZE));
  const paginatedRows = flatRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, locationFilter, dateFilter, dateScope]);

  function selectDateScope(scope: DateScope) {
    setDateScope(scope);
    setDateFilter("");
  }

  function selectDate(date: string) {
    setDateFilter(date);
    if (!date || date === todayKey) {
      setDateScope("TODAY");
    } else {
      setDateScope(date > todayKey ? "UPCOMING" : "PAST");
    }
  }

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

  async function handleStatusChange(id: string, newStatus: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
    try {
      await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // revert on error would need more state
    }
  }

  function handleExport() {
    const headers = ["Date", "Time", "Name", "Email", "Phone", "Location", "Party", "Status", "Notes"];
    const rows = filtered.map((r) => [
      r.date.slice(0, 10),
      r.time,
      r.customerName,
      r.customerEmail || "",
      r.customerPhone,
      r.location?.name || "",
      String(r.partySize),
      r.status,
      r.notes || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#171717]">Reservations</h1>
            <p className="text-sm text-[#6B7280] mt-1">Manage all table reservations across your locations.</p>
          </div>
        </div>
        <div className="text-sm text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Reservations</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage all table reservations across your locations.</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E31B23] hover:bg-[#B9141B] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDD6CA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#FDE8EA] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#E31B23]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Today</p>
            <p className="text-2xl font-bold text-[#171717]">{stats.todayCount}</p>
            <p className="text-xs text-[#9CA3AF]">Reservations</p>
          </div>
        </div>
        <div className="bg-white border border-[#DDD6CA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#F6EBC4] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#B99516]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">This Week</p>
            <p className="text-2xl font-bold text-[#171717]">{stats.weekCount}</p>
            <p className="text-xs text-[#9CA3AF]">Reservations</p>
          </div>
        </div>
        <div className="bg-white border border-[#DDD6CA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Confirmed</p>
            <p className="text-2xl font-bold text-[#171717]">{stats.confirmedCount}</p>
            <p className="text-xs text-[#9CA3AF]">Reservations</p>
          </div>
        </div>
        <div className="bg-white border border-[#DDD6CA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0">
            <Clock3 className="w-5 h-5 text-[#1D4ED8]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Seated</p>
            <p className="text-2xl font-bold text-[#171717]">{stats.seatedCount}</p>
            <p className="text-xs text-[#9CA3AF]">Reservations</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-[#DDD6CA] bg-white p-1" role="tablist" aria-label="Reservation date range">
          {([
            { id: "TODAY", label: "Today" },
            { id: "UPCOMING", label: "Upcoming" },
            { id: "PAST", label: "Past" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={dateScope === id}
              onClick={() => selectDateScope(id)}
              className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${
                dateScope === id
                  ? "bg-[#E31B23] text-white"
                  : "text-[#6B7280] hover:bg-[#FAF7F1] hover:text-[#171717]"
              }`}
            >
              {label}
              <span className={`ml-2 text-xs ${dateScope === id ? "text-white/80" : "text-[#9CA3AF]"}`}>
                {dateScopeCounts[id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="bg-white border border-[#DDD6CA] rounded-lg pl-9 pr-3 py-2 text-sm text-[#171717] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B99516] w-64"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-white border border-[#DDD6CA] rounded-lg pl-9 pr-8 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#B99516] appearance-none cursor-pointer"
          >
            <option value="ALL">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#DDD6CA] rounded-lg px-3 pr-8 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#B99516] appearance-none cursor-pointer"
          >
            <option value="ALL">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SEATED">Seated</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => selectDate(e.target.value)}
            className="bg-white border border-[#DDD6CA] rounded-lg pl-9 pr-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#B99516] cursor-pointer"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#DDD6CA] text-sm text-[#6B7280] hover:text-[#171717] hover:border-[#B99516] transition-colors ml-auto"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {dateScope !== "PAST" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E8E2D6] bg-[#FAF7F1] px-4 py-3 text-sm text-[#6B7280]">
          <span>Past days are hidden to keep today&apos;s service focused.</span>
          <button
            type="button"
            onClick={() => selectDateScope("PAST")}
            className="font-medium text-[#E31B23] transition-colors hover:text-[#B9141B]"
          >
            View past reservations
          </button>
        </div>
      )}

      {/* Table */}
      {sortedDates.length === 0 ? (
        <div className="bg-white border border-[#DDD6CA] rounded-xl px-6 py-16 text-center">
          <Calendar className="w-10 h-10 text-[#DDD6CA] mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">No reservations found.</p>
          <p className="text-[#9CA3AF] text-xs mt-1">Try adjusting your filters or create a new reservation.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#DDD6CA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8E2D6]">
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider w-24">Time</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider">Location</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider w-20">Party</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider w-32">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-xs text-[#9CA3AF] uppercase tracking-wider w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  if (row.type === "header") {
                    const dateObj = parseISO(row.date);
                    return (
                      <tr key={`h-${row.date}`} className="bg-[#FAF7F1]">
                        <td colSpan={7} className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm text-[#171717]">
                              {format(dateObj, "EEEE, d MMMM yyyy")}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]">
                              {row.count} reservations
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const r = row.reservation;
                  const cfg = statusConfig[r.status] || statusConfig.NO_SHOW;
                  return (
                    <tr key={r.id} className="border-b border-[#F2EDE3] hover:bg-[#FAF7F1] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[#171717] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {r.time}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#171717]">{r.customerName}</div>
                        {r.customerEmail && (
                          <div className="text-xs text-[#9CA3AF] mt-0.5">{r.customerEmail}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[#6B7280]">
                          <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          <span className="font-mono text-xs">{r.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[#6B7280]">
                          <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {r.location?.name || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[#171717] font-medium">
                          <Users className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {r.partySize}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative inline-block">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                            className={`appearance-none cursor-pointer px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} pr-6 focus:outline-none`}
                          >
                            {Object.keys(statusConfig).map((s) => (
                              <option key={s} value={s}>{statusConfig[s].label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-60 pointer-events-none" style={{ color: 'inherit' }} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#171717] hover:bg-[#F3F4F6] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#171717] hover:bg-[#F3F4F6] transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#E31B23] hover:bg-[#FDE8EA] transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E8E2D6]">
              <p className="text-xs text-[#9CA3AF]">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, flatRows.length)} of {flatRows.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-sm text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage
                        ? "bg-[#E31B23] text-white"
                        : "text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
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
