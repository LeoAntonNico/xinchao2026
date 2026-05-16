"use client";
import { MapPin, Calendar, Clock, Store } from "lucide-react";

interface OrderSummaryProps {
  locationName: string;
  date: string;
  time: string;
  locale: string;
  onChange: () => void;
}

export default function OrderSummary({ locationName, date, time, locale, onChange }: OrderSummaryProps) {
  const isNl = locale === "nl";

  return (
    <div className="border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-1 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center bg-logo-red text-white shrink-0">
                <Store className="w-4 h-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[10px] text-logo-red font-mono uppercase tracking-[0.12em] font-bold">
                  {isNl ? "Jouw keuze" : "Your choice"}
                </p>
                <p className="text-[14px] text-gray-900 font-medium leading-tight">
                  {locationName}
                </p>
              </div>
            </div>

            {date && (
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4 text-gray-400" strokeWidth={2} />
                <span className="text-[13px]">{date}</span>
              </div>
            )}

            {time && (
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="w-4 h-4 text-gray-400" strokeWidth={2} />
                <span className="text-[13px]">{time}</span>
              </div>
            )}
          </div>

          <button
            onClick={onChange}
            className="shrink-0 px-4 py-2 border border-logo-red text-logo-red text-[11px] font-bold font-mono uppercase tracking-[0.1em] hover:bg-logo-red hover:text-white transition-colors"
          >
            {isNl ? "Wijzigen" : "Change"}
          </button>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] text-gray-400 border border-gray-300 font-mono">
          i
        </span>
        <p className="text-[11px] text-gray-400">
          {isNl
            ? "Controleer je keuze hierboven. Zo voorkomen we fouten bij het klaarmaken van je bestelling."
            : "Please double-check your choice above. This helps us prepare your order accurately."}
        </p>
      </div>
    </div>
  );
}
