"use client";

import { Hero, LocationCard, TrustSignals, Footer } from "@/components/home";
import StickyActionBar from "@/components/home/StickyActionBar";
import { useSelectedLocation } from "@/lib/location-state";
import { useEffect } from "react";

interface LocationData {
  id: string;
  name: string;
  slug: string;
  district: string;
  description: string;
  address: string;
  phone: string;
  accent: {
    text: string;
    bg: string;
    border: string;
    soft: string;
    hover: string;
  };
  hours: Array<{ day: string; hours: string }>;
  mapsUrl: string;
  imageSrc: string;
}

interface Props {
  locationData: LocationData[];
  locale: string;
  isNl: boolean;
}

export default function LocationSelectorClient({ locationData, locale, isNl }: Props) {
  const validIds = locationData.map((l) => l.id);
  const { selectedId, selectLocation, hydrated } = useSelectedLocation(validIds);

  // Sync from sessionStorage (from order page) on mount
  useEffect(() => {
    if (!hydrated) return;
    try {
      const sessionLoc = sessionStorage.getItem("order_locationId");
      if (sessionLoc && validIds.includes(sessionLoc) && !selectedId) {
        selectLocation(sessionLoc);
      }
    } catch { /* ignore */ }
  }, [hydrated, selectedId, selectLocation, validIds]);

  const stickyLocations = locationData.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    phone: loc.phone,
    accentColor: loc.accent.bg === "bg-logo-red" ? "#E31B23" : "#8B6914",
    accentSoft: loc.accent.soft,
    accentText: loc.accent.text,
    accentBg: loc.accent.bg,
    accentBorder: loc.accent.border,
    accentHover: loc.accent.hover,
    openingHours: loc.hours,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <Hero />

      {/* Trust signals — right below hero */}
      <div className="bg-background border-b border-outline-variant">
        <TrustSignals />
      </div>

      {/* Location selector */}
      <section id="locations" className="px-4 sm:px-6 py-6 sm:py-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
              {isNl ? "Kies je locatie" : "Choose your location"}
            </h2>
            <p className="text-[13px] text-on-surface-variant">
              {isNl
                ? "Kies een locatie om te bestellen of te reserveren."
                : "Select a location to order or reserve a table."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {locationData.map((loc) => (
              <LocationCard
                key={loc.id}
                id={loc.id}
                name={loc.name}
                slug={loc.slug}
                district={loc.district}
                description={loc.description}
                address={loc.address}
                phone={loc.phone}
                accent={loc.accent}
                hours={loc.hours}
                mapsUrl={loc.mapsUrl}
                imageSrc={loc.imageSrc}
                isSelected={selectedId === loc.id}
                onSelect={() => selectLocation(loc.id)}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Mobile sticky action bar */}
      <StickyActionBar locations={stickyLocations} />
    </div>
  );
}
