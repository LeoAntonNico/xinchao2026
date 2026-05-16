"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

export default function MobileStickyCTA() {
  const locale = useLocale();
  const isNl = locale === "nl";

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg">
      <Link
        href={`/${locale}/order`}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-logo-red text-white text-[12px] font-bold font-mono uppercase tracking-wider hover:bg-logo-red-hover transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8L4.8 12.8A4 4 0 0 0 8.8 18h6.4a4 4 0 0 0 4-5.2L18 8" />
          <path d="M6 8h12" />
        </svg>
        {isNl ? "Bestel" : "Order"}
      </Link>
      <Link
        href={`/${locale}/reserve`}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-logo-red text-logo-red text-[12px] font-bold font-mono uppercase tracking-wider hover:bg-logo-red-soft transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {isNl ? "Reserveer" : "Reserve"}
      </Link>
    </div>
  );
}
