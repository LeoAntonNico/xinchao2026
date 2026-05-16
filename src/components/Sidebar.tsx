"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { User, Menu, X } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);

  const switchLocale = locale === "en" ? "nl" : "en";
  const currentPath = pathname.replace("/" + locale, "");

  // Scroll detection for header background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* Mobile integrated header */}
      <header
        className={`lg:hidden fixed top-0 left-0 right-0 z-[200] h-12 flex items-center justify-between px-4 transition-all duration-300 ${
          scrolled
            ? "bg-surface/95 backdrop-blur-md shadow-sm border-b border-outline-variant"
            : "bg-transparent"
        }`}
      >
        <Link href={getHref(locale, "/")} className="flex items-center" onClick={() => setMobileOpen(false)}>
          <span className={`font-display text-lg tracking-tight transition-colors ${scrolled ? "text-logo-red" : "text-white drop-shadow-md"}`}>
            xin chào
          </span>
        </Link>

        <button
          className={`p-2 rounded-md transition-colors ${
            scrolled
              ? "text-foreground hover:bg-surface-container"
              : "text-white hover:bg-white/10"
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar drawer */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 right-0 lg:left-0 z-[150] w-[260px] lg:w-[280px] bg-sidebar border-l lg:border-l-0 lg:border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"} flex flex-col h-screen justify-between`}
      >
        <div>
          {/* Branding */}
          <div className="px-6 pt-10 pb-6">
            <Link href={getHref(locale, "/")} className="block" onClick={() => setMobileOpen(false)}>
              <Image
                src="/images/logo.jpg"
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
        <div className="fixed inset-0 bg-black/30 z-[140] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
