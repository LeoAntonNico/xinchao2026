"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Clock, ArrowLeft, Plus, Minus, ShoppingCart,
  Check, X, ChevronRight, Utensils, SlidersHorizontal, Flame,
  Calendar, Zap, Moon, ChevronDown
} from "lucide-react";

import TimeSlotPicker from "./TimeSlotPicker";
import OrderSummary from "./OrderSummary";

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
interface Exclusion { id: string; name: string; nameNl?: string; }

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
  isAvailable: boolean;
  isDineInOnly: boolean;
  variants: Variant[];
  modifiers: Modifier[];
  exclusions: Exclusion[];
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
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
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
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>([]);
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

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
    const exclNames = item.exclusions
      .filter((e) => selectedExclusions.includes(e.id))
      .map((e) => isNl && e.nameNl ? e.nameNl : e.name);
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
      exclusionIds: selectedExclusions,
      exclusionNames: exclNames,
    });
    setSelectedItem(null);
    setSelectedVariant("");
    setSelectedModifiers([]);
    setSelectedExclusions([]);
  }

  function handleQuickAdd(item: MenuItem) {
    if (item.variants.length > 0 || item.modifiers.length > 0 || item.exclusions.length > 0) {
      setSelectedItem(item);
      setSelectedVariant(item.variants[0]?.id || "");
      setSelectedModifiers([]);
      setSelectedExclusions([]);
    } else {
      addItem({
        menuItemId: item.id,
        name: isNl && item.nameNl ? item.nameNl : item.name,
        price: item.salePrice && item.salePrice < item.price ? item.salePrice : item.price,
      });
    }
  }

  function toggleModifier(modId: string) {
    setSelectedModifiers((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  }

  function toggleExclusion(exclId: string) {
    setSelectedExclusions((prev) =>
      prev.includes(exclId) ? prev.filter((id) => id !== exclId) : [...prev, exclId]
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
    const stepLabels = isNl
      ? ["Locatie", "Kies afhaaltijd", "Bestellen"]
      : ["Location", "Choose pickup time", "Order"];

    const currentStep = selectedSlot ? 3 : selectedLocation ? 2 : 1;

    return (
      <div className="space-y-8 pb-20 px-6 md:px-10">
        {/* ── Progress Stepper ── */}
        <div className="pt-8">
          <div className="flex items-center gap-0 max-w-2xl">
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isDone = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              const isLast = idx === stepLabels.length - 1;
              return (
                <div key={idx} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-7 h-7 flex items-center justify-center text-[12px] font-bold font-mono border transition-colors ${
                      isDone
                        ? "bg-logo-red border-logo-red text-foreground"
                        : isActive
                        ? "bg-logo-red border-logo-red text-foreground"
                        : "bg-transparent border-gray-200 text-foreground/40"
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
                    </div>
                    <span className={`hidden sm:inline text-[11px] font-mono uppercase tracking-wide whitespace-nowrap ${
                      isDone || isActive ? "text-foreground" : "text-foreground/40"
                    }`}>
                      {label}
                    </span>
                    {isDone && (
                      <Check className="w-3 h-3 text-logo-red hidden sm:block" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`h-px flex-1 mx-2 transition-colors ${
                      currentStep > stepNum ? "bg-logo-red/60" : "bg-white/10"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Header ── */}
        <div className="space-y-1">
          <p className="text-[13px] text-gray-400 font-mono tracking-wide">
            {isNl ? "Kies waar je wilt bestellen" : "Choose where you'd like to order"}
          </p>
        </div>

        {/* ── Location Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {locations.map((loc) => {
            const selected = selectedLocation === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`relative text-left bg-surface overflow-hidden transition-all group ${
                  selected
                    ? "ring-2 ring-logo-red shadow-[0_0_20px_rgba(255,26,26,0.25)]"
                    : "border border-gray-200 hover:border-gray-200"
                }`}
              >
                {/* Top-right checkmark badge when selected */}
                {selected && (
                  <div className="absolute top-3 right-3 z-20 w-6 h-6 bg-logo-red flex items-center justify-center">
                    <Check className="w-4 h-4 text-foreground" strokeWidth={3} />
                  </div>
                )}

                {/* OPEN NOW badge */}
                <div className="absolute top-3 left-3 z-20">
                  <span className="inline-block bg-logo-red text-foreground text-[10px] font-bold font-mono tracking-[0.08em] uppercase px-2.5 py-1">
                    OPEN NOW
                  </span>
                </div>

                {/* Hero image */}
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <Image
                    src="/images/hero-pho.jpg"
                    alt={loc.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/20 to-transparent" />
                </div>

                {/* Info + Button */}
                <div className="px-4 py-4 space-y-3">
                  <h3 className="font-display text-[18px] font-bold uppercase text-foreground tracking-tight">
                    {loc.name}
                  </h3>
                  <div className="flex items-start gap-1.5 text-[12px] text-foreground/60">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{loc.address}</span>
                  </div>
                  <div className={`inline-flex items-center justify-center w-full py-2.5 text-[11px] font-bold font-mono tracking-[0.1em] uppercase transition-all ${
                    selected
                      ? "bg-logo-red text-foreground"
                      : "border border-logo-red text-logo-red bg-transparent hover:bg-logo-red/10"
                  }`}>
                    {selected ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" /> {isNl ? "Geselecteerd" : "Selected"}
                      </span>
                    ) : (
                      isNl ? "Kies locatie" : "Choose location"
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Order Summary + Time Picker ── */}
        {selectedLocation && (
          <div className="space-y-8">
            <TimeSlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={(id) => setSelectedSlot(id)}
              locale={locale}
            />
          </div>
        )}
      </div>
    );
  }

  /* ── filtered categories ── */
  const filteredCategories = (() => {
    let cats = dietaryFilter.length > 0
      ? categories.map((c) => ({
          ...c,
          items: c.items.filter((i) => dietaryFilter.every((tag) => i.dietaryTags.includes(tag))),
        })).filter((c) => c.items.length > 0)
      : categories;
    if (activeCat) {
      cats = cats.filter((c) => c.id === activeCat);
    }
    return cats;
  })();

  const locName = locations.find((l) => l.id === selectedLocation)?.name || "";
  const slotDate = fmtDate(slots.find((s) => s.id === selectedSlot)?.date || "", locale);
  const slotTime = slots.find((s) => s.id === selectedSlot)?.time || "";

  /* ═══════════════════════════════════════════
     MENU BROWSING + CART
     ═══════════════════════════════════════════ */
  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] lg:min-h-0">
      {/* ═══════ LEFT PANEL ═══════ */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto pb-8">

        {/* ── Order Summary Banner ── */}
        <div className="pt-6">
          <OrderSummary
            locationName={locName}
            date={slotDate}
            time={slotTime}
            locale={locale}
            onChange={() => { setStep("location"); setActiveCat(null); }}
          />
        </div>

        {/* ── Hero Header ── */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-end justify-between mb-1">
            <div>
              <h1 className="font-display text-[56px] md:text-[80px] leading-[0.85] uppercase text-logo-red tracking-tight">
                {isNl ? "MENU" : "MENU"}
              </h1>
              <p className="text-logo-gold text-[11px] font-mono tracking-[0.18em] uppercase mt-2">
                {isNl
                  ? "Authentic street food flavours / fresh daily"
                  : "Authentic street food flavours / fresh daily"}
              </p>
            </div>
            <button
              onClick={() => setDietaryFilter(dietaryFilter.length > 0 ? [] : allDietaryTags.slice(0, 1))}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-foreground/70 text-[11px] font-mono uppercase tracking-[0.1em] hover:border-border-default hover:text-foreground transition-colors"
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
                      ? "bg-logo-red border-logo-red text-black"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-400"
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
          <span className="text-gray-400">·</span>
          <Clock className="w-3 h-3" />
          <span>{slotDate} {slotTime}</span>
          <button
            onClick={() => { setStep("location"); setActiveCat(null); }}
            className="ml-auto text-logo-red hover:text-foreground transition-colors underline underline-offset-2"
          >
            {isNl ? "Wijzigen" : "Change"}
          </button>
        </div>

        {/* ── Category pills ── */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveCat(null)}
              className={`shrink-0 px-4 py-2 text-[11px] font-bold font-mono uppercase tracking-[0.1em] border transition-colors ${
                activeCat === null
                  ? "bg-logo-red border-logo-red text-black"
                  : "bg-white border-gray-200 text-foreground hover:border-gray-300"
              }`}
            >
              {isNl ? "Alles" : "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                className={`shrink-0 px-4 py-2 text-[11px] font-bold font-mono uppercase tracking-[0.1em] border transition-colors ${
                  activeCat === cat.id
                    ? "bg-logo-red border-logo-red text-black"
                    : "bg-white border-gray-200 text-foreground hover:border-gray-300"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category sections ── */}
        <div className="px-6 pb-12 space-y-10">
          {filteredCategories.map((cat, catIdx) => {
            const isEven = catIdx % 2 === 0; // 0,2 = pink; 1,3 = lime
            const headerColor = isEven ? "text-foreground" : "text-logo-gold";
            const priceTagBg = isEven ? "bg-logo-red" : "bg-logo-gold";
            const numColor = isEven ? "text-logo-red" : "text-logo-gold";
            const isLast = catIdx === filteredCategories.length - 1;
            const itemCount = cat.items.length + (isLast ? 1 : 0); // +1 for promo card

            return (
              <section key={cat.id}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-logo-red shrink-0" />
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

                    const isUnavailable = !item.isAvailable;
                    const canAddToCart = item.isAvailable && !item.isDineInOnly;

                    return (
                      <div
                        key={item.id}
                        className={`group text-left w-full ${isUnavailable ? "opacity-60" : ""}`}
                      >
                        {/* Image */}
                        <div
                          className={`relative aspect-[4/3] overflow-hidden bg-surface-container ${canAddToCart ? "cursor-pointer" : "cursor-not-allowed"}`}
                          onClick={() => {
                            if (!canAddToCart) return;
                            setSelectedItem(item);
                            setSelectedVariant(item.variants[0]?.id || "");
                            setSelectedModifiers([]);
                            setSelectedExclusions([]);
                          }}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={name}
                              className={`w-full h-full object-cover ${item.isAvailable ? "group-hover:scale-105 transition-transform duration-700" : "grayscale"}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-container">
                              <Utensils className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          {isUnavailable && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <span className="bg-black/70 text-white text-[10px] font-bold font-mono uppercase tracking-[0.1em] px-3 py-1.5">
                                {isNl ? "Niet beschikbaar" : "Not available"}
                              </span>
                            </div>
                          )}
                          {item.isAvailable && item.isDineInOnly && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <span className="bg-brand-gold/90 text-black text-[10px] font-bold font-mono uppercase tracking-[0.1em] px-3 py-1.5">
                                {isNl ? "Alleen Dine-In" : "Dine-In only"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div
                          className={`pt-3 pb-1 ${canAddToCart ? "cursor-pointer" : "cursor-not-allowed"}`}
                          onClick={() => {
                            if (!canAddToCart) return;
                            setSelectedItem(item);
                            setSelectedVariant(item.variants[0]?.id || "");
                            setSelectedModifiers([]);
                            setSelectedExclusions([]);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <h3 className={`font-bold text-[14px] uppercase tracking-wide leading-tight ${isUnavailable ? "text-gray-400" : "text-foreground"}`}>
                              {name}
                            </h3>
                            {item.isSpicy && !isUnavailable && (
                              <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            )}
                          </div>
                          <p className={`text-[12px] mt-1 leading-relaxed line-clamp-2 ${isUnavailable ? "text-gray-400" : "text-gray-500"}`}>
                            {desc}
                          </p>

                          {/* Price + quick-add row */}
                          <div className="flex items-center justify-between mt-2">
                            <span className={`font-bold text-[14px] font-mono ${isUnavailable ? "text-gray-400" : "text-foreground"}`}>
                              {fmtPrice(displayPrice)}
                            </span>
                            {canAddToCart ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAdd(item);
                                }}
                                className="w-7 h-7 border border-logo-red text-logo-red flex items-center justify-center hover:bg-logo-red hover:text-black transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : item.isDineInOnly && item.isAvailable ? (
                              <span className="text-[10px] font-mono text-brand-gold uppercase tracking-wider">
                                {isNl ? "Alleen Dine-In" : "Dine-In only"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                                {isNl ? "Uitverkocht" : "Sold out"}
                              </span>
                            )}
                          </div>

                          {/* Tags + cart qty */}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {item.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] text-gray-400 uppercase tracking-wider font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            {inCartQty > 0 && (
                              <span className="text-[10px] font-mono text-logo-red font-bold">
                                {inCartQty}x in cart
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}


                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ═══════ DESKTOP CART SIDEBAR ═══════ */}
      {/* Desktop: always visible sidebar */}
      <div className="hidden lg:flex w-[340px] shrink-0 border-l border-gray-200 bg-surface flex-col">
        <div className="px-5 py-5 border-b border-gray-200">
          <h2 className="font-display text-[20px] uppercase tracking-tight text-foreground">
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
              <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-[13px] font-mono">
                {isNl ? "Je winkelwagen is leeg" : "Your cart is empty"}
              </p>
              <p className="text-gray-400 text-[11px] mt-1 font-mono">
                {isNl ? "Tap een gerecht om toe te voegen" : "Tap a dish to add it"}
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={`${item.menuItemId}-${item.variantId || "v"}-${(item.modifierIds || []).join(",")}-${(item.exclusionIds || []).join(",")}`} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decreaseItem(item.menuItemId)}
                    className="w-7 h-7 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-foreground hover:border-border-default transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-foreground font-bold text-[13px] w-5 text-center">{item.quantity}</span>
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
                        exclusionIds: item.exclusionIds,
                        exclusionNames: item.exclusionNames,
                      })
                    }
                    className="w-7 h-7 bg-logo-red flex items-center justify-center text-black hover:brightness-110 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-[13px] truncate">{item.name}</p>
                  {item.variantName && (
                    <p className="text-[10px] text-gray-500">{item.variantName}</p>
                  )}
                  {item.modifierNames && item.modifierNames.length > 0 && (
                    <p className="text-[10px] text-gray-500 truncate">
                      {item.modifierNames.join(", ")}
                    </p>
                  )}
                  {item.exclusionNames && item.exclusionNames.length > 0 && (
                    <p className="text-[10px] text-brand-gold truncate">
                      {item.exclusionNames.join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-gray-400 text-[13px] shrink-0 font-mono">
                  {fmtPrice(item.price * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="px-5 py-5 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-gray-400 uppercase tracking-wide">
                {isNl ? "Totaal" : "Total"}
              </span>
              <span className="text-foreground text-[26px] font-bold">{fmtPrice(cartTotal)}</span>
            </div>
            <Link
              href={`/${locale}/checkout`}
              className="block w-full py-4 bg-logo-red text-black font-bold text-center text-[13px] tracking-[0.08em] uppercase hover:brightness-110 transition-all"
            >
              {isNl ? "AFREKENEN" : "CHECKOUT"} &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ═══════ MOBILE CART FAB ═══════ */}
      {/* Mobile: floating cart button with badge */}
      <button
        onClick={() => setCartOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 flex items-center justify-center bg-logo-red transition-all shadow-lg"
        style={{ borderRadius: "50%" }}
      >
        <ShoppingCart className="w-6 h-6 text-black" />
        {cartCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-white text-black font-bold text-[11px]"
            style={{ borderRadius: "50%" }}
          >
            {cartCount}
          </span>
        )}
      </button>

      {/* ═══════ MOBILE CART DRAWER ═══════ */}

      {/* ═══════ MOBILE CART DRAWER ═══════ */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" onClick={() => setCartOpen(false)} />
          {/* Drawer */}
          <div className="relative bg-surface border-t border-gray-200 w-full max-h-[80vh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div
                className="w-10 h-1 bg-white/20"
                onClick={() => setCartOpen(false)}
                style={{ borderRadius: "4px" }}
              />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-[20px] uppercase tracking-tight text-foreground">
                  {isNl ? "Mijn bestelling" : "My Order"}
                </h2>
                <p className="font-mono text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {isNl ? "Lokaal afhalen" : "Take Out"} &middot; {locName}
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-[13px] font-mono">
                    {isNl ? "Je winkelwagen is leeg" : "Your cart is empty"}
                  </p>
                  <p className="text-gray-400 text-[11px] mt-1 font-mono">
                    {isNl ? "Tap een gerecht om toe te voegen" : "Tap a dish to add it"}
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={`${item.menuItemId}-${item.variantId || "v"}-${(item.modifierIds || []).join(",")}-${(item.exclusionIds || []).join(",")}`} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => decreaseItem(item.menuItemId)}
                        className="w-7 h-7 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-foreground hover:border-border-default transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-foreground font-bold text-[13px] w-5 text-center">{item.quantity}</span>
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
                            exclusionIds: item.exclusionIds,
                            exclusionNames: item.exclusionNames,
                          })
                        }
                        className="w-7 h-7 bg-logo-red flex items-center justify-center text-black hover:brightness-110 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-[13px] truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[10px] text-gray-500">{item.variantName}</p>
                      )}
                      {item.modifierNames && item.modifierNames.length > 0 && (
                        <p className="text-[10px] text-gray-500 truncate">
                          {item.modifierNames.join(", ")}
                        </p>
                      )}
                      {item.exclusionNames && item.exclusionNames.length > 0 && (
                        <p className="text-[10px] text-brand-gold truncate">
                          {item.exclusionNames.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-400 text-[13px] shrink-0 font-mono">
                      {fmtPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="px-5 py-5 border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-gray-400 uppercase tracking-wide">
                    {isNl ? "Totaal" : "Total"}
                  </span>
                  <span className="text-foreground text-[26px] font-bold">{fmtPrice(cartTotal)}</span>
                </div>
                <Link
                  href={`/${locale}/checkout`}
                  className="block w-full py-4 bg-logo-red text-black font-bold text-center text-[13px] tracking-[0.08em] uppercase hover:brightness-110 transition-all"
                  onClick={() => setCartOpen(false)}
                >
                  {isNl ? "AFREKENEN" : "CHECKOUT"} &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ ITEM MODAL ═══════ */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedItem(null)} />
          <div className="relative bg-surface-container border border-gray-200 w-full max-w-[440px] max-h-[90vh] overflow-y-auto">
            {/* Image */}
            <div className="h-52 w-full relative">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center text-gray-400">
                  <Utensils className="w-12 h-12" />
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/70 text-foreground flex items-center justify-center hover:bg-black/90 transition-colors border border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Title + price */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[20px] uppercase tracking-tight text-foreground leading-none">
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
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-logo-red/10 flex items-center justify-center">
                      <Utensils className="w-3.5 h-3.5 text-logo-red" />
                    </div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                      {isNl ? "Kies je optie" : "Choose an option"}
                    </label>
                    <div className="flex-1 h-px bg-border-default" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.variants.map((v) => {
                      const isSelected = selectedVariant === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v.id)}
                          className={`relative px-3 py-2.5 border rounded-lg text-[13px] font-medium transition-colors text-left ${
                            isSelected
                              ? "border-logo-red bg-logo-red/10 text-foreground"
                              : "border-gray-200 text-gray-500 hover:border-border-default"
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span>{isNl && v.nameNl ? v.nameNl : v.name}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-logo-red flex items-center justify-center shrink-0 ml-1">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </span>
                          {v.price > 0 && (
                            <span className="text-[11px] text-gray-400 block mt-0.5">+{fmtPrice(v.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {selectedItem.modifiers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-logo-red/10 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-logo-red" />
                    </div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                      {isNl ? "Extras" : "Add-ons"}
                    </label>
                    <div className="flex-1 h-px bg-border-default" />
                  </div>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((m) => {
                      const checked = selectedModifiers.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleModifier(m.id)}
                          className={`w-full flex items-center justify-between p-3 border text-left transition-colors ${
                            checked
                              ? "border-logo-red bg-logo-red/10"
                              : "border-gray-200 hover:border-border-default"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                                checked ? "bg-logo-red border-logo-red" : "border-gray-500"
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 text-black" />}
                            </div>
                            <span className="text-foreground text-[13px]">
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

              {selectedItem.exclusions.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-logo-gold/10 flex items-center justify-center">
                      <Utensils className="w-3.5 h-3.5 text-brand-gold" />
                    </div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.1em]">
                      {isNl ? "Maak je gerechtje" : "Customize your dish"}
                    </label>
                    <div className="flex-1 h-px bg-border-default" />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {isNl ? "Vink je voorkeur aan." : "Tick your preferences."}
                  </p>
                  <div className="space-y-2">
                    {selectedItem.exclusions.map((e) => {
                      const checked = selectedExclusions.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => toggleExclusion(e.id)}
                          className={`w-full flex items-center gap-3 p-3 border text-left transition-colors ${
                            checked
                              ? "border-brand-gold bg-logo-gold/10"
                              : "border-gray-200 hover:border-border-default"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                              checked ? "bg-brand-gold border-brand-gold" : "border-gray-500"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-foreground text-[13px]">
                            {isNl && e.nameNl ? e.nameNl : e.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add button */}
              <button
                onClick={() => handleAdd(selectedItem)}
                className="w-full py-4 bg-logo-red text-black font-bold text-[13px] tracking-[0.08em] uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2"
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