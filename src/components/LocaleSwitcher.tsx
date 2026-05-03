// src/components/LocaleSwitcher.tsx
"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const currentLocale = params.locale as string;

  function getPathForLocale(locale: string) {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-ghost-border px-2 py-1">
      {routing.locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <Link
            key={locale}
            href={getPathForLocale(locale)}
            className={
              `rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ` +
              (isActive
                ? "bg-brand-red text-white"
                : "text-gray-400 hover:text-white")
            }
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
