"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { createPath } from "@/i18n/routing";
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

export default function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = locale === "en" ? "nl" : "en";
  const currentPathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#252525] rounded-md border border-[#555]"
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
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#252525] border-r border-[#333]
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#333]">
          <Link href={createPath({ href: "/", locale })} className="block">
            <h1 className="text-xl font-bold text-[#d4a017] tracking-wider">
              XIN CHÀO
            </h1>
            <p className="text-xs text-gray-400 mt-1">Vietnamese Kitchen</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === createPath({ href: item.href, locale });
            return (
              <Link
                key={item.key}
                href={createPath({ href: item.href, locale })}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? "bg-[#c41e3a] text-white"
                    : "text-gray-300 hover:bg-[#333] hover:text-white"
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
        <div className="p-4 border-t border-[#333]">
          <Link
            href={createPath({
              href: currentPathWithoutLocale,
              locale: switchLocale,
            })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-[#333] hover:text-white transition-colors"
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
