"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, ShoppingBag, Soup, Wheat, Flame, Salad, Coffee, ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";

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

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: string;
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

  useEffect(() => {
    fetch("/api/locations").then((r) => r.json()).then((data) => {
      setLocations(data);
      setLoading(false);
    });
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
    if (selectedSlot) {
      sessionStorage.setItem("order_slotId", selectedSlot);
      setStep("menu");
    }
  }, [selectedSlot]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", { weekday: "short", day: "numeric", month: "short" });
  };

  const formatPrice = (cents: number) => `E$ {(cents / 100).toFixed(2).replace(".", ",")}`;

  const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const activeCategory = activeCat ? categories.find(c => c.id === activeCat) : null;

  if (loading) return <div className="text-gray-400 p-6">{t("common.loading")}</div>;

  // Step 1: Location + Time
  if (step === "location") {
    return (
      <div className="space-y-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white">{t("order.selectLocation")}</h1>
        <div className="grid gap-4">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`text-left p-6 rounded-xl border transition-colors ${
                selectedLocation === loc.id ? "border-brand-gold bg-sidebar" : "border-border-default hover:border-gray-500"
              }`}
            >
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
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-gold" />
              {t("order.selectPickupTime")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`p-3 rounded-lg border text-center text-sm transition-colors ${
                    selectedSlot === slot.id ? "border-brand-gold bg-brand-gold/10 text-brand-gold" : "border-border-default text-gray-300 hover:border-gray-500"
                  }`}
                >
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

  // Step 2: Menu — category tiles (BK kiosk style)
  if (!activeCat) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep("location")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> {t("order.selectLocation")}
          </button>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Browse the menu</h1>
          <p className="text-gray-400 text-sm">Pick a category to see what we have</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className="group rounded-2xl border border-border-default bg-sidebar hover:border-brand-gold/50 transition-all p-6 flex flex-col items-center gap-3 text-center active:scale-95"
            >
              <div className="w-14 h-14 rounded-xl bg-background border border-border-default group-hover:border-brand-gold/30 flex items-center justify-center text-brand-gold">
                {categoryIcons[cat.slug] || <ShoppingBag className="w-8 h-8" />}
              </div>
              <span className="font-semibold text-white">{cat.name}</span>
              <span className="text-xs text-gray-500">{cat.items.length} items</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: Category items with photos
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveCat(null)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-white">{activeCategory?.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeCategory?.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border-default bg-sidebar overflow-hidden flex flex-col">
            {item.imageUrl ? (
              <div className="h-40 w-full relative">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
              </div>
            ) : (
              <div className="h-40 w-full bg-background flex items-center justify-center text-gray-600">
                <ShoppingBag className="w-10 h-10" />
              </div>
            )}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  {item.description && <p className="text-sm text-gray-400 mt-1">{item.description}</p>}
                </div>
                <span className="text-brand-gold font-bold whitespace-nowrap">{formatPrice(item.price)}</span>
              </div>

              {/* Quantity controls */}
              {(() => {
                const inCart = items.find((i) => i.menuItemId === item.id);
                if (!inCart) {
                  return (
                    <button
                      onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}
                      className="mt-4 w-full py-2.5 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add to order
                    </button>
                  );
                }
                return (
                  <div className="mt-4 flex items-center gap-3">
                      <button
                      onClick={() => decreaseItem(item.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border-default text-white hover:border-brand-gold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold w-6 text-center">{inCart.quantity}</span>
                    <button
                      onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-red text-white hover:bg-[#a01830]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky cart bottom bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-sidebar/95 border-t border-border-default backdrop-blur z-40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-brand-gold" />
            <span className="text-white font-bold">{cartCount} items</span>
            <span className="text-brand-gold font-bold">{formatPrice(cartTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsOpen(true)} className="px-4 py-2.5 text-sm text-white border border-border-default rounded-lg hover:border-gray-400 transition-colors">
              View Cart
            </button>
            <Link href={`/${locale}/checkout`} className="px-6 py-2.5 bg-brand-red text-white rounded-lg text-sm font-bold hover:bg-[#a01830] transition-colors">
              Checkout →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
