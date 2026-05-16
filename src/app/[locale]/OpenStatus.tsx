"use client";

interface OpenStatusProps {
  isOpen: boolean;
  nextChange: string;
  locale: string;
  accentClass: string;
}

export function OpenStatus({ isOpen, nextChange, locale, accentClass }: OpenStatusProps) {
  const isNl = locale === "nl";

  return (
    <div className="mt-4 flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"
        }`}
      />
      <span className={`text-[13px] font-mono font-bold ${isOpen ? "text-green-600" : "text-red-500"}`}>
        {isOpen ? (isNl ? "Open" : "Open") : (isNl ? "Gesloten" : "Closed")}
      </span>
      {nextChange && (
        <span className="text-[11px] text-gray-400 font-mono ml-1">
          {isOpen
            ? ` · ${isNl ? "tot" : "until"} ${nextChange}`
            : ` · ${isNl ? "gaat vandaag open om" : "opens today at"} ${nextChange}`}
        </span>
      )}
    </div>
  );
}
