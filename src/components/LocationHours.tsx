"use client";

import { useState } from "react";

interface HoursEntry {
  day: string;
  hours: string;
}

interface Props {
  hours: HoursEntry[];
  locale: string;
  accent: {
    text: string;
    bg: string;
    border: string;
    bar: string;
    hover: string;
    soft: string;
    pin: string;
  };
}

export default function LocationHours({ hours, locale, accent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isNl = locale === "nl";

  const dayNameMap: Record<string, string> = {
    monday: "maandag", tuesday: "dinsdag", wednesday: "woensdag",
    thursday: "donderdag", friday: "vrijdag", saturday: "zaterdag", sunday: "zondag",
  };

  const dayNamesNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const dayNamesEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const now = new Date();
  const amsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const todayNameNl = dayNamesNl[amsTime.getDay()];
  const todayNameEn = dayNamesEn[amsTime.getDay()];

  return (
    <div>
      {/* Mobile accordion header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="md:hidden flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground">
            {isNl ? "Openingstijden" : "Opening Hours"}
          </h4>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Desktop label */}
      <div className="hidden md:flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent.bar === "bg-logo-red" ? "#E31B23" : "#B99516"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground">
          {isNl ? "Openingstijden" : "Opening Hours"}
        </h4>
      </div>

      {/* Hours list */}
      <div className={`md:block ${expanded ? "block" : "hidden"}`}>
        <div className="space-y-1">
          {hours.map((h, idx) => {
            const isToday =
              h.day.toLowerCase().includes(todayNameNl) ||
              h.day.toLowerCase().includes(todayNameEn);
            return (
              <div
                key={idx}
                className={`flex justify-between items-center py-1.5 px-2 -mx-2 rounded-sm ${isToday ? `${accent.soft}` : ""}`}
              >
                <span className={`text-[12px] font-mono ${isToday ? `font-bold ${accent.text}` : "text-gray-500"}`}>
                  {isNl ? dayNameMap[h.day.toLowerCase()] || h.day : h.day}
                  {isToday && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold bg-logo-red text-white px-1 py-0.5">
                      {isNl ? "Vandaag" : "Today"}
                    </span>
                  )}
                </span>
                <span className={`text-[12px] font-mono font-medium ${isToday ? "text-foreground font-bold" : "text-foreground"}`}>
                  {h.hours}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
