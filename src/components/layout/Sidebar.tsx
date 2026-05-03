// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const navLinks = [
  { href: "/", labelKey: "home" },
  { href: "/menu", labelKey: "menu" },
  { href: "/order", labelKey: "order" },
  { href: "/reserve", labelKey: "reserve" },
];

export default function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-sidebar flex flex-col border-r border-white/5 z-50">
      {/* Logo */}
      <div className="p-8 pb-4">
        <Link href={"/" + locale} className="block">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Xin Ch<span className="text-brand-gold">à</span>o
          </h1>
          <p className="mt-1 text-xs tracking-[0.2em] text-gray-400 uppercase">
            Vietnamese Restaurant
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-4">
        <ul className="space-y-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={"/" + locale + link.href}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-white/5 pt-6">
          <p className="px-4 text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
            Locations
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href={"/" + locale + "/location/utrecht"}
                className="block rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-brand-gold transition-colors"
              >
                Utrecht
              </Link>
            </li>
            <li>
              <Link
                href={"/" + locale + "/location/wageningen"}
                className="block rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-brand-gold transition-colors"
              >
                Wageningen
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-6 border-t border-white/5">
        <LocaleSwitcher />
        <p className="mt-4 text-[10px] text-gray-600 text-center">
          Made with love in NL
        </p>
      </div>
    </aside>
  );
}
