"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MapPin, Calendar, Clock, Users, CheckCircle,
  AlertCircle, ArrowRight, Info, Phone, Mail, User, MessageSquare,
  Utensils
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  slug: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
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

  const selectedLocation = locations.find((l) => l.id === form.locationId);

  /* Generate 30-minute time slots from open → close, filtering out past times for today */
  const times = (() => {
    const slots: string[] = [];
    const open = selectedLocation?.openTime;
    const close = selectedLocation?.closeTime;
    if (!open || !close) return slots;

    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    let h = oh;
    let m = om;

    while (h < ch || (h === ch && m <= cm)) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      m += 30;
      if (m >= 60) { m = 0; h += 1; }
    }

    /* If selected date is today, hide times that have already passed */
    const today = new Date().toISOString().split("T")[0];
    if (form.date === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      return slots.filter((t) => {
        const [th, tm] = t.split(":").map(Number);
        const slotMinutes = th * 60 + tm;
        return slotMinutes > nowMinutes;
      });
    }
    return slots;
  })();

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
      <div className="mb-12">
        <h1 className="font-display text-[42px] md:text-[64px] leading-[0.9] uppercase tracking-tight">
          <span className="text-foreground">{isNl ? "RESERVEER EEN" : "RESERVE A"}</span>{" "}
          <span className="text-logo-red">{isNl ? "TAFEL" : "TABLE"}</span>
        </h1>
        <p className="text-gray-500 text-[13px] font-mono uppercase tracking-[0.12em] mt-3 whitespace-nowrap">
          {isNl
            ? "Reserveer je tafel bij Xin Chào."
            : "Reserve your table at Xin Chào."}
        </p>
      </div>

      {/* ═══════ ALERT ═══════ */}
      {message && (
        <div className={`mb-6 border-l-[4px] px-4 py-3 text-[12px] font-mono uppercase tracking-wide ${
          message.type === "success"
            ? "border-logo-red bg-logo-red/10 text-logo-red"
            : "border-logo-red bg-logo-red/10 text-logo-red"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10">
        {/* ═══════ LEFT COLUMN — FORM ═══════ */}
        <div className="flex-1 min-w-0 space-y-12">
          <form onSubmit={handleSubmit} className="space-y-12">

            {/* ── Booking Details ── */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-logo-red text-white flex items-center justify-center text-[13px] font-bold font-mono shrink-0">
                    1
                  </div>
                  <h2 className="font-display text-[20px] uppercase tracking-tight text-foreground">
                    {isNl ? "Boekingsdetails" : "Booking Details"}
                  </h2>
                </div>
              </div>

              <div className="space-y-5">
                {/* Location */}
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {isNl ? "Locatie" : "Location"}
                  </label>
                  <div className="relative">
                    <select
                      value={form.locationId}
                      onChange={(e) => setForm({ ...form, locationId: e.target.value, time: "" })}
                      required
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] focus:border-logo-red focus:outline-none transition-colors appearance-none"
                    >
                      <option value="">{isNl ? "Kies een locatie" : "Choose a location"}</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                {/* Date + Party Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {isNl ? "Datum" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })}
                      required
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] focus:border-logo-red focus:outline-none transition-colors placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {isNl ? "Aantal personen" : "Party Size"}
                    </label>
                    <div className="relative">
                      <select
                        value={form.partySize}
                        onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) || 1 })}
                        required
                        className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] focus:border-logo-red focus:outline-none transition-colors appearance-none"
                      >
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {isNl ? (n === 1 ? "persoon" : "personen") : (n === 1 ? "person" : "people")}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferred Time */}
                <div className="space-y-3">
                  <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {isNl ? "Voorkeurstijd" : "Preferred Time"}
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
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
                              ? "bg-logo-red text-white border-logo-red"
                              : isFull
                                ? "border-gray-100 text-gray-300 cursor-not-allowed line-through"
                                : "border-gray-200 text-foreground hover:border-logo-red hover:text-logo-red"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Info className="w-3 h-3" />
                    <p className="text-[10px] font-mono uppercase tracking-wider">
                      {isNl ? "Reserveringen worden automatisch geannuleerd als ze 10 minuten over de verwachte tijd zijn" : "Reservations will be canceled automatically if it's 10 mins over the expected time"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Contact Information ── */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-logo-red text-white flex items-center justify-center text-[13px] font-bold font-mono shrink-0">
                    2
                  </div>
                  <h2 className="font-display text-[20px] uppercase tracking-tight text-foreground">
                    {isNl ? "Contactgegevens" : "Contact Information"}
                  </h2>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {isNl ? "Volledige naam" : "Full Name"}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={isNl ? "Je naam" : "Your name"}
                    className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] placeholder:text-gray-400 focus:border-logo-red focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {isNl ? "Telefoonnummer" : "Phone Number"}
                    </label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+31 6 12345678"
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] placeholder:text-gray-400 focus:border-logo-red focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {isNl ? "E-mailadres" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="hello@xinchao.nl"
                      className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] placeholder:text-gray-400 focus:border-logo-red focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Special Requests ── */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-logo-red text-white flex items-center justify-center text-[13px] font-bold font-mono shrink-0">
                    3
                  </div>
                  <h2 className="font-display text-[20px] uppercase tracking-tight text-foreground">
                    {isNl ? "Speciale Verzoeken" : "Special Requests"}
                  </h2>
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[11px] text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isNl ? "Opmerkingen (allergieën, verjaardagen, etc.)" : "Notes (allergies, birthdays, etc.)"}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                  placeholder={isNl ? "Laat het ons weten..." : "Let us know..."}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 text-foreground text-[14px] placeholder:text-gray-400 focus:border-logo-red focus:outline-none transition-colors resize-none"
                />
              </div>
            </section>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || !form.time}
              className="w-full py-5 bg-logo-red text-white font-bold text-[15px] tracking-[0.06em] uppercase hover:bg-logo-red-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
        <div className="w-full lg:w-[340px] shrink-0 space-y-6">
          {/* Info Card */}
          <div className="border border-gray-200 bg-white">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-logo-red/10 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5 text-logo-red" />
                </div>
                <h3 className="font-display text-[18px] uppercase tracking-tight text-foreground">
                  {isNl ? "Onze Locaties" : "Our Locations"}
                </h3>
              </div>
              <div className="space-y-4">
                {locations.map((loc) => (
                  <div key={loc.id} className="space-y-1">
                    <p className="font-bold text-[14px] text-foreground">{loc.name}</p>
                    {loc.address && (
                      <p className="text-[12px] text-gray-500 flex items-start gap-1.5">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        {loc.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-[12px] font-mono uppercase tracking-wider">
                  <span className="text-gray-400">{isNl ? "Status" : "Status"}</span>
                  <span className="text-logo-red font-bold">{isNl ? "OPEN" : "OPEN NOW"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Walk-ins Welcome card */}
          <div className="border border-gray-200 bg-logo-gold/10">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-logo-gold flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-display text-[18px] uppercase tracking-tight text-foreground">
                  {isNl ? "Inloop Welkom" : "Walk-ins Welcome"}
                </h3>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                {isNl
                  ? "Gevoel voor spontaniteit? We houden altijd een paar tafels open voor de moedigen."
                  : "Feeling spontaneous? We always keep a few tables open for the brave."}
              </p>
            </div>
          </div>

          {/* Contact Card */}
          <div className="border border-gray-200 bg-white">
            <div className="p-6 space-y-4">
              <h3 className="font-display text-[16px] uppercase tracking-tight text-foreground">
                {isNl ? "Hulp nodig?" : "Need Help?"}
              </h3>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                {isNl
                  ? "Heb je vragen over je reservering? Neem contact met ons op."
                  : "Have questions about your reservation? Get in touch with us."}
              </p>
              <a
                href={`/${locale}/contact`}
                className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-logo-red hover:text-logo-red-hover transition-colors"
              >
                {isNl ? "Contact opnemen" : "Contact us"}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
