"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import { MapPin, Clock, ShoppingBag, Soup, Wheat, Flame, Salad, Coffee, ArrowLeft, Plus, Minus, ShoppingCart, Check } from "lucide-react";

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

interface Variant { id: string; name: string; price: number; }
interface Modifier { id: string; name: string; price: number; }

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  dietaryTags: string[];
  isSpicy: boolean;
  variants: Variant[];
  modifiers: Modifier[];
}

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  pho: <Soup className="w-8 h-8" />,
  bun: <Wheat className="w-8 h-8" />,
  com: <Flame className="w-8 h-8" />,
  goi: <Salad className="w-8 h-8" />,
  drinks: <Coffee className="w-8 h-8" />,
};

const DIETARY_EMOJI: Record<string, string> = {
  vegan: "🌱", vegetarian: "🥗", "gluten-free": "🌾", "dairy-free": "🥛", "nut-free": "🥜",
};

function formatPrice(cents: number) {
  return `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function OrderPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { addItem, decreaseItem, items, setIsOpen } = useCart();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"location" | "menu">("location");

  // Per-item selection state
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/locations").then((r) => r.json()).then((data) => { setLocations(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    fetch(`/api/slots?locationId=${selectedLocation}&days=7`).then((r) => r.json()).then(setSlots);
    fetch(`/api/menu?locationId=${selectedLocation}`).then((r) => r.json()).then(setCategories);
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation) sessionStorage.setItem("order_locationId", selectedLocation);
  }, [selectedLocation]);
  useEffect(() => {
    if (selectedSlot) { sessionStorage.setItem("order_slotId", selectedSlot); setStep("menu"); }
  }, [selectedSlot]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", { weekday: "short", day: "numeric", month: "short" });
  };

  const cartTotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const cartCount = items.reduce((s, it) => s + it.quantity, 0);

  const activeCategory = activeCat ? categories.find(c => c.id === activeCat) : null;

  function getItemPrice(item: MenuItem) {
    const vId = selectedVariant[item.id];
    const base = item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
    if (!vId) return base;
    const variant = item.variants.find((v) => v.id === vId);
    if (variant && variant.price > 0) return variant.price;
    return base;
  }

  function getModifierTotal(item: MenuItem) {
    const mIds = selectedModifiers[item.id] || [];
    return item.modifiers.filter((m) => mIds.includes(m.id)).reduce((s, m) => s + m.price, 0);
  }

  function handleAdd(item: MenuItem) {
    const unitPrice = getItemPrice(item) + getModifierTotal(item);
    const mIds = selectedModifiers[item.id] || [];
    const modifierNames = item.modifiers.filter((m) => mIds.includes(m.id)).map((m) => m.name);
    const vId = selectedVariant[item.id];
    const vName = vId ? item.variants.find((v) => v.id === vId)?.name : undefined;
    addItem({ menuItemId: item.id, name: item.name, price: unitPrice, variantId: vId, variantName: vName, modifierIds: mIds, modifierNames });
  }

  function toggleModifier(itemId: string, modId: string) {
    setSelectedModifiers((prev) => {
      const current = prev[itemId] || [];
      if (current.includes(modId)) return { ...prev, [itemId]: current.filter((id) => id !== modId) };
      return { ...prev, [itemId]: [...current, modId] };
    });
  }

  if (loading) return <div className="text-gray-400 p-6">{t("common.loading")}</div>;

  if (step === "location") {
    return (
      <div className="space-y-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white">{t("order.selectLocation")}</h1>
        <div className="grid gap-4">
          {locations.map((loc) => (
            <button key={loc.id} onClick={() => setSelectedLocation(loc.id)} className={`text-left p-6 rounded-xl border transition-colors ${selectedLocation === loc.id ? "border-brand-gold bg-sidebar" : "border-border-default hover:border-gray-500"}`}>
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-brand-red mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-white">{loc.name}</h3>
                  <p className="text-gray-400 text-sm">{loc.address}</p>
                  <p className="text-gray-500 text-sm mt-1">{loc.openTime} – {loc.closeTime}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {selectedLocation && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-brand-gold" />{t("order.selectPickupTime")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button key={slot.id} onClick={() => setSelectedSlot(slot.id)} className={`p-3 rounded-lg border text-center text-sm transition-colors ${selectedSlot === slot.id ? "border-brand-gold bg-brand-gold/10 text-brand-gold" : "border-border-default text-gray-300 hover:border-gray-500"}`}>
                  <div className="font-medium">{formatDate(slot.date)}</div>
                  <div className="text-gray-400">{slot.time}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activeCat) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep("location")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> {t("order.selectLocation")}</button>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Browse the menu</h1>
          <p className="text-gray-400 text-sm">Pick a category to see what we have</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const cover = cat.items[0]?.imageUrl ?? null;
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} className="group relative rounded-2xl border border-border-default overflow-hidden hover:border-brand-gold/50 transition-all text-left active:scale-[0.98]">
                <div className="h-36 sm:h-40 w-full relative">
                  {cover ? (
                    <img src={cover} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-background flex items-center justify-center text-brand-gold/30">{categoryIcons[cat.slug] || <ShoppingBag className="w-12 h-12" />}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="font-bold text-white text-lg">{cat.name}</span>
                    <span className="block text-xs text-gray-300 mt-0.5">{cat.items.length} {cat.items.length === 1 ? "item" : "items"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveCat(null)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        <h1 className="text-xl font-bold text-white">{activeCategory?.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeCategory?.items.map((item) => {
          const inCart = items.find((i) => i.menuItemId === item.id);
          return (
            <div key={item.id} className="rounded-xl border border-border-default bg-sidebar overflow-hidden flex flex-col">
              {item.imageUrl ? (
                <div className="h-40 w-full relative"><img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="h-40 w-full bg-background flex items-center justify-center text-gray-600"><ShoppingBag className="w-10 h-10" /></div>
              )}
              <div className="px-4 pt-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-white">{item.name}</h3>
                      {item.isSpicy && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                    </div>
                    {item.shortDescription ? <p className="text-sm text-gray-400 mt-1">{item.shortDescription}</p> : item.description ? <p className="text-sm text-gray-400 mt-1">{item.description}</p> : null}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    {item.salePrice && item.salePrice < item.price ? (
                      <>
                        <span className="text-brand-gold font-bold">{formatPrice(item.salePrice)}</span>
                        <span className="block text-xs text-gray-500 line-through">{formatPrice(item.price)}</span>
                      </>
                    ) : (
                      <span className="text-brand-gold font-bold">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </div>

                {item.dietaryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.dietaryTags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{DIETARY_EMOJI[tag] || ""} {tag}</span>
                    ))}
                  </div>
                )}

                {/* Variants */}
                {item.variants.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <label className="text-[11px] text-gray-500 font-medium">Size / Portion</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedVariant((prev) => ({ ...prev, [item.id]: "" }))} className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${!(selectedVariant[item.id]) ? "border-brand-gold bg-brand-gold/15 text-white" : "border-border-default text-gray-300 hover:border-gray-500"}`}>Regular</button>
                      {item.variants.map((v) => (
                        <button key={v.id} type="button" onClick={() => setSelectedVariant((prev) => ({ ...prev, [item.id]: v.id }))} className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${(selectedVariant[item.id] === v.id) ? "border-brand-gold bg-brand-gold/15 text-white" : "border-border-default text-gray-300 hover:border-gray-500"}`}>
                          {v.name} {v.price > 0 ? `(${formatPrice(v.price)})` : "(base)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modifiers */}
                {item.modifiers.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <label className="text-[11px] text-gray-500 font-medium">Add-ons / Options</label>
                    <div className="flex flex-wrap gap-2">
                      {item.modifiers.map((m) => {
                        const checked = (selectedModifiers[item.id] || []).includes(m.id);
                        return (
                          <button key={m.id} type="button" onClick={() => toggleModifier(item.id, m.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "border-brand-gold bg-brand-gold/15 text-white" : "border-border-default text-gray-300 hover:border-gray-500"}`}>
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? "bg-brand-gold border-brand-gold" : "border-gray-500"}`}>{checked && <Check className="w-2.5 h-2.5 text-white" />}</span>
                            {m.name} {m.price > 0 ? `(+${formatPrice(m.price)})` : "(free)"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add button */}
                <div className="mt-4 pb-4">
                  {!inCart ? (
                    <button onClick={() => handleAdd(item)} className="w-full py-2.5 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add to order</button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => decreaseItem(item.id)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border-default text-white hover:border-brand-gold"><Minus className="w-4 h-4" /></button>
                      <span className="text-white font-bold w-6 text-center">{inCart.quantity}</span>
                      <button onClick={() => handleAdd(item)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-red text-white hover:bg-[#a01830]"><Plus className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-sidebar/95 border-t border-border-default backdrop-blur z-40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-brand-gold" />
            <span className="text-white font-bold">{cartCount} items</span>
            <span className="text-brand-gold font-bold">{formatPrice(cartTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsOpen(true)} className="px-4 py-2.5 text-sm text-white border border-border-default rounded-lg hover:border-gray-400 transition-colors">View Cart</button>
            <Link href={`/${locale}/checkout`} className="px-6 py-2.5 bg-brand-red text-white rounded-lg text-sm font-bold hover:bg-[#a01830] transition-colors">Checkout &rarr;</Link>
          </div>
        </div>
      )}
    </div>
  );
}
