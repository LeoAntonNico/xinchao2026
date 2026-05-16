"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import { track } from "@/lib/analytics";

export default function Hero() {
  const locale = useLocale();
  const isNl = locale === "nl";

  return (
    <section className="relative w-full h-[420px] sm:h-[440px] md:h-[420px] flex items-end overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/hero-pho.jpg"
        alt="Vietnamese street food"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />

      {/* Dark gradient overlay — stronger on left for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-5 pb-8 sm:pb-10 pt-20">
        <div className="max-w-[340px]">
          <span className="inline-block text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-mono font-bold text-logo-red mb-2">
            {isNl ? "VERS & AUTHENTIEK" : "FRESH & AUTHENTIC"}
          </span>

          <h1 className="font-display text-white leading-[0.92] tracking-tight mb-2"
              style={{ fontSize: 'clamp(2.2rem, 11vw, 3.5rem)' }}>
            SAIGON<br />STREET FOOD
          </h1>

          <p className="text-white/80 text-[13px] sm:text-[14px] leading-[1.45] mb-4 max-w-[280px]">
            {isNl
              ? "Authentieke Vietnamese street food. Vers, snel en vol smaak."
              : "Authentic Vietnamese street food. Fresh, fast, and full of flavor."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/order`}
              onClick={() => track({ event: "hero_cta_clicked", path: "/order", locale })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-logo-red text-white text-[12px] font-bold rounded-lg hover:bg-logo-red-hover transition-colors shadow-lg"
            >
              {isNl ? "Bestel" : "Order"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/${locale}/reserve`}
              onClick={() => track({ event: "hero_cta_clicked", path: "/reserve", locale })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white text-[12px] font-bold rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              {isNl ? "Reserveer" : "Reserve"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
