"use client";

import { useState } from "react";

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-green-500/20 text-green-400",
  SEATED: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  NO_SHOW: "bg-gray-500/20 text-gray-400",
};

const reservationStatuses = ["CONFIRMED", "SEATED", "CANCELLED", "NO_SHOW"];

export function ReservationStatusCell({ reservationId, initialStatus }: { reservationId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setStatus(initialStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className={`px-2 py-1 rounded text-xs font-medium border-0 outline-none cursor-pointer ${statusStyles[status] || "bg-gray-500/20 text-gray-400"}`}
      >
        {reservationStatuses.map((s) => (
          <option key={s} value={s} className="bg-gray-800 text-white">
            {s}
          </option>
        ))}
      </select>
      {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
    </div>
  );
}
