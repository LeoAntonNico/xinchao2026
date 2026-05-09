"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MapPin, Calendar, Clock, Users, CheckCircle,
  AlertCircle, ArrowRight, Info
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  slug: string;
  address?: string;
}

interface Availability {
  capacity: number;
  availability: Record<string, number>;
}

export default function ReservePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isNl = locale === "nl";

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

  useEffect(() => {
    if (!form.locationId || !form.date) { setAvail(null); return; }
    fetch(`/api/reserve/availability?locationId=${form.locationId}&date=${form.date}`)
      .then((r) => r.json())
      .then((d) => setAvail(d))
      .catch(() => setAvail(null));
  }, [form.locationId, form.date]);

  const times = ["12:00", "12:30", "13:00", "17:00", "18:00", "18:30", "19:30", "20:00"];

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
      setMessage({
        text: isNl ? "Reservering bevestigd! Tot snel." : "Reservation confirmed! See you soon.",
        type: "success",
      });
      setForm({ name: "", phone: "", email: "", locationId: "", date: "", time: "", partySize: 2, notes: "" });
      setAvail(null);
    } else {
      setMessage({
        text: data.error || (isNl ? "Kon reservering niet maken." : "Could not create reservation."),
        type: "error",
      });
    }
  };

  const selectedLoc = locations.find((l) => l.id === form.locationId);

  return (
    <div className="px-6 md:px-10 py-8">
      {/* ═══════ HEADER ═══════ */}
      <div className="mb-10">
        <h1 className="font-display text-[42px] md:text-[64px] leading-[0.9] uppercase tracking-tight">
          <span className="text-white">{isNl ? "RESERVEER EEN" : "RESERVE A"}</span>{" "}
          <span className="text-lime">{isNl ? "TAFEL" : "TABLE"}</span>
        </h1>
        <p className="text-neon-pink text-[12px] font-mono uppercase tracking-[0.12em] mt-3 max-w-xl">
          {isNl
            ? "Zeker je plek in het hart van de straatvoedsel chaos. Echte smaak. Geen compromis."
            : "Secure your spot at the heart of the street food chaos. Real flavor. No compromise."}{" "}
          <span className="text-brand-red font-bold">SOUL</span>
        </p>
      </div>

      {/* ═══════ ALERT ═══════ */}
      {message && (
        <div className={`mb-6 border-l-[4px] px-4 py-3 text-[12px] font-mono uppercase tracking-wide ${
          message.type === "success"
            ? "border-lime bg-lime/10 text-lime"
            : "border-neon-pink bg-neon-pink/10 text-neon-pink"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══════ LEFT COLUMN — FORM ═══════ */}
        <div className="flex-1 min-w-0 space-y-10">
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* ── Booking Details ── */}
            <section>
              <div className="flex items-baseline justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-neon-pink shrink-0" />
                  <h2 className="font-display text-[22px] uppercase italic tracking-tight text-white">
                    {isNl ? "Boekingsdetails" : "Booking Details"}
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.1em]">
                  Booking_info
                </span>
              </div>

              <div className="space-y-4">
                {/* Location */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {isNl ? "Selecteer Locatie" : "Select Location"}
                  </label>
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value, time: "" })}
                    required
                    className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] focus:border-neon-pink focus:outline-none transition-colors appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" }}
                  >
                    <option value="">{isNl ? "Kies een locatie" : "Choose a location"}</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date + Party Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {isNl ? "Datum" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })}
                      required
                      className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] focus:border-neon-pink focus:outline-none transition-colors placeholder:text-gray-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {isNl ? "Groepsgrootte" : "Party Size"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.partySize}
                      onChange={(e) => setForm({ ...form, partySize: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })}
                      required
                      className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] focus:border-neon-pink focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Preferred Time */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {isNl ? "Voorkeurstijd" : "Preferred Time"}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
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
                          className={`relative py-3 border text-[12px] font-bold font-mono uppercase tracking-wide transition-all ${
                            selected
                              ? "bg-lime text-black border-lime"
                              : isFull
                                ? "border-white/5 text-gray-600 cursor-not-allowed line-through"
                                : "border-white/10 text-white hover:border-white/25 hover:bg-white/[0.02]"
                          }`}
                        >
                          {t}
                          {seats !== null && seats > 0 && (
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[9px] ${
                              seats > 5 ? "bg-lime text-black" : seats > 0 ? "bg-neon-pink text-black" : "bg-gray-700 text-gray-400"
                            }`}>
                              {seats}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {avail && (
                    <p className="text-[10px] text-gray-600 font-mono mt-1">
                      {isNl ? "Aantal vrije plekken per tijdslot" : "Remaining seats per time slot"}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Contact Information ── */}
            <section>
              <div className="flex items-baseline justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-lime shrink-0" />
                  <h2 className="font-display text-[22px] uppercase italic tracking-tight text-white">
                    {isNl ? "Contactgegevens" : "Contact Information"}
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.1em]">
                  Contact_info
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-lime uppercase tracking-[0.1em]">
                    {isNl ? "Volledige naam" : "Full Name"}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={isNl ? "WIE BEN JIJ?" : "WHO ARE YOU?"}
                    className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-lime focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-lime uppercase tracking-[0.1em]">
                      {isNl ? "Telefoonnummer" : "Phone Number"}
                    </label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+31 6 12345678"
                      className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-lime focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] text-lime uppercase tracking-[0.1em]">
                      {isNl ? "E-mailadres" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="hello@streetfood.vn"
                      className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-lime focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Special Requests ── */}
            <section>
              <div className="flex items-baseline justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-lime shrink-0" />
                  <h2 className="font-display text-[22px] uppercase italic tracking-tight text-white">
                    {isNl ? "Speciale Verzoeken" : "Special Requests"}
                  </h2>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.1em]">
                  {isNl ? "Opmerkingen (allergieën, verjaardagen, etc.)" : "Notes (allergies, birthdays, etc.)"}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-lime focus:outline-none transition-colors resize-none"
                />
              </div>
            </section>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || !form.time}
              className="w-full py-5 bg-lime text-black font-bold text-[15px] tracking-[0.06em] uppercase hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? (isNl ? "Bezig..." : "Processing...")
                : <>
                    {isNl ? "Bevestig Reservering" : "Confirm Reservation"}
                    <ArrowRight className="w-5 h-5" />
                  </>}
            </button>
          </form>
        </div>

        {/* ═══════ RIGHT COLUMN — SIDEBAR ═══════ */}
        <div className="w-full lg:w-[360px] shrink-0 space-y-6">
          {/* Urban Vibes card */}
          <div className="border-t-[3px] border-neon-pink bg-surface-container">
            <div className="p-5 space-y-4">
              <h3 className="font-display text-[18px] uppercase tracking-tight text-neon-pink">
                {isNl ? "Stedelijke Sfeer" : "Urban Vibes"}
              </h3>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                {isNl
                  ? "Onze locaties zijn ontworpen voor de snelle energie van de straat. Reserveringen worden 15 minuten na je boekingstijd vastgehouden."
                  : "Our locations are designed for the fast-paced energy of the street. Reservations are held for 15 minutes past your booking time."}
              </p>
              <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                <img
                  src="/images/hero-pho.jpg"
                  alt="Restaurant"
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div className="flex items-center gap-6 text-[11px] font-mono uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Status</span>
                  <span className="text-lime font-bold">{isNl ? "OPEN" : "OPEN NOW"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{isNl ? "Capaciteit" : "Capacity"}</span>
                  <span className="text-white">{isNl ? "BEPERKT" : "LIMITED SEATS"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Walk-ins Welcome card */}
          <div className="bg-lime p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-lime" />
              </div>
            </div>
            <h3 className="font-display text-[20px] uppercase tracking-tight text-black leading-none">
              {isNl ? "Inloop Welkom" : "Walk-ins Welcome"}
            </h3>
            <p className="text-[12px] text-black/70 uppercase tracking-wide font-bold mt-3 leading-relaxed">
              {isNl
                ? "Gevoel voor spontaniteit? We houden altijd een paar tafels open voor de moedigen. Gewoon binnenlopen."
                : "Feeling spontaneous? We always keep a few tables open for the brave. Just show up."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
