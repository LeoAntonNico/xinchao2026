"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

interface LocationOption {
  id: string;
  name: string;
  slug: string;
}

export default function OrderPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [slots, setSlots] = useState<{ id: string; time: string; date: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    location: "",
    slot: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d));
  }, []);

  useEffect(() => {
    if (form.location) {
      fetch(`/api/slots?locationId=${form.location}&days=3`)
        .then((r) => r.json())
        .then((d) => setSlots(d.slice(0, 10)));
    }
  }, [form.location]);

  const formatPrice = (cents: number) =>
    `\u20ac${(cents / 100).toFixed(2).replace(".", ",")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length || !form.location || !form.slot) return;
    setLoading(true);
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      alert(data.error || "Something went wrong");
    }
  };

  if (!items.length) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Your Order</h1>
        <p className="text-gray-400">Your cart is empty. Head to the menu to add items!</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Checkout</h1>

      <div className="mb-6 rounded-xl border border-white/5 bg-sidebar p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Order Summary</h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.menuItemId} className="flex justify-between text-sm">
              <span className="text-gray-300">{item.name} x{item.quantity}</span>
              <span className="text-white font-medium">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-white/5 pt-3 flex justify-between font-semibold text-white">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Location</label>
          <select
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value, slot: "" })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            required
          >
            <option value="">Select a location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Pickup Time</label>
          <select
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            required
            disabled={!form.location}
          >
            <option value="">Select a time</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>{s.date} {s.time}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Your Name</label>
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
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg bg-sidebar border border-white/10 px-4 py-2.5 text-white text-sm focus:border-brand-gold focus:outline-none"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-red py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Processing..." : "Pay with Mollie"}
        </button>
      </form>
    </div>
  );
}
