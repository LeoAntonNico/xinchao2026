"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { track } from "@/lib/analytics";

export default function Footer() {
  const locale = useLocale();
  const isNl = locale === "nl";

  const links = [
    { label: isNl ? "Bestellen" : "Order", href: `/${locale}/order` },
    { label: isNl ? "Reserveren" : "Reserve", href: `/${locale}/reserve` },
    { label: isNl ? "Contact" : "Contact", href: `/${locale}/contact` },
    { label: isNl ? "Account" : "Account", href: `/${locale}/my-account` },
  ];

  return (
    <footer className="border-t border-outline-variant bg-surface pb-24 lg:pb-8">
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Xin Chào</h3>
            <p className="text-[12px] text-on-surface-variant">
              {isNl ? "Vietnamese street food in Utrecht & Wageningen." : "Vietnamese street food in Utrecht & Wageningen."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            {links.map((link, i) => (
              <span key={link.href} className="flex items-center gap-3">
                <Link
                  href={link.href}
                  onClick={() => track({ event: "footer_link_clicked", label: link.label, locale })}
                  className="text-on-surface-variant hover:text-logo-red transition-colors"
                >
                  {link.label}
                </Link>
                {i < links.length - 1 && <span className="text-outline">·</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <Link href={`/${locale}/contact`} className="hover:text-foreground transition-colors">
              {isNl ? "Privacy" : "Privacy"}
            </Link>
            <span>·</span>
            <Link href={`/${locale}/contact`} className="hover:text-foreground transition-colors">
              {isNl ? "Voorwaarden" : "Terms"}
            </Link>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-on-surface-variant/70 font-mono">
          © {new Date().getFullYear()} Xin Chào Vietnamese Street Food. {isNl ? "Alle rechten voorbehouden." : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
