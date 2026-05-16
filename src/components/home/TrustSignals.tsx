"use client";

import { useLocale } from "next-intl";
import { Star, Leaf, WheatOff } from "lucide-react";

export default function TrustSignals() {
  const locale = useLocale();
  const isNl = locale === "nl";

  const signals = [
    { icon: <Star className="w-3.5 h-3.5 text-logo-gold" />, label: isNl ? "4.6 Google" : "4.6 Google" },
    { icon: <Leaf className="w-3.5 h-3.5 text-success" />, label: isNl ? "Vers dagelijks" : "Fresh daily" },
    { icon: <WheatOff className="w-3.5 h-3.5 text-logo-gold" />, label: isNl ? "Vegetarisch" : "Vegetarian" },
  ];

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 py-3">
      {signals.map((s, i) => (
        <div key={i} className="flex items-center gap-1 text-[11px] sm:text-[12px] text-on-surface-variant">
          {s.icon}
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
