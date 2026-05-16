#!/usr/bin/env python3
"""Apply all UI/UX fixes to Xin Chào website."""
import os

BASE = "/Users/openmac/restaurant"

# ============================================================
# 1. Rewrite page.tsx — hero done via patch, now location cards + maps + CTAs
# ============================================================
page_tsx = '''import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { OpenStatus } from "./OpenStatus";
import LocationHours from "@/components/LocationHours";
import LazyMap from "@/components/LazyMap";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNl = locale === "nl";

  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });

  const accent = [
    { text: "text-logo-red", bg: "bg-logo-red", border: "border-logo-red", bar: "bg-logo-red", hover: "hover:bg-logo-red-hover", soft: "bg-logo-red-soft", pin: "fill-logo-red" },
    { text: "text-logo-gold", bg: "bg-logo-gold", border: "border-logo-gold", bar: "bg-logo-gold", hover: "hover:bg-[#967A11]", soft: "bg-logo-gold-soft", pin: "fill-logo-gold" },
  ];

  const badges = [
    isNl ? "Centrum" : "City Centre",
    isNl ? "Universiteitsstad" : "University Town",
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Image */}
      <div className="relative w-full h-[280px] md:h-[360px] lg:h-[420px] overflow-hidden">
        <Image
          src="/images/hero-pho.jpg"
          alt="Vietnamese food"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* Headline Section */}
      <section className="relative -mt-16 z-10 px-6 md:px-12 pb-12 md:pb-16">
        <div className="max-w-4xl">
          <span className="inline-block text-[11px] tracking-[0.15em] uppercase font-mono font-bold text-logo-red mb-4">
            {isNl ? "VERS & AUTHENTIEK" : "FRESH & AUTHENTIC"}
          </span>
          <h1 className="font-display text-[40px] sm:text-[56px] md:text-[80px] lg:text-[100px] leading-[0.95] tracking-tight uppercase text-foreground">
            SAIGON STREET FOOD
            <span className="text-logo-red">.</span>
          </h1>
        </div>
      </section>

      {/* Location Cards */}
      <section className="px-6 md:px-12 pb-20 bg-background">
        <div className="mb-10">
          <h2 className="text-[32px] md:text-[40px] font-bold text-foreground leading-tight">
            {isNl ? "Onze locaties" : "Our locations"}
          </h2>
          <p className="mt-2 text-[15px] text-gray-500">
            {isNl
              ? "Kies jouw favoriete locatie om te bestellen of een tafel te reserveren."
              : "Choose your preferred location to order or reserve a table."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((loc, i) => {
            const a = accent[i % 2];
            const hours = (loc.openingHours as Array<{ day: string; hours: string }>) || [];
            const welcome = isNl ? loc.welcomeTextNl : loc.welcomeTextEn;
            const { isOpen, nextChange, nextDay } = checkOpenStatus(hours);

            return (
              <div
                key={loc.id}
                className="bg-surface border border-border-default overflow-hidden"
                style={{ borderLeftWidth: "4px", borderLeftColor: i === 0 ? "#E31B23" : "#B99516" }}
              >
                {/* Top Photo */}
                <div className="relative h-[200px] md:h-[240px] bg-gray-200 overflow-hidden">
                  <Image
                    src={i === 0 ? "/images/utrecht-exterior.jpg" : "/images/wageningen-exterior.jpg"}
                    alt={`${loc.name} exterior`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {/* Status badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-wider ${isOpen ? "bg-green-600 text-white" : "bg-logo-red text-white"}`}>
                      {isOpen ? (isNl ? "OPEN" : "OPEN") : (isNl ? "GESLOTEN" : "CLOSED")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[11px] font-mono text-gray-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {isOpen
                        ? (isNl ? `Open tot ${nextChange}` : `Open until ${nextChange}`)
                        : nextDay === "tomorrow"
                          ? (isNl ? `Opent morgen om ${nextChange}` : `Opens tomorrow at ${nextChange}`)
                          : (isNl ? `Opent vandaag om ${nextChange}` : `Opens today at ${nextChange}`)}
                    </span>
                    {/* Location badge */}
                    <span className={`hidden sm:inline-flex items-center px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-wider bg-white/90 backdrop-blur-sm ${a.text}`}>
                      {badges[i]}
                    </span>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${a.soft} flex items-center justify-center shrink-0`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "#E31B23" : "#B99516"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[22px] font-bold text-foreground capitalize">{loc.slug}</h3>
                          <span className={`sm:hidden inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${a.soft} ${a.text}`}>
                            {badges[i]}
                          </span>
                        </div>
                        <p className="text-[13px] text-gray-500 mt-0.5">{welcome || ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <Link
                      href={`/${locale}/order`}
                      className={`inline-flex items-center px-5 py-2.5 ${a.bg} text-white text-[12px] font-bold font-mono uppercase tracking-wider ${a.hover} transition-colors`}
                    >
                      {isNl ? "Online Bestellen" : "Order Online"}
                    </Link>
                    <Link
                      href={`/${locale}/reserve`}
                      className={`inline-flex items-center px-5 py-2.5 bg-white border-2 ${a.border} ${a.text} text-[12px] font-bold font-mono uppercase tracking-wider hover:${a.soft} transition-colors`}
                    >
                      {isNl ? "Tafel Reserveren" : "Reserve Table"}
                    </Link>
                  </div>

                  {/* Two-column: Hours + Map/Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Opening Hours — accordion on mobile */}
                    <LocationHours hours={hours} locale={locale} accent={a} />

                    {/* Map + Contact */}
                    <div>
                      <LazyMap embedUrl={loc.mapEmbedUrl} name={loc.name} accent={a} />

                      {/* Contact */}
                      <div className="space-y-3 mt-4">
                        <div className="flex items-start gap-2.5">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "#E31B23" : "#B99516"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <p className="text-[13px] text-gray-600 leading-snug">{loc.address}</p>
                        </div>

                        <a
                          href={`tel:${loc.phone}`}
                          className={`flex items-center justify-center gap-2 w-full px-4 py-3 ${a.soft} ${a.text} text-[13px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {loc.phone}
                        </a>

                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 ${a.border} ${a.text} text-[13px] font-bold font-mono uppercase tracking-wider hover:${a.soft} transition-colors`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                          </svg>
                          {isNl ? "Routebeschrijving" : "Get directions"}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// Server-side open status check (Amsterdam timezone)
function checkOpenStatus(hours: Array<{ day: string; hours: string }>): { isOpen: boolean; nextChange: string; nextDay: "today" | "tomorrow" } {
  const now = new Date();
  const amsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const dayNamesNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const dayNamesEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayNameNl = dayNamesNl[amsTime.getDay()];
  const todayNameEn = dayNamesEn[amsTime.getDay()];

  const todayEntry = hours.find((h) =>
    h.day.toLowerCase().includes(todayNameNl) ||
    h.day.toLowerCase().includes(todayNameEn)
  );

  if (!todayEntry) return { isOpen: false, nextChange: "", nextDay: "tomorrow" };

  const match = todayEntry.hours.match(/(\\d{1,2}):(\\d{2})\\s*[\\u2013-]\\s*(\\d{1,2}):(\\d{2})/);
  if (!match) return { isOpen: false, nextChange: todayEntry.hours, nextDay: "tomorrow" };

  const [, openH, openM, closeH, closeM] = match.map(Number);
  const currentMinutes = amsTime.getHours() * 60 + amsTime.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    return { isOpen: true, nextChange: `${String(closeH).padStart(2, "0")}:${String(closeM).padStart(2, "0")}`, nextDay: "today" };
  }

  const nextDay: "today" | "tomorrow" = currentMinutes < openMinutes ? "today" : "tomorrow";
  const nextTime = `${String(openH).padStart(2, "0")}:${String(openM).padStart(2, "0")}`;

  return { isOpen: false, nextChange: nextTime, nextDay };
}
'''

with open(os.path.join(BASE, "src/app/[locale]/page.tsx"), "w") as f:
    f.write(page_tsx)

# ============================================================
# 2. Rewrite Sidebar.tsx — mobile drawer from right, remove gold nav color
# ============================================================
sidebar_tsx = '''"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { User } from "lucide-react";

import Image from "next/image";

function getHref(locale: string, path: string) {
  return `/${locale}${path}`;
}

// Inline SVG icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8L4.8 12.8A4 4 0 0 0 8.8 18h6.4a4 4 0 0 0 4-5.2L18 8" />
      <path d="M6 8h12" />
      <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function TableIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function HelpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const navItems = [
  { key: "home", href: "/", icon: HomeIcon },
  { key: "order", href: "/order", icon: BowlIcon },
  { key: "reserve", href: "/reserve", icon: TableIcon },
  { key: "myAccount", href: "/my-account", icon: User },
  { key: "contact", href: "/contact", icon: HelpIcon },
];

export default function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = locale === "en" ? "nl" : "en";
  const currentPath = pathname.replace("/" + locale, "");

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-white border border-gray-200 shadow-sm rounded-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <div className="space-y-1">
          <span className={`block w-5 h-0.5 bg-gray-800 transition-transform ${mobileOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[3px]" : ""}`} />
        </div>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 right-0 lg:left-0 z-40 w-[260px] lg:w-[280px] bg-sidebar border-l lg:border-l-0 lg:border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"} flex flex-col h-screen justify-between`}
      >
        <div>
          {/* Branding */}
          <div className="px-6 pt-10 pb-6">
            <Link href={getHref(locale, "/")} className="block" onClick={() => setMobileOpen(false)}>
              <Image
                src="/images/logo.png"
                alt="Xin Chào Vietnamese Street Food"
                width={200}
                height={80}
                className="w-full max-w-[180px] h-auto"
                priority
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="px-6 py-4 space-y-1">
            {navItems.map((item) => {
              const href = getHref(locale, item.href);
              const isActive = pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 text-[13px] tracking-[0.06em] uppercase font-bold font-mono transition-colors duration-200 ${isActive ? "bg-logo-red text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer area */}
        <div className="px-8 pb-10">
          <div className="flex items-center gap-4 mb-6">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Facebook">
              <FacebookIcon className="w-4 h-4" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Instagram">
              <InstagramIcon className="w-4 h-4" />
            </a>
          </div>

          <Link
            href={getHref(switchLocale, currentPath)}
            className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors tracking-[0.1em] uppercase font-mono"
          >
            <GlobeIcon className="w-3.5 h-3.5" />
            <span>{locale === "en" ? "Nederlands" : "English"}</span>
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
'''

with open(os.path.join(BASE, "src/components/Sidebar.tsx"), "w") as f:
    f.write(sidebar_tsx)

# ============================================================
# 3. Create LocationHours.tsx — accordion on mobile, highlight today
# ============================================================
location_hours_tsx = '''"use client";

import { useState } from "react";

interface HoursEntry {
  day: string;
  hours: string;
}

interface Props {
  hours: HoursEntry[];
  locale: string;
  accent: {
    text: string;
    bg: string;
    border: string;
    bar: string;
    hover: string;
    soft: string;
    pin: string;
  };
}

export default function LocationHours({ hours, locale, accent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isNl = locale === "nl";

  const dayNamesNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const dayNamesEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const now = new Date();
  const amsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const todayNameNl = dayNamesNl[amsTime.getDay()];
  const todayNameEn = dayNamesEn[amsTime.getDay()];

  const todayEntry = hours.find((h) =>
    h.day.toLowerCase().includes(todayNameNl) ||
    h.day.toLowerCase().includes(todayNameEn)
  );

  return (
    <div>
      {/* Mobile accordion header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="md:hidden flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground">
            {isNl ? "Openingstijden" : "Opening Hours"}
          </h4>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Desktop label */}
      <div className="hidden md:flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent.bar === "bg-logo-red" ? "#E31B23" : "#B99516"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h4 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-foreground">
          {isNl ? "Openingstijden" : "Opening Hours"}
        </h4>
      </div>

      {/* Hours list — always visible on desktop, toggled on mobile */}
      <div className={`md:block ${expanded ? "block" : "hidden"}`}>
        <div className="space-y-1">
          {hours.map((h, idx) => {
            const isToday =
              h.day.toLowerCase().includes(todayNameNl) ||
              h.day.toLowerCase().includes(todayNameEn);
            return (
              <div
                key={idx}
                className={`flex justify-between items-center py-1.5 px-2 -mx-2 rounded-sm ${isToday ? `${accent.soft}` : ""}`}
              >
                <span className={`text-[12px] font-mono ${isToday ? `font-bold ${accent.text}` : "text-gray-500"}`}>
                  {h.day}
                  {isToday && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold bg-logo-red text-white px-1 py-0.5">
                      {isNl ? "Vandaag" : "Today"}
                    </span>
                  )}
                </span>
                <span className={`text-[12px] font-mono font-medium ${isToday ? "text-foreground font-bold" : "text-foreground"}`}>
                  {h.hours}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
'''

os.makedirs(os.path.join(BASE, "src/components"), exist_ok=True)
with open(os.path.join(BASE, "src/components/LocationHours.tsx"), "w") as f:
    f.write(location_hours_tsx)

# ============================================================
# 4. Create LazyMap.tsx — static placeholder, click to load iframe
# ============================================================
lazy_map_tsx = '''"use client";

import { useState } from "react";

interface Props {
  embedUrl: string | null;
  name: string;
  accent: {
    text: string;
    bg: string;
    border: string;
    bar: string;
    hover: string;
    soft: string;
    pin: string;
  };
}

export default function LazyMap({ embedUrl, name, accent }: Props) {
  const [loaded, setLoaded] = useState(false);

  if (!embedUrl) return null;

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        className="w-full h-[120px] bg-gray-100 border border-gray-200 overflow-hidden relative flex items-center justify-center group cursor-pointer"
      >
        {/* Static map pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#DDD6CA" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="50%" cy="50%" r="40" fill="#F2EDE3" />
            <circle cx="50%" cy="50%" r="20" fill="#DDD6CA" opacity="0.5" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 24 24" className={accent.pin}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${accent.text}`}>
            Load map
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full h-[120px] bg-gray-100 border border-gray-200 overflow-hidden relative">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, filter: "grayscale(30%)" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map ${name}`}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="32" height="32" viewBox="0 0 24 24" className={accent.pin}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    </div>
  );
}
'''

with open(os.path.join(BASE, "src/components/LazyMap.tsx"), "w") as f:
    f.write(lazy_map_tsx)

# ============================================================
# 5. Create Footer.tsx
# ============================================================
footer_tsx = '''"use client";

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
'''

with open(os.path.join(BASE, "src/components/Footer.tsx"), "w") as f:
    f.write(footer_tsx)

# ============================================================
# 6. Create MobileStickyCTA.tsx — floating bottom bar on mobile
# ============================================================
mobile_sticky_tsx = '''"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

export default function MobileStickyCTA() {
  const locale = useLocale();
  const isNl = locale === "nl";

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
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
'''

with open(os.path.join(BASE, "src/components/MobileStickyCTA.tsx"), "w") as f:
    f.write(mobile_sticky_tsx)

# ============================================================
# 7. Update layout.tsx — add Footer and MobileStickyCTA
# ============================================================
layout_tsx = '''import type { Metadata } from "next";
import { Anton, Be_Vietnam_Pro, Space_Grotesk, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";

const anton = Anton({ weight: "400", variable: "--font-anton", subsets: ["latin"] });
const beVietnam = Be_Vietnam_Pro({ weight: ["400", "500", "700"], variable: "--font-be-vietnam", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ weight: ["400", "500", "700"], variable: "--font-space-grotesk", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Xin Chào | Vietnamese Street Food",
  description: "Authentic Vietnamese cuisine with locations in Utrecht and Wageningen",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

    return (
    <html lang={locale} className={`${anton.variable} ${beVietnam.variable} ${spaceGrotesk.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <CartProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </div>
            <CartDrawer />
            <CartButton />
            <MobileStickyCTA />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
'''

with open(os.path.join(BASE, "src/app/[locale]/layout.tsx"), "w") as f:
    f.write(layout_tsx)

print("All UI/UX fixes applied successfully.")
''', 