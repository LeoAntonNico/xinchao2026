"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Clock, ArrowLeft, Plus, Minus, ShoppingCart,
  Check, X, ChevronRight, Utensils, SlidersHorizontal, Flame
} from "lucide-react";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface Location {
  id: string;
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
}

interface PickupSlot {
  id: string;
  date: string;
  time: string;
}

interface Variant { id: string; name: string; nameNl?: string; price: number; }
interface Modifier { id: string; name: string; nameNl?: string; price: number; }

interface MenuItem {
  id: string;
  name: string;
  nameNl?: string | null;
  description: string | null;
  shortDescription: string | null;
  shortDescriptionNl?: string | null;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  dietaryTags: string[];
  isSpicy: boolean;
  isPopular?: boolean;
  variants: Variant[];
  modifiers: Modifier[];
}

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function fmtDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function OrderPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isNl = locale === "nl";

  const {
    addItem, decreaseItem, items: cartItems, total: cartTotal, setIsOpen,
  } = useCart();

  /* ── data ── */
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"location" | "menu">("location");

  /* ── menu state ── */
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([]);

  /* ── fetch data ── */
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        setLocations(data);
        setLoading(false);
        const savedLoc = sessionStorage.getItem("order_locationId");
        if (savedLoc && data.some((l: Location) => l.id === savedLoc)) {
          setSelectedLocation(savedLoc);
          const savedSlot = sessionStorage.getItem("order_slotId");
          if (savedSlot) setSelectedSlot(savedSlot);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    fetch(`/api/slots?locationId=${selectedLocation}&days=7`)
      .then((r) => r.json())
      .then(setSlots);
    fetch(`/api/menu?locationId=${selectedLocation}&locale=${locale}`)
      .then((r) => r.json())
      .then(setCategories);
  }, [selectedLocation, locale]);

  useEffect(() => {
    if (selectedLocation) sessionStorage.setItem("order_locationId", selectedLocation);
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedSlot) {
      sessionStorage.setItem("order_slotId", selectedSlot);
      setStep("menu");
    }
  }, [selectedSlot]);

  useEffect(() => {
    if (selectedLocation && selectedSlot) setStep("menu");
  }, [selectedLocation, selectedSlot]);

  /* ── price helpers ── */
  function getItemPrice(item: MenuItem) {
    const base = item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
    if (!selectedVariant) return base;
    const v = item.variants.find((x) => x.id === selectedVariant);
    return v && v.price > 0 ? v.price : base;
  }

  function getModifierTotal(item: MenuItem) {
    return item.modifiers
      .filter((m) => selectedModifiers.includes(m.id))
      .reduce((s, m) => s + m.price, 0);
  }

  function handleAdd(item: MenuItem) {
    const unit = getItemPrice(item) + getModifierTotal(item);
    const modNames = item.modifiers
      .filter((m) => selectedModifiers.includes(m.id))
      .map((m) => isNl && m.nameNl ? m.nameNl : m.name);
    const vName = selectedVariant
      ? item.variants.find((v) => v.id === selectedVariant)?.name
      : undefined;
    addItem({
      menuItemId: item.id,
      name: isNl && item.nameNl ? item.nameNl : item.name,
      price: unit,
      variantId: selectedVariant || undefined,
      variantName: vName,
      modifierIds: selectedModifiers,
      modifierNames: modNames,
    });
    setSelectedItem(null);
    setSelectedVariant("");
    setSelectedModifiers([]);
  }

  function toggleModifier(modId: string) {
    setSelectedModifiers((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  }

  /* ── cart helpers ── */
  const cartCount = cartItems.reduce((s, it) => s + it.quantity, 0);

  function cartQtyFor(itemId: string) {
    return cartItems
      .filter((i) => i.menuItemId === itemId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  /* ── dietary filter toggle ── */
  function toggleDietary(tag: string) {
    setDietaryFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const allDietaryTags = Array.from(
    new Set(categories.flatMap((c) => c.items.flatMap((i) => i.dietaryTags)))
  );

  /* ═══════════════════════════════════════════
     LOCATION SELECTION
     ═══════════════════════════════════════════ */
  if (step === "location") {
    const accentMap: Record<string, { bar: string; badge: string; text: string; border: string; btnText: string }> = {
      utrecht:   { bar: "bg-neon-pink", badge: "bg-neon-pink", text: "text-neon-pink", border: "border-neon-pink", btnText: "text-neon-pink" },
      wageningen:{ bar: "bg-lime",       badge: "bg-lime",       text: "text-lime",       border: "border-lime",       btnText: "text-lime" },
    };

    return (
      <div className="space-y-10 pb-20 px-6 md:px-10">
        {/* Header */}
        <div className="space-y-2 pt-6">
          <h1 className="font-display text-[36px] md:text-[48px] leading-none tracking-tight uppercase italic text-white">
            {isNl ? "Hoi, hoe gaat het?" : "Hey, what's up?"}
          </h1>
          <p className="text-[14px] text-gray-400 font-mono tracking-wide">
            {isNl ? "Kies waar je wilt bestellen" : "Choose where you'd like to order"}
          </p>
        </div>

        {/* Location cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {locations.map((loc) => {
            const a = accentMap[loc.name.toLowerCase()] || accentMap.utrecht;
            const selected = selectedLocation === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`relative text-left bg-surface-container border overflow-hidden transition-all ${selected ? `${a.border} border-2` : "border-white/10 hover:border-white/20"}`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[8px] ${a.bar}`} />
                <div className="pl-5 p-0">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <span className={`inline-block ${a.badge} text-black text-[10px] font-bold font-mono tracking-[0.1em] uppercase px-2 py-1`}>
                      OPEN NOW
                    </span>
                    <span className="font-display text-[20px] font-normal italic uppercase text-white tracking-tight">
                      {loc.name}
                    </span>
                  </div>
                  <div className="relative w-full aspect-[16/9] overflow-hidden">
                    <Image
                      src="/images/hero-pho.jpg"
                      alt={loc.name}
                      fill
                      className="object-cover grayscale"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-[13px] text-white/80 leading-relaxed uppercase tracking-wide">
                      {loc.address}
                    </p>
                    <div className={`inline-flex items-center justify-center w-full py-3 border ${a.border} ${a.btnText} text-[12px] font-bold font-mono tracking-[0.1em] uppercase transition-colors ${selected ? `${a.badge} text-black` : "bg-transparent hover:bg-white/5"}`}>
                      {isNl ? `${loc.name.toUpperCase()} SELECTEREN` : `SELECT ${loc.name.toUpperCase()}`}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {selectedLocation && (
          <div className="space-y-4">
            <h2 className="font-display text-[24px] font-normal uppercase italic text-white tracking-tight">
              {isNl ? "Kies een afhaaltijd" : "Pick a pickup time"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`p-4 border text-center transition-all ${
                    selectedSlot === slot.id
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                      : "border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="font-medium text-sm">{fmtDate(slot.date, locale)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{slot.time}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── filtered categories ── */
  const filteredCategories = dietaryFilter.length > 0
    ? categories.map((c) => ({
        ...c,
        items: c.items.filter((i) => dietaryFilter.every((tag) => i.dietaryTags.includes(tag))),
      })).filter((c) => c.items.length > 0)
    : categories;

  const locName = locations.find((l) => l.id === selectedLocation)?.name || "";
  const slotDate = fmtDate(slots.find((s) => s.id === selectedSlot)?.date || "", locale);
  const slotTime = slots.find((s) => s.id === selectedSlot)?.time || "";

  /* ═══════════════════════════════════════════
     MENU BROWSING + CART
     ═══════════════════════════════════════════ */
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] min-h-0">
      {/* ═══════ LEFT PANEL ═══════ */}
      <div className="flex-1 min-w-0 overflow-y-auto">

        {/* ── Hero Header ── */}
        <div className="px-6 pt-8 pb-2">
          <div className="flex items-end justify-between mb-1">
            <div>
              <h1 className="font-display text-[56px] md:text-[80px] leading-[0.85] uppercase text-neon-pink tracking-tight">
                {isNl ? "MENU" : "MENU"}
              </h1>
              <p className="text-lime text-[11px] font-mono tracking-[0.18em] uppercase mt-2">
                {isNl
                  ? "Authentieke straatvoedsel smaken / vers dagelijks"
                  : "Authentic street food flavours / fresh daily"}
              </p>
            </div>
            <button
              onClick={() => setDietaryFilter(dietaryFilter.length > 0 ? [] : allDietaryTags.slice(0, 1))}
              className="flex items-center gap-2 px-4 py-2.5 border border-white/15 text-white/70 text-[11px] font-mono uppercase tracking-[0.1em] hover:border-white/30 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {isNl ? "Filter" : "Filter"}
            </button>
          </div>

          {/* Dietary filter chips */}
          {allDietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {allDietaryTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleDietary(tag)}
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] border transition-colors ${
                    dietaryFilter.includes(tag)
                      ? "bg-neon-pink border-neon-pink text-black"
                      : "border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Pickup info bar ── */}
        <div className="px-6 pb-4 flex items-center gap-2 text-gray-500 text-[11px] font-mono">
          <MapPin className="w-3 h-3" />
          <span>{locName}</span>
          <span className="text-gray-700">·</span>
          <Clock className="w-3 h-3" />
          <span>{slotDate} {slotTime}</span>
          <button
            onClick={() => { setStep("location"); setActiveCat(null); }}
            className="ml-auto text-neon-pink hover:text-white transition-colors underline underline-offset-2"
          >
            {isNl ? "Wijzigen" : "Change"}
          </button>
        </div>

        {/* ── Category sections ── */}
        <div className="px-6 pb-12 space-y-10">
          {filteredCategories.map((cat, catIdx) => {
            const isEven = catIdx % 2 === 0; // 0,2 = pink; 1,3 = lime
            const headerColor = isEven ? "text-white" : "text-lime";
            const priceTagBg = isEven ? "bg-neon-pink" : "bg-lime";
            const numColor = isEven ? "text-neon-pink" : "text-lime";
            const isLast = catIdx === filteredCategories.length - 1;
            const itemCount = cat.items.length + (isLast ? 1 : 0); // +1 for promo card

            return (
              <section key={cat.id}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-neon-pink shrink-0" />
                    <h2 className={`font-display text-[22px] md:text-[26px] uppercase tracking-tight ${headerColor}`}>
                      {cat.name}
                    </h2>
                  </div>
                  <span className={`font-mono text-[13px] ${numColor} tracking-wide`}>
                    {String(catIdx + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Product grid (2-col) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cat.items.map((item) => {
                    const inCartQty = cartQtyFor(item.id);
                    const img = item.imageUrl;
                    const name = isNl && item.nameNl ? item.nameNl : item.name;
                    const desc = isNl && item.shortDescriptionNl
                      ? item.shortDescriptionNl
                      : item.shortDescription || item.description;
                    const displayPrice = item.salePrice && item.salePrice < item.price
                      ? item.salePrice
                      : item.price;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setSelectedVariant("");
                          setSelectedModifiers([]);
                        }}
                        className="group text-left w-full"
                      >
                        {/* Image + price tag */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                          {img ? (
                            <img
                              src={img}
                              alt={name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container">
                              <Utensils className="w-8 h-8 text-gray-700" />
                            </div>
                          )}
                          {/* Price tag */}
                          <div
                            className={`absolute top-3 right-3 px-2.5 py-1 ${priceTagBg} text-black font-bold font-mono text-[11px] leading-none`}
                          >
                            {fmtPrice(displayPrice)}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="pt-3 pb-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-[14px] uppercase tracking-wide leading-tight">
                              {name}
                            </h3>
                            {item.isSpicy && (
                              <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                            {desc}
                          </p>

                          {/* Tags + cart qty */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {item.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] text-gray-600 uppercase tracking-wider font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            {inCartQty > 0 && (
                              <span className="text-[10px] font-mono text-neon-pink font-bold">
                                {inCartQty}x in cart
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Promo card on last category */}
                  {isLast && (
                    <div className="relative bg-neon-pink flex flex-col items-center justify-center text-center p-6 aspect-[4/3]">
                      <Utensils className="w-10 h-10 text-black/30" />
                      <h3 className="font-display text-[18px] uppercase text-black tracking-tight mt-4 leading-none">
                        {isNl ? "Nog meer trek?" : "Hungry for more?"}
                      </h3>
                      <p className="text-[12px] text-black/70 mt-2 max-w-[200px]">
                        {isNl
                          ? "Ontdek ons volledige aanbod straatvoedsel klassiekers."
                          : "Discover our full range of street food classics and authentic drinks."}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCat(null);
                          const el = document.querySelector(".overflow-y-auto");
                          el?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="mt-5 px-5 py-2.5 bg-black text-white text-[11px] font-bold font-mono uppercase tracking-[0.1em] hover:bg-black/80 transition-colors"
                      >
                        {isNl ? "Bekijk volledig menu" : "View Full Menu"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ═══════ RIGHT PANEL — CART ═══════ */}
      <div className="w-full lg:w-[340px] shrink-0 border-l border-white/10 bg-surface flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <h2 className="font-display text-[20px] uppercase tracking-tight text-white">
            {isNl ? "Mijn bestelling" : "My Order"}
          </h2>
          <p className="font-mono text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {isNl ? "Lokaal afhalen" : "Take Out"} &middot; {locName}
          </p>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-[13px] font-mono">
                {isNl ? "Je winkelwagen is leeg" : "Your cart is empty"}
              </p>
              <p className="text-gray-600 text-[11px] mt-1 font-mono">
                {isNl ? "Tap een gerecht om toe te voegen" : "Tap a dish to add it"}
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={`${item.menuItemId}-${item.variantId || "v"}-${(item.modifierIds || []).join(",")}`} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decreaseItem(item.menuItemId)}
                    className="w-7 h-7 border border-white/15 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-white font-bold text-[13px] w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      addItem({
                        menuItemId: item.menuItemId,
                        name: item.name,
                        price: item.price,
                        variantId: item.variantId,
                        variantName: item.variantName,
                        modifierIds: item.modifierIds,
                        modifierNames: item.modifierNames,
                      })
                    }
                    className="w-7 h-7 bg-neon-pink flex items-center justify-center text-black hover:brightness-110 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] truncate">{item.name}</p>
                  {item.variantName && (
                    <p className="text-[10px] text-gray-500">{item.variantName}</p>
                  )}
                  {item.modifierNames && item.modifierNames.length > 0 && (
                    <p className="text-[10px] text-gray-500 truncate">
                      {item.modifierNames.join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 text-[13px] shrink-0 font-mono">
                  {fmtPrice(item.price * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="px-5 py-5 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-gray-400 uppercase tracking-wide">
                {isNl ? "Totaal" : "Total"}
              </span>
              <span className="text-white text-[26px] font-bold">{fmtPrice(cartTotal)}</span>
            </div>
            <Link
              href={`/${locale}/checkout`}
              className="block w-full py-4 bg-neon-pink text-black font-bold text-center text-[13px] tracking-[0.08em] uppercase hover:brightness-110 transition-all"
            >
              {isNl ? "AFREKENEN" : "CHECKOUT"} &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ═══════ ITEM MODAL ═══════ */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-surface-container border border-white/15 w-full max-w-[440px] max-h-[90vh] overflow-y-auto">
            {/* Image */}
            <div className="h-52 w-full relative">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center text-gray-600">
                  <Utensils className="w-12 h-12" />
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Title + price */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[20px] uppercase tracking-tight text-white leading-none">
                    {isNl && selectedItem.nameNl ? selectedItem.nameNl : selectedItem.name}
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-1.5">
                    {isNl && selectedItem.shortDescriptionNl
                      ? selectedItem.shortDescriptionNl
                      : selectedItem.shortDescription || selectedItem.description}
                  </p>
                </div>
                <span className="text-brand-gold font-bold text-[18px] shrink-0">
                  {fmtPrice(getItemPrice(selectedItem) + getModifierTotal(selectedItem))}
                </span>
              </div>

              {/* Variants */}
              {selectedItem.variants.length > 0 && (
                <div className="space-y-2.5">
                  <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                    {isNl ? "Kies een optie" : "Choose an option"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedVariant("")}
                      className={`px-3 py-2 border text-[13px] transition-colors ${
                        !selectedVariant
                          ? "border-neon-pink bg-neon-pink/10 text-white"
                          : "border-white/15 text-gray-300 hover:border-white/30"
                      }`}
                    >
                      Regular
                    </button>
                    {selectedItem.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v.id)}
                        className={`px-3 py-2 border text-[13px] transition-colors ${
                          selectedVariant === v.id
                            ? "border-neon-pink bg-neon-pink/10 text-white"
                            : "border-white/15 text-gray-300 hover:border-white/30"
                        }`}
                      >
                        {isNl && v.nameNl ? v.nameNl : v.name}{" "}
                        {v.price > 0 ? `(+${fmtPrice(v.price)})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {selectedItem.modifiers.length > 0 && (
                <div className="space-y-2.5">
                  <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                    {isNl ? "Extras" : "Add-ons"}
                  </label>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((m) => {
                      const checked = selectedModifiers.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleModifier(m.id)}
                          className={`w-full flex items-center justify-between p-3 border text-left transition-colors ${
                            checked
                              ? "border-neon-pink bg-neon-pink/10"
                              : "border-white/15 hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                                checked ? "bg-neon-pink border-neon-pink" : "border-gray-500"
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 text-black" />}
                            </div>
                            <span className="text-white text-[13px]">
                              {isNl && m.nameNl ? m.nameNl : m.name}
                            </span>
                          </div>
                          {m.price > 0 && (
                            <span className="text-brand-gold text-[13px] shrink-0">+{fmtPrice(m.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add button */}
              <button
                onClick={() => handleAdd(selectedItem)}
                className="w-full py-4 bg-neon-pink text-black font-bold text-[13px] tracking-[0.08em] uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isNl ? "Toevoegen" : "Add to order"} &middot; {fmtPrice(getItemPrice(selectedItem) + getModifierTotal(selectedItem))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
