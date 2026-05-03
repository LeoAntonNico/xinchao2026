"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Home,
  UtensilsCrossed,
  ShoppingBag,
  CalendarCheck,
  Phone,
  Globe,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { key: "home", icon: Home, href: "/" },
  { key: "menu", icon: UtensilsCrossed, href: "/menu" },
  { key: "order", icon: ShoppingBag, href: "/order" },
  { key: "reserve", icon: CalendarCheck, href: "/reserve" },
  { key: "contact", icon: Phone, href: "/contact" },
];

function getHref(locale: string, path: string) {
  return `/${locale}${path}`;
}

export default function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = locale === "en" ? "nl" : "en";
  const currentPath = pathname.replace(`/${locale}`, "");

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-md border border-ghost-border"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <div className="space-y-1">
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
        </div>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-border-default
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border-default">
          <Link href={getHref(locale, "/")} className="block">
            <h1 className="text-xl font-bold text-brand-gold tracking-wider">
              XIN CHÀO
            </h1>
            <p className="text-xs text-gray-400 mt-1">Vietnamese Kitchen</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = getHref(locale, item.href);
            const isActive = pathname === href;
            return (
              <Link
                key={item.key}
                href={href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? "bg-brand-red text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Locale switcher */}
        <div className="p-4 border-t border-border-default">
          <Link
            href={getHref(switchLocale, currentPath)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm font-medium">
              {locale === "en" ? "Nederlands" : "English"}
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
