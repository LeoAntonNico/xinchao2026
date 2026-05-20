"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { MapPin, Phone, Navigation, Clock, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { calculateStatus } from "@/lib/status";
import { track } from "@/lib/analytics";

interface Props {
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
  isSelected: boolean;
  onSelect: () => void;
  imageSrc: string;
  locale: string;
}

export default function LocationCard({
  id, name, slug, district, description, address, phone,
  accent, hours, mapsUrl, isSelected, onSelect, imageSrc, locale,
}: Props) {
  const isNl = locale === "nl";
  const [hoursOpen, setHoursOpen] = useState(false);
  const status = calculateStatus(hours, locale);

  const dayNamesNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const dayNamesEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date();
  const amsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const todayNameNl = dayNamesNl[amsTime.getDay()];
  const todayNameEn = dayNamesEn[amsTime.getDay()];

  // Determine CTA label based on status
  const orderLabel = (() => {
    if (status.isOpen) {
      if (status.minutesUntilClose !== undefined && status.minutesUntilClose <= 30) {
        return isNl ? "Nu bestellen" : "Order now";
      }
      return isNl ? "Bestel" : "Order";
    }
    // Closed — allow pre-order for tomorrow
    if (status.nextDay === "tomorrow") {
      return isNl ? "Voorbestellen" : "Pre-order";
    }
    return isNl ? "Bestel" : "Order";
  })();

  const dayNameMap: Record<string, string> = {
    monday: "maandag", tuesday: "dinsdag", wednesday: "woensdag",
    thursday: "donderdag", friday: "vrijdag", saturday: "zaterdag", sunday: "zondag",
  };

  return (
    <div
      className={`relative bg-surface rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
        isSelected
          ? `${accent.border} shadow-md`
          : "border-transparent hover:border-outline shadow-sm"
      }`}
      onClick={onSelect}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${name} ${district}`}
    >
      {/* Compact image */}
      <div className="relative h-28 sm:h-32 overflow-hidden">
        <Image
          src={imageSrc}
          alt={`${name} exterior`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
            status.isOpen
              ? status.minutesUntilClose !== undefined && status.minutesUntilClose <= 30
                ? "bg-warning text-white"
                : "bg-success text-white"
              : "bg-logo-red text-white"
          }`}>
            {status.statusLabel}
          </span>
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-mono text-gray-700">
            <Clock className="w-2.5 h-2.5" />
            {status.isOpen
              ? (isNl ? `Tot ${status.nextChange}` : `Until ${status.nextChange}`)
              : status.nextDay === "tomorrow"
                ? (isNl ? `Morgen ${status.nextChange}` : `Tomorrow ${status.nextChange}`)
                : (isNl ? `Vandaag ${status.nextChange}` : `Today ${status.nextChange}`)}
          </span>
        </div>

      </div>

      {/* Content — compact padding */}
      <div className="p-3 sm:p-4">
        <h3 className="text-lg font-bold text-foreground mb-0.5">{name.replace(/^Xin Chao\s+/i, "")}</h3>
        <p className="text-[12px] text-on-surface-variant mb-2 leading-snug">{description}</p>

        <div className="flex items-start gap-1.5 mb-3">
          <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${accent.text}`} />
          <p className="text-[12px] text-on-surface-variant leading-snug">{address}</p>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link
            href={`/${locale}/order`}
            onClick={(e) => { e.stopPropagation(); track({ event: "order_clicked", locationId: id, locationName: name, locale }); }}
            className={`flex items-center justify-center gap-1 px-2 py-2 ${accent.bg} text-white text-[12px] font-bold rounded-lg ${accent.hover} transition-colors`}
          >
            {orderLabel}
          </Link>
          <Link
            href={`/${locale}/reserve`}
            onClick={(e) => { e.stopPropagation(); track({ event: "reserve_clicked", locationId: id, locationName: name, locale }); }}
            className={`flex items-center justify-center gap-1 px-2 py-2 border-2 ${accent.border} ${accent.text} text-[12px] font-bold rounded-lg hover:${accent.soft} transition-colors`}
          >
            {isNl ? "Reserveer" : "Reserve"}
          </Link>
        </div>

        {/* Secondary actions — compact inline links */}
        <div className="flex items-center gap-3 px-1 mb-2">
          <a
            href={`tel:${phone}`}
            onClick={(e) => { e.stopPropagation(); track({ event: "call_clicked", locationId: id, locationName: name, locale }); }}
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${accent.text} hover:opacity-70 transition-opacity`}
          >
            <Phone className="w-3 h-3" />
            {isNl ? "Bel" : "Call"}
          </a>
          <span className="text-outline-variant">·</span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); track({ event: "directions_clicked", locationId: id, locationName: name, locale }); }}
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${accent.text} hover:opacity-70 transition-opacity`}
          >
            <Navigation className="w-3 h-3" />
            {isNl ? "Route" : "Directions"}
          </a>
          <span className="text-outline-variant">·</span>
          <button
            onClick={(e) => { e.stopPropagation(); setHoursOpen(!hoursOpen); }}
            aria-expanded={hoursOpen}
            aria-controls={`hours-${id}`}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-on-surface-variant hover:text-foreground transition-colors"
          >
            {isNl ? "Openingstijden" : "Hours"}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${hoursOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Opening hours accordion */}
        {hoursOpen && (
          <div id={`hours-${id}`} className="mt-1 space-y-0.5 border-t border-outline-variant pt-2">
            {hours.map((h, idx) => {
              const isToday =
                h.day.toLowerCase().includes(todayNameNl) ||
                h.day.toLowerCase().includes(todayNameEn);
              return (
                <div
                  key={idx}
                  className={`flex justify-between items-center py-1 px-1.5 rounded ${isToday ? accent.soft : ""}`}
                >
                  <span className={`text-[11px] font-mono ${isToday ? `font-bold ${accent.text}` : "text-on-surface-variant"}`}>
                    {isNl ? dayNameMap[h.day.toLowerCase()] || h.day : h.day}
                    {isToday && (
                      <span className="ml-1 text-[8px] uppercase tracking-wider font-bold bg-logo-red text-white px-1 py-0.5 rounded">
                        {isNl ? "Vandaag" : "Today"}
                      </span>
                    )}
                  </span>
                  <span className={`text-[11px] font-mono ${isToday ? "font-bold text-foreground" : "text-foreground"}`}>
                    {h.hours}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
