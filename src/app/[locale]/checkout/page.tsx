
"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { useTranslations } from "next-intl";

export default function CheckoutPage() {
  const t = useTranslations();
  const { items, total, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  const locationId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("order_locationId") || ""
      : "";
  const slotId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("order_slotId") || ""
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }
    if (items.length === 0) {
      setError("Cart is empty");
      return;
    }
    if (!locationId || !slotId) {
      setError("Please select a location and pickup time first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            price: i.price,
          })),
          locationId,
          slot: slotId,
          name,
          phone,
          email,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Mask internal errors; show generic message to user
        console.error("Order API error:", data.error);
        throw new Error(data.error && data.error.includes("Authorization")
          ? "Payment service is not configured. Please contact the restaurant."
          : (data.error || "Order could not be placed. Please try again."));
      }
      if (!data.paymentUrl) throw new Error("No payment URL returned");

      clearCart();
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Your cart is empty</p>
        <a href="/en/order" className="text-brand-gold mt-4 inline-block hover:underline">
          Go back to menu
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("order.checkout")}</h1>
        <p className="text-gray-400">Review your order and complete payment</p>
      </div>

      {/* Order summary */}
      <div className="bg-sidebar border border-border-default rounded-xl p-4 space-y-3">
        {items.map((item) => (
          <div key={item.menuItemId} className="flex justify-between text-sm">
            <span className="text-white">{item.name} × {item.quantity}</span>
            <span className="text-gray-300">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-border-default pt-3 flex justify-between">
          <span className="font-semibold text-white">Total</span>
          <span className="font-bold text-brand-gold">{formatPrice(total)}</span>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-2">{t("order.yourName")} *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-sidebar border border-border-default rounded-lg text-white focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">{t("order.phone")} *</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-sidebar border border-border-default rounded-lg text-white focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">{t("order.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-sidebar border border-border-default rounded-lg text-white focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">{t("order.notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-sidebar border border-border-default rounded-lg text-white focus:border-brand-gold focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors disabled:opacity-50"
        >
          {loading ? t("common.loading") : `${t("order.confirm")} →`}
        </button>
      </form>
    </div>
  );
}
