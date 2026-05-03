// src/app/[locale]/page.tsx
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
              href={"/" + locale + "/order"}
              className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {t("home.orderOnline")}
            </Link>
            <Link
              href={"/" + locale + "/reserve"}
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
