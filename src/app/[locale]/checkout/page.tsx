"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { useLocale, useTranslations } from "next-intl";

/* ─── helpers ─── */
function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function fmtPriceRaw(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function CheckoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isNl = locale === "nl";
  const { items, total, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locationId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("order_locationId") || ""
      : "";
  const slotId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("order_slotId") || ""
      : "";

  /* tax display: reverse-calculate 9% from total (assumes prices include tax) */
  const subtotal = Math.round(total * 100 / 109);
  const tax = total - subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setError(isNl ? "Naam en telefoon zijn verplicht" : "Name and phone are required");
      return;
    }
    if (items.length === 0) {
      setError(isNl ? "Je winkelwagen is leeg" : "Cart is empty");
      return;
    }
    if (!locationId || !slotId) {
      setError(isNl ? "Selecteer eerst een locatie en afhaaltijd" : "Please select a location and pickup time first");
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
        console.error("Order API error:", data.error);
        throw new Error(data.error && data.error.includes("Authorization")
          ? (isNl ? "Betalingsdienst is niet geconfigureerd." : "Payment service is not configured. Please contact the restaurant.")
          : (data.error || (isNl ? "Bestelling mislukt. Probeer opnieuw." : "Order could not be placed. Please try again.")));
      }
      if (!data.paymentUrl) throw new Error(isNl ? "Geen betaal-URL ontvangen" : "No payment URL returned");

      clearCart();
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  /* Empty cart */
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <p className="font-mono text-gray-500 text-[14px] tracking-wide">
            {isNl ? "Je winkelwagen is leeg" : "YOUR CART IS EMPTY"}
          </p>
          <a
            href={`/${locale}/order`}
            className="inline-block px-6 py-3 border border-neon-pink text-neon-pink text-[12px] font-bold font-mono tracking-[0.1em] uppercase hover:bg-neon-pink hover:text-black transition-colors"
          >
            {isNl ? "Terug naar menu" : "BACK TO MENU"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8">
      {/* ═══════ HEADER ═══════ */}
      <div className="mb-10">
        <h1 className="font-display text-[42px] md:text-[56px] leading-none uppercase italic text-white tracking-tight">
          <span className="inline-block border-b-[6px] border-lime pb-1 mr-3">Pickup</span>
          <span className="text-white/90">Checkout</span>
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══════ LEFT COLUMN ═══════ */}
        <div className="flex-1 min-w-0 space-y-10">
          {/* Contact */}
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-[22px] uppercase italic text-neon-pink tracking-tight">
                {isNl ? "Contactgegevens" : "Contact Information"}
              </h2>
              <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.1em]">
                Contact_info
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                    {isNl ? "Volledige naam" : "Full Name"}
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isNl ? "Wie ben jij?" : "Who are you?"}
                    className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-neon-pink focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                    {isNl ? "E-mailadres" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@soul.com"
                    className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-neon-pink focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                  {isNl ? "Telefoonnummer" : "Phone Number"}
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+31 00 000 0000"
                  className="w-full px-4 py-3 bg-surface-container border border-white/10 text-white text-[14px] placeholder:text-gray-600 focus:border-neon-pink focus:outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-[22px] uppercase italic text-lime tracking-tight">
                {isNl ? "Betaalmethode" : "Payment Method"}
              </h2>
              <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.1em]">
                Payment
              </span>
            </div>

            <button
              type="button"
              className="w-full sm:w-auto px-8 py-6 border-[3px] border-lime bg-surface-container flex flex-col items-center gap-2 hover:bg-lime/5 transition-colors"
            >
              {/* Bank icon (classical building) */}
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lime">
                <path d="M3 21h18M4 18h16M3 10l9-7 9 7M5 10v8m14-8v8M8 14v4m8-4v4m-4-4v4" />
                <path d="M12 3L3 10h18L12 3z" fill="currentColor" opacity="0.15" />
              </svg>
              <span className="font-mono text-[11px] text-lime uppercase tracking-[0.12em] font-bold">
                iDEAL
              </span>
            </button>
          </section>

          {error && (
            <p className="font-mono text-[12px] text-neon-pink uppercase tracking-wide">
              {error}
            </p>
          )}
        </div>

        {/* ═══════ RIGHT COLUMN — ORDER SUMMARY ═══════ */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="border-[3px] border-neon-pink bg-surface-container relative">
            {/* Skewed tag */}
            <div className="absolute -top-3 left-4">
              <div className="bg-neon-pink text-white font-mono text-[10px] font-bold tracking-[0.08em] uppercase px-3 py-1 skew-x-[-12deg]">
                <span className="inline-block skew-x-[12deg]">Order_v01</span>
              </div>
            </div>

            <div className="p-6 pt-7 space-y-6">
              <h2 className="font-display text-[24px] uppercase tracking-tight text-white">
                {isNl ? "Besteloverzicht" : "Order Summary"}
              </h2>

              {/* Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.menuItemId}-${item.variantName || ""}-${(item.modifierNames || []).join(",")}`} className="flex items-start gap-3">
                    <span className="text-lime font-bold text-[13px] font-mono shrink-0 min-w-[28px]">
                      {item.quantity}x
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[14px] font-bold uppercase tracking-wide truncate">
                        {item.name}
                      </p>
                      {item.modifierNames && item.modifierNames.length > 0 && (
                        <p className="text-gray-500 text-[10px] font-mono mt-0.5">
                          {item.modifierNames.join(" + ").toUpperCase()}
                        </p>
                      )}
                    </div>
                    <span className="text-neon-pink font-bold text-[14px] font-mono shrink-0">
                      {fmtPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Financial breakdown */}
              <div className="space-y-2 font-mono text-[12px] uppercase tracking-wide">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{isNl ? "Subtotaal" : "Subtotal"}</span>
                  <span className="text-white">{fmtPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{isNl ? "Btw (9%)" : "Street Tax (9%)"}</span>
                  <span className="text-white">{fmtPrice(tax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{isNl ? "Afhaalkosten" : "Pickup Fee"}</span>
                  <span className="text-lime font-bold">{isNl ? "GRATIS" : "FREE"}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Total */}
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[20px] uppercase italic text-neon-pink tracking-tight">
                  {isNl ? "Totaal" : "Total"}
                </span>
                <span className="font-display text-[32px] uppercase italic text-neon-pink tracking-tight">
                  {fmtPrice(total)}
                </span>
              </div>

              {/* Promo */}
              <div className="flex gap-2">
                <input
                  placeholder={isNl ? "Kortingscode" : "Promo Code"}
                  className="flex-1 px-4 py-3 bg-surface border border-white/10 text-white text-[13px] placeholder:text-gray-600 focus:border-neon-pink focus:outline-none transition-colors"
                />
                <button className="px-5 py-3 bg-surface-container border border-white/10 text-gray-300 text-[11px] font-bold font-mono uppercase tracking-[0.1em] hover:border-neon-pink hover:text-neon-pink transition-colors">
                  {isNl ? "Toep" : "Apply"}
                </button>
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-5 bg-neon-pink text-black font-bold text-[15px] tracking-[0.06em] uppercase hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading
                  ? (isNl ? "Bezig..." : "Processing...")
                  : (isNl ? "Bestelling Plaatsen" : "Place Order")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
