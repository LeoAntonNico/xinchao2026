"use client";

import { useState, useEffect, useCallback } from "react";

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
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (res: Reservation) => void;
  editingItem: Reservation | null;
  locations: Location[];
}

export function ReservationModal({ isOpen, onClose, onSave, editingItem, locations }: ReservationModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("CONFIRMED");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const timeOptions = [
    "12:00","12:30","13:00","13:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30"
  ];

  useEffect(() => {
    if (editingItem) {
      setCustomerName(editingItem.customerName);
      setCustomerPhone(editingItem.customerPhone);
      setCustomerEmail(editingItem.customerEmail || "");
      setDate(editingItem.date.slice(0, 10));
      setTime(editingItem.time);
      setPartySize(String(editingItem.partySize));
      setNotes(editingItem.notes || "");
      setLocationId(editingItem.locationId);
      setStatus(editingItem.status);
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDate(today);
      setTime("18:00");
      setPartySize("2");
      setNotes("");
      setLocationId(locations[0]?.id || "");
      setStatus("CONFIRMED");
    }
    setErrors([]);
    setSaving(false);
  }, [editingItem, isOpen, locations, today]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!customerName.trim()) errs.push("Name is required");
    if (!customerPhone.trim()) errs.push("Phone is required");
    if (!date) errs.push("Date is required");
    if (!time) errs.push("Time is required");
    if (!partySize || isNaN(parseInt(partySize)) || parseInt(partySize) < 1) errs.push("Party size ≥ 1");
    if (!locationId) errs.push("Location is required");
    return errs;
  }, [customerName, customerPhone, date, time, partySize, locationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const payload = {
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      date,
      time,
      partySize: parseInt(partySize),
      notes: notes || null,
      locationId,
      status,
    };

    try {
      const url = editingItem ? `/api/admin/reservations/${editingItem.id}` : "/api/admin/reservations";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(errData.error || "Save failed");
      }
      const resv = await res.json();
      onSave(resv);
      onClose();
    } catch (err: any) {
      setErrors([err.message || "Failed to save" ]);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-20 overflow-y-auto pb-10">
      <div className="bg-white border border-border-default rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {editingItem ? "Edit Reservation" : "New Reservation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {errors.join(", ")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
                placeholder="+31 6..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Party</label>
              <input
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500"
              >
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="SEATED">SEATED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500 resize-none"
              placeholder="Allergies, special requests..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-border-default hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-red hover:bg-red-700 text-foreground transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
