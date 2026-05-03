"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReservePage() {
  const [locations, setLocations] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    date: "",
    time: "",
    partySize: 2,
    notes: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(d));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Reservation confirmed! See you soon.");
      setForm({ name: "", phone: "", email: "", location: "", date: "", time: "", partySize: 2, notes: "" });
    } else {
      setMessage(data.error || "Could not create reservation.");
    }
  };

  const times = ["12:00", "12:30", "13:00", "13:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-2">Reserve a Table</h1>
      <p className="text-gray-400 mb-8">Book your table for an authentic Vietnamese dining experience</p>

      {message && (
        <div className="mb-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30 px-4 py-3 text-sm text-brand-gold">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Restaurant</label>
          <select
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            required
          >
            <option value="">Select location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Time</label>
            <select
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
              required
            >
              <option value="">Select time</option>
              {times.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Party Size</label>
          <input
            type="number"
            min={1}
            max={12}
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email (optional)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Special Requests</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-gold py-3 text-sm font-semibold text-black hover:bg-yellow-600 transition-colors"
        >
          Book Table
        </button>
      </form>
    </div>
  );
}
