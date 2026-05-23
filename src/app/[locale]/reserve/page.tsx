"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  MapPin, Calendar, Clock, Users, CheckCircle,
  AlertCircle, ArrowRight, Info, Phone, Mail, User, MessageSquare,
  Utensils, Navigation, CalendarPlus, Pencil, Heart, ShieldCheck, Send,
  RefreshCw, Leaf
} from "lucide-react";
import Image from "next/image";

interface Location {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
}

interface Availability {
  capacity: number;
  availability: Record<string, number>;
}

interface ConfirmedReservation {
  id: string;
  editToken?: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  partySize: number;
  notes: string;
  location: Location;
}

function parseTimeToMinutes(time?: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getLocationStatus(loc: Location, isNl: boolean) {
  const openMinutes = parseTimeToMinutes(loc.openTime);
  const closeMinutes = parseTimeToMinutes(loc.closeTime);
  if (openMinutes === null || closeMinutes === null || !loc.openTime || !loc.closeTime) {
    return {
      isOpen: false,
      label: isNl ? "Status onbekend" : "Status unavailable",
      detail: "",
    };
  }

  const now = new Date();
  const amsterdamTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const currentMinutes = amsterdamTime.getHours() * 60 + amsterdamTime.getMinutes();
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      label: isNl ? "Open" : "Open",
      detail: isNl ? `tot ${loc.closeTime}` : `until ${loc.closeTime}`,
    };
  }

  const opensToday = currentMinutes < openMinutes;
  return {
    isOpen: false,
    label: isNl ? "Gesloten" : "Closed",
    detail: opensToday
      ? (isNl ? `opent vandaag om ${loc.openTime}` : `opens today at ${loc.openTime}`)
      : (isNl ? `opent morgen om ${loc.openTime}` : `opens tomorrow at ${loc.openTime}`),
  };
}

function formatReservationDate(dateValue: string, isNl: boolean) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(isNl ? "nl-NL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function reservationCode(id: string) {
  return `XC-${id.slice(-4).toUpperCase()}`;
}

function minimumPartySize(location?: Location) {
  return location?.slug === "utrecht" ? 3 : 1;
}

export default function ReservePage() {
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
  const [confirmedReservation, setConfirmedReservation] = useState<ConfirmedReservation | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [loadingEditReservation, setLoadingEditReservation] = useState(false);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reservationId = params.get("edit");
    const token = params.get("token");
    if (!reservationId || !token) return;

    setLoadingEditReservation(true);
    fetch(`/api/reserve?id=${encodeURIComponent(reservationId)}&token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Reservation could not be loaded.");
        setEditingReservationId(reservationId);
        setEditToken(token);
        setForm({
          name: data.name,
          phone: data.phone,
          email: data.email,
          locationId: data.location.id,
          date: data.date,
          time: data.time,
          partySize: data.partySize,
          notes: data.notes,
        });
      })
      .catch((error: Error) => {
        setMessage({
          type: "error",
          text: isNl
            ? "Deze wijzigingslink is niet meer geldig. Neem contact met ons op."
            : "This edit link is no longer valid. Please contact us.",
        });
        console.error(error);
      })
      .finally(() => setLoadingEditReservation(false));
  }, [isNl]);

  useEffect(() => {
    if (!form.locationId || !form.date) {
      queueMicrotask(() => setAvail(null));
      return;
    }
    fetch(`/api/reserve/availability?locationId=${form.locationId}&date=${form.date}`)
      .then((r) => r.json())
      .then((d) => setAvail(d))
      .catch(() => setAvail(null));
  }, [form.locationId, form.date]);

  const selectedLocation = locations.find((l) => l.id === form.locationId);
  const minPartySize = minimumPartySize(selectedLocation);

  useEffect(() => {
    if (form.partySize < minPartySize) {
      setForm((current) => ({ ...current, partySize: minPartySize }));
    }
  }, [form.partySize, minPartySize]);

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

    const lastReservationMinutes = ch * 60 + cm - 30;

    while (h * 60 + m <= lastReservationMinutes) {
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
      method: editingReservationId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingReservationId ? { ...form, id: editingReservationId, token: editToken } : form),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      const confirmedLocation = selectedLocation;
      if (confirmedLocation) {
        setConfirmedReservation({
          id: data.id,
          editToken: data.editToken,
          name: form.name,
          phone: form.phone,
          email: form.email,
          date: form.date,
          time: form.time,
          partySize: form.partySize,
          notes: form.notes,
          location: confirmedLocation,
        });
      }
      setForm({ name: "", phone: "", email: "", locationId: "", date: "", time: "", partySize: 2, notes: "" });
      setAvail(null);
      setEditingReservationId(null);
      setEditToken(null);
    } else {
      setMessage({
        text: data.error || (isNl ? "Kon reservering niet maken." : "Could not create reservation."),
        type: "error",
      });
    }
  };

  if (confirmedReservation) {
    return (
      <ReservationConfirmation
        reservation={confirmedReservation}
        isNl={isNl}
        locale={locale}
        onEdit={() => {
          setForm({
            name: confirmedReservation.name,
            phone: confirmedReservation.phone,
            email: confirmedReservation.email,
            locationId: confirmedReservation.location.id,
            date: confirmedReservation.date,
            time: confirmedReservation.time,
            partySize: confirmedReservation.partySize,
            notes: confirmedReservation.notes,
          });
          setEditingReservationId(confirmedReservation.id);
          setEditToken(confirmedReservation.editToken || null);
          setConfirmedReservation(null);
        }}
      />
    );
  }

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

      {editingReservationId && !confirmedReservation && (
        <div className="mb-8 border-l-[4px] border-logo-red bg-logo-red/10 px-4 py-3 text-sm text-foreground">
          <p className="font-bold">{isNl ? "Je wijzigt je bestaande reservering." : "You are editing your existing reservation."}</p>
          <p className="mt-1 text-gray-600">
            {isNl ? "Controleer je gegevens en sla je wijzigingen op." : "Review your details and save your changes."}
          </p>
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
                      onChange={(e) => {
                        const nextLocation = locations.find((loc) => loc.id === e.target.value);
                        const nextMinPartySize = minimumPartySize(nextLocation);
                        setForm({
                          ...form,
                          locationId: e.target.value,
                          time: "",
                          partySize: Math.max(form.partySize, nextMinPartySize),
                        });
                      }}
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
                        {Array.from({ length: 20 - minPartySize + 1 }, (_, i) => i + minPartySize).map((n) => (
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
              disabled={loading || loadingEditReservation || !form.time}
              className="w-full py-5 bg-logo-red text-white font-bold text-[15px] tracking-[0.06em] uppercase hover:bg-logo-red-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading
                ? (isNl ? "Bezig..." : "Processing...")
                : <>
                    {editingReservationId
                      ? (isNl ? "Wijzigingen opslaan" : "Save changes")
                      : (isNl ? "Bevestig Reservering" : "Confirm Reservation")}
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
              <div className="space-y-3">
                {locations.map((loc) => {
                  const status = getLocationStatus(loc, isNl);
                  return (
                    <div key={loc.id} className="rounded-xl border border-gray-100 bg-[#FAF7F1] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] leading-tight text-foreground">{loc.name}</p>
                          {loc.address && (
                            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-gray-500">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              {loc.address}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                            status.isOpen
                              ? "bg-success/10 text-success"
                              : "bg-logo-red/10 text-logo-red"
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>
                      {status.detail && (
                        <div className="mt-3 flex items-center gap-1.5 border-t border-gray-200 pt-2 text-[12px] font-medium text-gray-600">
                          <Clock className={`h-3.5 w-3.5 ${status.isOpen ? "text-success" : "text-logo-red"}`} />
                          <span>{status.detail}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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

function ReservationConfirmation({
  reservation,
  isNl,
  locale,
  onEdit,
}: {
  reservation: ConfirmedReservation;
  isNl: boolean;
  locale: string;
  onEdit: () => void;
}) {
  const dateLabel = formatReservationDate(reservation.date, isNl);
  const bookingId = reservationCode(reservation.id);
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(reservation.location.address || reservation.location.name)}`;
  const emailShown = reservation.email || (isNl ? "je e-mailadres" : "your email");

  return (
    <div className="min-h-screen bg-[#FAF7F1] px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
            <CheckCircle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="font-display text-[32px] uppercase leading-none tracking-tight sm:text-[46px]">
            {isNl ? "Reservering" : "Reservation"} <span className="text-logo-red">{isNl ? "bevestigd" : "confirmed"}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
            {isNl
              ? `Bedankt ${reservation.name}, je tafel is gereserveerd bij ${reservation.location.name}.`
              : `Thanks ${reservation.name}, your table is reserved at ${reservation.location.name}.`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {isNl ? "We hebben je bevestiging per e-mail verstuurd." : "We sent your confirmation by email."}
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(20,20,20,0.08)]">
          <div className="bg-[#17120F] px-5 py-5 text-white sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-logo-gold">
                  {isNl ? "Reservering" : "Reservation"}
                </p>
                <h2 className="mt-1 font-display text-[28px] leading-none tracking-tight">{reservation.location.name}</h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] text-white/55">Booking ID</p>
                <p className="font-mono text-sm font-bold tracking-wider">{bookingId}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-gray-100 px-5 py-5 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-8">
            <ConfirmDetail icon={<Calendar className="h-4 w-4" />} label={isNl ? "Datum" : "Date"} value={dateLabel} />
            <ConfirmDetail icon={<Clock className="h-4 w-4" />} label={isNl ? "Tijd" : "Time"} value={reservation.time} />
            <ConfirmDetail
              icon={<Users className="h-4 w-4" />}
              label={isNl ? "Gasten" : "Guests"}
              value={`${reservation.partySize} ${isNl ? (reservation.partySize === 1 ? "persoon" : "personen") : (reservation.partySize === 1 ? "person" : "people")}`}
            />
            <ConfirmDetail
              icon={<MapPin className="h-4 w-4" />}
              label={isNl ? "Locatie" : "Location"}
              value={reservation.location.address || reservation.location.name}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2 border-t border-gray-100 bg-[#FAF7F1] px-5 py-4">
            <StatusPill icon={<Utensils className="h-3.5 w-3.5" />} label={isNl ? "Binnen" : "Inside"} />
            <StatusPill icon={<ShieldCheck className="h-3.5 w-3.5" />} label={isNl ? "Bevestigd" : "Confirmed"} success />
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <p>{isNl ? "Ben je later? We houden je tafel 15 minuten vast." : "Running late? We hold your table for 15 minutes."}</p>
          </div>
          {reservation.location.phone && (
            <a
              href={`tel:${reservation.location.phone}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-logo-red px-4 text-sm font-bold text-logo-red transition hover:bg-logo-red hover:text-white"
            >
              <Phone className="h-4 w-4" />
              {isNl ? "Bel restaurant" : "Call restaurant"}
            </a>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionButton href={mapsUrl} icon={<Navigation className="h-5 w-5" />} label={isNl ? "Route plannen" : "Plan route"} external />
          <ActionButton
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Xin Chào reservation - ${reservation.location.name}`)}&details=${encodeURIComponent(`Booking ${bookingId}`)}&location=${encodeURIComponent(reservation.location.address || reservation.location.name)}`}
            icon={<CalendarPlus className="h-5 w-5" />}
            label={isNl ? "In agenda" : "Add to calendar"}
            external
          />
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-13 items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-foreground transition hover:border-logo-red hover:text-logo-red"
          >
            <Pencil className="h-5 w-5" />
            {isNl ? "Wijzigen" : "Edit"}
          </button>
          <ActionButton href={`/${locale}/menu`} icon={<Heart className="h-5 w-5" />} label={isNl ? "Bekijk menu" : "View menu"} />
        </div>

        <div className="mt-5 text-center">
          <a href={`mailto:info@xinchaorestaurant.nl?subject=${encodeURIComponent(`Cancel reservation ${bookingId}`)}`} className="text-xs font-bold text-logo-red underline underline-offset-4">
            {isNl ? "Reservering annuleren" : "Cancel reservation"}
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InfoPanel
            title={isNl ? "Wat gebeurt er nu?" : "What happens next?"}
            items={[
              isNl ? `Bevestiging verstuurd naar ${emailShown}` : `Confirmation sent to ${emailShown}`,
              isNl ? "Wijzigen of annuleren kan tot 2 uur vooraf." : "You can edit or cancel up to 2 hours before.",
              isNl ? "Neem contact op bij dieetwensen of vertraging." : "Contact us for dietary needs or delays.",
            ]}
          />
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logo-red/10 text-logo-red">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl uppercase leading-none">{isNl ? "Bevestiging verstuurd" : "Confirmation sent"}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isNl
                    ? `We hebben de details gestuurd naar ${emailShown}.`
                    : `We sent the details to ${emailShown}.`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {isNl ? "Niet ontvangen? Controleer je spam of verstuur opnieuw." : "Not received? Check spam or resend it."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-logo-red px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-logo-red-hover" type="button">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isNl ? "Opnieuw versturen" : "Resend"}
                  </button>
                  <button className="text-xs font-bold text-logo-red underline underline-offset-4" type="button">
                    {isNl ? "E-mailadres wijzigen" : "Change email"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="grid min-h-[160px] grid-cols-[1fr_140px]">
              <div className="p-5">
                <h3 className="font-display text-xl uppercase leading-none">{isNl ? "Bekijk alvast het menu" : "Preview the menu"}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isNl ? "Populair bij reserveringen: Phở Bò, Bún Chả en verse spring rolls." : "Popular for reservations: Phở Bò, Bún Chả and fresh spring rolls."}
                </p>
                <a href={`/${locale}/menu`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-logo-red">
                  {isNl ? "Bekijk menu" : "View menu"} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="relative hidden sm:block">
                <Image src="/images/hero-pho.jpg" alt="" fill className="object-cover" sizes="140px" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logo-gold/10 text-logo-gold">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl uppercase leading-none">{isNl ? "Allergieën of voorkeuren?" : "Allergies or preferences?"}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isNl ? "Geef dieetwensen, kinderstoel of tafelvoorkeur door." : "Share dietary needs, a high chair or table preference."}
                </p>
                <button type="button" onClick={onEdit} className="mt-4 rounded-lg border border-logo-red px-4 py-2 text-xs font-bold uppercase tracking-wide text-logo-red hover:bg-logo-red hover:text-white">
                  {isNl ? "Voorkeuren doorgeven" : "Share preferences"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex flex-col gap-4 border-t border-gray-200 py-5 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <a href={`tel:${reservation.location.phone || "+31307857092"}`} className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 text-logo-red" />
            {isNl ? "Hulp nodig?" : "Need help?"} {reservation.location.phone || "+31 30 785 7092"}
          </a>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-logo-red" />
            {reservation.location.name} · {reservation.location.address}
          </span>
          <span className="text-gray-400">Privacy · {isNl ? "Voorwaarden" : "Terms"}</span>
        </footer>
      </div>
    </div>
  );
}

function ConfirmDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="py-4 sm:px-5 sm:py-2">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-logo-gold">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold leading-5 text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ icon, label, success = false }: { icon: React.ReactNode; label: string; success?: boolean }) {
  return (
    <span className={`inline-flex min-h-9 items-center gap-2 rounded-md px-5 text-xs font-bold ${success ? "bg-success/10 text-success" : "bg-white text-gray-700"}`}>
      {icon}
      {label}
    </span>
  );
}

function ActionButton({ href, icon, label, external = false }: { href: string; icon: React.ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex min-h-13 items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-foreground transition hover:border-logo-red hover:text-logo-red"
    >
      {icon}
      {label}
    </a>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="font-display text-xl uppercase leading-none">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-5 text-gray-600">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{item}</span>
          </div>
        ))}
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
