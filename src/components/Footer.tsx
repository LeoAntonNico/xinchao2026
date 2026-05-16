"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

export default function Footer() {
  const locale = useLocale();
  const isNl = locale === "nl";

  return (
    <footer className="border-t border-border-default bg-surface">
      <div className="px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <h3 className="text-[18px] font-bold text-foreground mb-2">Xin Chào</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              {isNl
                ? "Authentieke Vietnamese streetfood in Utrecht en Wageningen. Vers, snel en vol smaak."
                : "Authentic Vietnamese street food in Utrecht and Wageningen. Fresh, fast, and full of flavor."}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground mb-4">
              {isNl ? "Snelle links" : "Quick links"}
            </h4>
            <ul className="space-y-2">
              {[
                { label: isNl ? "Bestellen" : "Order", href: `/${locale}/order` },
                { label: isNl ? "Reserveren" : "Reserve", href: `/${locale}/reserve` },
                { label: isNl ? "Contact" : "Contact", href: `/${locale}/contact` },
                { label: isNl ? "Mijn account" : "My account", href: `/${locale}/my-account` },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-gray-500 hover:text-logo-red transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + contact */}
          <div>
            <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground mb-4">
              {isNl ? "Informatie" : "Info"}
            </h4>
            <ul className="space-y-2 text-[13px] text-gray-500">
              <li>BTW: NL861234567B01</li>
              <li>KVK: 12345678</li>
              <li className="pt-2">
                <a href="mailto:info@xinchao.nl" className="hover:text-logo-red transition-colors">
                  info@xinchao.nl
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border-default flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-gray-400 font-mono">
            © {new Date().getFullYear()} Xin Chào Vietnamese Street Food. {isNl ? "Alle rechten voorbehouden." : "All rights reserved."}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-gray-400 font-mono">
            <Link href={`/${locale}/contact`} className="hover:text-gray-600 transition-colors">
              {isNl ? "Privacybeleid" : "Privacy"}
            </Link>
            <span>·</span>
            <Link href={`/${locale}/contact`} className="hover:text-gray-600 transition-colors">
              {isNl ? "Allergenen" : "Allergens"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
