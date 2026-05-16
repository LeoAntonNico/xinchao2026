"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { MapPin, ArrowRight } from "lucide-react";
import { useSelectedLocation } from "@/lib/location-state";
import { useCart } from "@/components/CartContext";
import { track } from "@/lib/analytics";
import { calculateStatus } from "@/lib/status";

interface LocationInfo {
  id: string;
  name: string;
  slug: string;
  phone: string;
  accentSoft: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentHover: string;
  openingHours: Array<{ day: string; hours: string }>;
}

interface Props {
  locations: LocationInfo[];
}

export default function StickyActionBar({ locations }: Props) {
  const locale = useLocale();
  const isNl = locale === "nl";
  const { selectedId, selectLocation, hydrated } = useSelectedLocation();
  const { items } = useCart();

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const selectedLoc = locations.find((l) => l.id === selectedId);

  const scrollToLocations = () => {
    const el = document.getElementById("locations");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!hydrated) return null;

  return (
    <>
      {/* Sticky action bar — compact height */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[200] bg-surface border-t border-outline-variant shadow-sticky">
        <div className="flex items-center gap-2 px-3 py-2 pb-safe max-w-lg mx-auto">
          {!selectedLoc ? (
            /* No location selected */
            <button
              onClick={scrollToLocations}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-logo-red text-white text-[12px] font-bold rounded-lg hover:bg-logo-red-hover transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              {isNl ? "Kies locatie" : "Choose location"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Location selected */
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedLoc.accentBg}`} />
                  <span className="text-[11px] font-semibold text-foreground truncate">{selectedLoc.name}</span>
                  <StickyStatusBadge hours={selectedLoc.openingHours} locale={locale} />
                </div>
                <div className="flex gap-1.5">
                  <StickyOrderBtn
                    loc={selectedLoc}
                    locale={locale}
                    isNl={isNl}
                    cartCount={cartCount}
                  />
                  <Link
                    href={`/${locale}/reserve`}
                    onClick={() => track({ event: "sticky_cta_clicked", path: "/reserve", locationId: selectedLoc.id, locale })}
                    className={`flex-1 flex items-center justify-center px-2 py-1.5 border ${selectedLoc.accentBorder} ${selectedLoc.accentText} text-[11px] font-bold rounded-md hover:${selectedLoc.accentSoft} transition-colors`}
                  >
                    {isNl ? "Reserveer" : "Reserve"}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function StickyStatusBadge({ hours, locale }: { hours: Array<{ day: string; hours: string }>; locale: string }) {
  const status = calculateStatus(hours, locale);
  return (
    <span className={`shrink-0 text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded ${
      status.isOpen ? "bg-success/10 text-success" : "bg-logo-red/10 text-logo-red"
    }`}>
      {status.statusLabel}
    </span>
  );
}

function StickyOrderBtn({ loc, locale, isNl, cartCount }: { loc: LocationInfo; locale: string; isNl: boolean; cartCount: number }) {
  const status = calculateStatus(loc.openingHours, locale);
  const label = (() => {
    if (status.isOpen) {
      if (status.minutesUntilClose !== undefined && status.minutesUntilClose <= 30) {
        return isNl ? "Nu bestellen" : "Order now";
      }
      return isNl ? "Bestel" : "Order";
    }
    if (status.nextDay === "tomorrow") {
      return isNl ? "Voorbestellen" : "Pre-order";
    }
    return isNl ? "Bestel" : "Order";
  })();

  return (
    <Link
      href={`/${locale}/order`}
      onClick={() => track({ event: "sticky_cta_clicked", path: "/order", locationId: loc.id, locale })}
      className={`relative flex-1 flex items-center justify-center gap-1 px-2 py-1.5 ${loc.accentBg} text-white text-[11px] font-bold rounded-md ${loc.accentHover} transition-colors`}
    >
      {cartCount > 0 && (
        <span className="shrink-0 min-w-[14px] h-3.5 px-1 bg-white text-logo-red text-[9px] font-bold rounded-full flex items-center justify-center">
          {cartCount}
        </span>
      )}
      {label}
    </Link>
  );
}
