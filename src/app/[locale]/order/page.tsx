"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/components/CartContext";
import { MapPin, Clock, ShoppingBag } from "lucide-react";

interface Location {
  id: string;
  name: string;
  slug: string;
  address: string;
  openTime: string;
  closeTime: string;
}

interface PickupSlot {
  id: string;
  date: string;
  time: string;
  capacity: number;
  booked: number;
}

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export default function OrderPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { addItem, setIsOpen } = useCart();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"location" | "menu">("location");

  // Load locations on mount
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  // Load slots when location selected
  useEffect(() => {
    if (!selectedLocation) return;
    fetch(`/api/slots?locationId=${selectedLocation}&days=7`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data);
        setSelectedSlot("");
      });
  }, [selectedLocation]);

  // Load menu when location selected
  useEffect(() => {
    if (!selectedLocation) return;
    fetch(`/api/menu?locationId=${selectedLocation}`)
      .then((r) => r.json())
      .then(setCategories);
  }, [selectedLocation]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  if (loading) return <div className="text-gray-400">{t("common.loading")}</div>;

  if (step === "location") {
    return (
      <div className="space-y-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-white">{t("order.selectLocation")}</h1>
        <div className="grid gap-4">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setSelectedLocation(loc.id);
              }}
              className={`text-left p-6 rounded-xl border transition-colors ${
                selectedLocation === loc.id
                  ? "border-brand-gold bg-sidebar"
                  : "border-border-default hover:border-gray-500"
              }`}
            >
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-brand-red mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-white">{loc.name}</h3>
                  <p className="text-gray-400 text-sm">{loc.address}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {loc.openTime} – {loc.closeTime}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedLocation && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{t("order.selectPickupTime")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`p-3 rounded-lg border text-center text-sm transition-colors ${
                    selectedSlot === slot.id
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                      : "border-border-default text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium">{formatDate(slot.date)}</div>
                  <div className="text-gray-400">{slot.time}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedLocation && selectedSlot && (
          <button
            onClick={() => setStep("menu")}
            className="w-full py-3 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors"
          >
            {t("menu.categories")} →
          </button>
        )}
      </div>
    );
  }

  // Menu step
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">{t("nav.menu")}</h1>
        <button
          onClick={() => setStep("location")}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          ← {t("order.selectLocation")}
        </button>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-xl font-semibold text-brand-gold mb-4 flex items-center gap-2">
              {cat.name}
              <span className="h-px flex-1 bg-white/5" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between rounded-xl border border-white/5 bg-sidebar p-4 hover:border-brand-gold/30 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white group-hover:text-brand-gold transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    )}
                    <span className="text-sm font-semibold text-white mt-2 inline-block">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      addItem({
                        menuItemId: item.id,
                        name: item.name,
                        price: item.price,
                      });
                      setIsOpen(true);
                    }}
                    className="ml-3 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-brand-red transition-colors flex items-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {t("menu.addToCart")}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
