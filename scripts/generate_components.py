import os

components_dir = "/Users/openmac/restaurant/src/components/layout"
os.makedirs(components_dir, exist_ok=True)
os.makedirs("/Users/openmac/restaurant/src/components", exist_ok=True)

# LocaleSwitcher component
locale_switcher = """// src/components/LocaleSwitcher.tsx
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
            className={\`
              rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors
              \${isActive
                ? "bg-brand-red text-white"
                : "text-gray-400 hover:text-white"}
            \`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
"""

with open("/Users/openmac/restaurant/src/components/LocaleSwitcher.tsx", "w") as f:
    f.write(locale_switcher)

# Sidebar component
sidebar = """// src/components/layout/Sidebar.tsx
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
        <Link href={chr(47) + locale} className="block">
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
                href={chr(47) + locale + link.href}
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
                href={chr(47) + locale + "/location/utrecht"}
                className="block rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-brand-gold transition-colors"
              >
                Utrecht
              </Link>
            </li>
            <li>
              <Link
                href={chr(47) + locale + "/location/wageningen"}
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
""" .replace("chr(47)", "\"/\"")

with open(os.path.join(components_dir, "Sidebar.tsx"), "w") as f:
    f.write(sidebar)

# Homepage
homepage = """// src/app/[locale]/page.tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const { locale } = await params;
  const locations = await prisma.location.findMany();

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative flex h-[70vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-sidebar to-background" />
        <div className="relative z-10 text-center px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-ghost-border px-4 py-1.5 mb-6">
            <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">
              Now Open
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Xin Ch<span className="text-brand-gold">à</span>o
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-md mx-auto">
            Authentic Vietnamese flavors in the heart of the Netherlands
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href={chr(47) + locale + "/order"}
              className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {t("home.orderOnline")}
            </Link>
            <Link
              href={chr(47) + locale + "/reserve"}
              className="inline-flex items-center gap-2 rounded-full border border-ghost-border px-6 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
            >
              {t("home.reserveTable")}
            </Link>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-20 px-8">
        <h3 className="text-2xl font-bold text-white mb-2">Our Locations</h3>
        <p className="text-gray-400 mb-8">Two cities, one passion for Vietnamese cuisine</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="group rounded-2xl border border-white/5 bg-sidebar p-6 hover:border-brand-gold/30 transition-all"
            >
              <h4 className="text-xl font-semibold text-white group-hover:text-brand-gold transition-colors">
                {loc.name}
              </h4>
              <p className="mt-2 text-sm text-gray-400">{loc.address}</p>
              <p className="mt-1 text-sm text-gray-500">{loc.phone}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold" />
                Open {loc.openTime} - {loc.closeTime}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-8 text-center text-xs text-gray-600">
        <p> Xin Chào Restaurant. All rights reserved.</p>
      </footer>
    </div>
  );
}
""" .replace("chr(47)", "\"/\"")

with open("/Users/openmac/restaurant/src/app/[locale]/page.tsx", "w") as f:
    f.write(homepage)

print("Components created:")
print("  - src/components/LocaleSwitcher.tsx")
print("  - src/components/layout/Sidebar.tsx")
print("  - src/app/[locale]/page.tsx")
