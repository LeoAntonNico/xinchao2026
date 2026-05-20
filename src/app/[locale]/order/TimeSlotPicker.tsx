"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, ChevronDown, Moon } from "lucide-react";

interface Slot {
  id: string;
  date: string;
  time: string;
}

interface TimeSlotPickerProps {
  slots: Slot[];
  selectedSlot: string;
  onSelect: (slotId: string) => void;
  locale: string;
}

const dayNamesNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNamesNl = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function fmtDateParts(dateStr: string, locale: string) {
  const d = new Date(dateStr + "T00:00:00");
  const isNl = locale === "nl";
  return {
    dayName: isNl ? dayNamesNl[d.getDay()] : dayNamesEn[d.getDay()],
    dayNum: d.getDate(),
    month: isNl ? monthNamesNl[d.getMonth()] : d.toLocaleDateString("en-US", { month: "long" }),
    full: isNl
      ? `${dayNamesNl[d.getDay()]} ${d.getDate()} ${monthNamesNl[d.getMonth()]}`.toUpperCase()
      : `${dayNamesEn[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "long" })}`.toUpperCase(),
    isToday: isToday(d),
  };
}

function isToday(d: Date) {
  const today = new Date();
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
}

function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isSlotPast(dateStr: string, timeStr: string) {
  const now = new Date();
  const slotDate = new Date(dateStr + "T00:00:00");
  if (slotDate.getDate() !== now.getDate() ||
      slotDate.getMonth() !== now.getMonth() ||
      slotDate.getFullYear() !== now.getFullYear()) {
    return slotDate < now;
  }
  const slotMinutes = parseTime(timeStr);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

function groupSlots(slots: Slot[]) {
  const groups: Record<string, Slot[]> = {};
  for (const s of slots) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  for (const d in groups) {
    groups[d].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  }
  return groups;
}

export default function TimeSlotPicker({ slots, selectedSlot, onSelect, locale }: TimeSlotPickerProps) {
  const isNl = locale === "nl";
  const groups = useMemo(() => groupSlots(slots), [slots]);
  const dates = useMemo(() => Object.keys(groups).sort(), [groups]);
  const [expanded, setExpanded] = useState<string>(dates[0] || "");

  useEffect(() => {
    if (dates.length === 0) {
      setExpanded("");
      return;
    }

    setExpanded((current) => dates.includes(current) ? current : dates[0]);
  }, [dates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-logo-red/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-logo-red" />
        </div>
        <div>
          <h2 className="font-display text-[18px] md:text-[22px] uppercase text-foreground tracking-tight">
            {isNl ? "Kies een afhaaltijd" : "Pick a pickup time"}
          </h2>
          <p className="text-[12px] text-gray-400 font-mono">
            {isNl ? "Selecteer de dag en het tijdstip dat jou het beste uitkomt." : "Select the day and time that works best for you."}
          </p>
        </div>
      </div>

      {/* Selected slot indicator */}
      {selectedSlot && (
        <div className="bg-surface-container border border-white/8 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-logo-red flex items-center justify-center">
              <Calendar className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-logo-red text-[10px] font-bold font-mono uppercase tracking-[0.12em]">
                {isNl ? "Jouw Keuze" : "Your Choice"}
              </span>
              <p className="text-foreground text-[14px] font-bold">
                {(() => {
                  const s = slots.find(x => x.id === selectedSlot);
                  if (!s) return "";
                  const parts = fmtDateParts(s.date, locale);
                  return isNl
                    ? `${parts.dayName} ${parts.dayNum} ${parts.month} om ${s.time}`
                    : `${parts.dayName} ${parts.dayNum} ${parts.month} at ${s.time}`;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Days accordion */}
      <div className="space-y-2">
        {dates.map((date) => {
          const daySlots = groups[date];
          const parts = fmtDateParts(date, locale);
          const isExpanded = expanded === date;

          return (
            <div key={date} className="border border-white/8 rounded-lg overflow-hidden">
              {/* Day header */}
              <button
                onClick={() => setExpanded(isExpanded ? "" : date)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isExpanded ? "bg-surface-container" : "hover:bg-white/[0.02]"
                }`}
              >
                <Calendar className={`w-4 h-4 ${parts.isToday ? "text-logo-red" : "text-gray-500"}`} />
                <span className="font-bold text-[13px] text-foreground font-mono uppercase tracking-wide flex-1">
                  {parts.full}
                </span>
                {parts.isToday && (
                  <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] font-bold font-mono uppercase rounded-full border border-green-500/20">
                    {isNl ? "Vandaag" : "Today"}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Time slots */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <TimeGroup
                    label={isNl ? "Middag" : "Afternoon"}
                    icon="sun"
                    date={date}
                    slots={daySlots.filter(s => {
                      const h = parseInt(s.time.split(":")[0]);
                      return h >= 12 && h < 17;
                    })}
                    selectedSlot={selectedSlot}
                    onSelect={onSelect}
                  />
                  <TimeGroup
                    label={isNl ? "Avond" : "Evening"}
                    icon="moon"
                    date={date}
                    slots={daySlots.filter(s => {
                      const h = parseInt(s.time.split(":")[0]);
                      return h >= 17;
                    })}
                    selectedSlot={selectedSlot}
                    onSelect={onSelect}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGroup({
  label, icon, date, slots, selectedSlot, onSelect
}: {
  label: string;
  icon: string;
  date: string;
  slots: Slot[];
  selectedSlot: string;
  onSelect: (id: string) => void;
}) {
  if (slots.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon === "sun" ? (
          <div className="w-4 h-4 rounded-full bg-brand-gold/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-brand-gold" />
          </div>
        ) : (
          <Moon className="w-4 h-4 text-logo-red" />
        )}
        <span className="text-[11px] text-gray-500 font-mono uppercase tracking-[0.1em]">{label}</span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.id;
          const isPast = isSlotPast(date, slot.time);
          return (
            <button
              key={slot.id}
              onClick={() => !isPast && onSelect(slot.id)}
              disabled={isPast}
              className={`py-2 px-1 text-center text-[13px] font-mono font-bold rounded transition-all border ${
                isPast
                  ? "bg-surface text-foreground/20 border-gray-100 cursor-not-allowed"
                  : isSelected
                  ? "bg-logo-red text-black border-logo-red"
                  : "bg-surface text-foreground/80 border-white/8 hover:border-gray-200 hover:bg-white/[0.03]"
              }`}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
