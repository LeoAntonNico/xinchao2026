
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Calendar, Clock, Users, CheckCircle, AlertCircle } from "lucide-react";

interface Location {
  id: string;
  name: string;
  slug: string;
}

interface Availability {
  capacity: number;
  availability: Record<string, number>;
}

export default function ReservePage() {
  const t = useTranslations();
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    locationId: "",
    date: "",
    time: "",
    partySize: 2,
    notes: "",
  });
  const [avail, setAvail] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d));
  }, []);

  // Fetch availability when date/location changes
  useEffect(() => {
    if (!form.locationId || !form.date) { setAvail(null); return; }
    fetch(`/api/reserve/availability?locationId=${form.locationId}&date=${form.date}`)
      .then((r) => r.json())
      .then((d) => setAvail(d))
      .catch(() => setAvail(null));
  }, [form.locationId, form.date]);

  const times = ["12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];

  const getAvailable = (time: string) => {
    if (!avail) return null;
    return avail.availability[time] ?? avail.capacity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage({ text: "Reservation confirmed! See you soon.", type: "success" });
      setForm({ name: "", phone: "", email: "", locationId: "", date: "", time: "", partySize: 2, notes: "" });
      setAvail(null);
    } else {
      setMessage({ text: data.error || "Could not create reservation.", type: "error" });
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("nav.reserve")}</h1>
        <p className="text-gray-400">Book your table for an authentic Vietnamese dining experience</p>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-red" /> Location
          </label>
          <select
            value={form.locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value, time: "" })}
            className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
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
            <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-gold" /> Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-gold" /> Party Size
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-gold" /> Pickup Time
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {times.map((t) => {
              const seats = getAvailable(t);
              const isFull = seats !== null && seats <= 0;
              const selected = form.time === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={isFull}
                  onClick={() => setForm({ ...form, time: t })}
                  className={`relative py-3 rounded-lg border text-sm font-medium transition-colors ${
                    selected
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                      : isFull
                        ? "border-border-default text-gray-500 cursor-not-allowed"
                        : "border-border-default text-gray-300 hover:border-gray-500"
                  }`}
                >
                  {t}
                  {seats !== null && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
                      seats > 5 ? "bg-green-500/20 text-green-400" : seats > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {seats}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {avail && (
            <p className="text-xs text-gray-500 mt-2">Hover number shows remaining seats</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Phone *</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg bg-sidebar border border-border-default px-4 py-3 text-white focus:border-brand-gold focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.time}
          className="w-full py-4 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors disabled:opacity-50"
        >
          {loading ? "Processing..." : `${t("reservation.book")} →`}
        </button>
      </form>
    </div>
  );
}
