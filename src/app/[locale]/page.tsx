import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

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
    { text: "text-neon-pink", bg: "bg-neon-pink", border: "border-neon-pink", bar: "bg-neon-pink" },
    { text: "text-lime", bg: "bg-lime", border: "border-lime", bar: "bg-lime" },
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface" />
      </div>

      {/* Headline Section */}
      <section className="relative -mt-16 z-10 px-6 md:px-12 pb-12 md:pb-16">
        <div className="max-w-4xl">
          <span className="inline-block text-[11px] tracking-[0.15em] uppercase font-mono font-bold text-neon-pink mb-4">
            {isNl ? "VERS & AUTHENTIEK" : "FRESH & AUTHENTIC"}
          </span>
          <h1 className="font-display text-[56px] md:text-[80px] lg:text-[100px] leading-[0.95] tracking-tight uppercase text-white">
            SAIGON STREET FOOD
            <span className="text-neon-pink">.</span>
          </h1>
        </div>
      </section>

      {/* Location Columns */}
      <section className="px-6 md:px-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-white/10">
          {locations.map((loc, i) => {
            const a = accent[i % 2];
            const hours = (loc.openingHours as Record<string, { open: string; close: string }>) || {};
            const welcome = isNl ? loc.welcomeTextNl : loc.welcomeTextEn;

            return (
              <div
                key={loc.id}
                className={`relative ${i === 0 ? "lg:border-r lg:border-white/10" : ""} ${i === 0 ? "lg:pr-10" : "lg:pl-10"} py-10`}
              >
                {/* Colored vertical bar */}
                <div className={`absolute left-0 top-10 bottom-10 w-[8px] ${a.bar}`} />

                <div className="pl-6">
                  {/* Location name */}
                  <h2 className={`text-[28px] font-display font-normal tracking-tight lowercase leading-none ${a.text}`}>
                    {loc.slug}
                  </h2>

                  {/* Welcome text */}
                  <p className="mt-3 text-[14px] text-brand-gold leading-relaxed">
                    {welcome || ""}
                  </p>

                  {/* Action buttons */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/${locale}/order`}
                      className={`inline-flex items-center px-6 py-3 ${a.bg} text-black text-[11px] font-mono font-bold tracking-[0.1em] uppercase hover:opacity-90 transition-opacity`}
                    >
                      {isNl ? "Online Bestellen" : "Order Online"}
                    </Link>
                    <Link
                      href={`/${locale}/reserve`}
                      className="inline-flex items-center px-6 py-3 bg-transparent border border-white/30 text-white text-[11px] font-mono font-bold tracking-[0.1em] uppercase hover:bg-white/5 transition-colors"
                    >
                      {isNl ? "Tafel Reserveren" : "Reserve Table"}
                    </Link>
                  </div>

                  {/* Opening Hours */}
                  <div className="mt-10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-block w-2 h-2 ${a.bar}`} />
                      <h3 className="text-[11px] tracking-[0.12em] uppercase font-mono font-bold text-white">
                        {isNl ? "Openingstijden" : "Opening Hours"}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <OpeningHoursCard
                        label={isNl ? "MA – DO" : "MON – THU"}
                        time={hours["monday"] ? `${hours["monday"].open} – ${hours["monday"].close}` : "Closed"}
                      />
                      <OpeningHoursCard
                        label={isNl ? "VRIJDAG" : "FRIDAY"}
                        time={hours["friday"] ? `${hours["friday"].open} – ${hours["friday"].close}` : "Closed"}
                      />
                      <OpeningHoursCard
                        label={isNl ? "ZATERDAG" : "SATURDAY"}
                        time={hours["saturday"] ? `${hours["saturday"].open} – ${hours["saturday"].close}` : "Closed"}
                      />
                      <OpeningHoursCard
                        label={isNl ? "ZONDAG" : "SUNDAY"}
                        time={hours["sunday"] ? `${hours["sunday"].open} – ${hours["sunday"].close}` : "Closed"}
                      />
                    </div>
                  </div>

                  {/* Map */}
                  {loc.mapEmbedUrl && (
                    <div className="mt-8">
                      <div className="w-full h-[200px] bg-surface-container-high border border-white/10 overflow-hidden">
                        <iframe
                          src={loc.mapEmbedUrl}
                          width="100%"
                          height="100%"
                          style={{ border: 0, filter: "grayscale(1) invert(0.9)" }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`Map ${loc.name}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="mt-8 space-y-3">
                    <div>
                      <span className={`text-[10px] tracking-[0.12em] uppercase font-mono font-bold ${a.text}`}>
                        {isNl ? "Adres" : "Address"}
                      </span>
                      <p className="mt-1 text-[13px] text-white/80 uppercase tracking-wide">
                        {loc.address}
                      </p>
                    </div>
                    <div>
                      <span className={`text-[10px] tracking-[0.12em] uppercase font-mono font-bold ${a.text}`}>
                        {isNl ? "Contact" : "Contact"}
                      </span>
                      <p className="mt-1 text-[13px] text-white/80">
                        {loc.phone} {loc.email && `/ ${loc.email}`}
                      </p>
                    </div>

                    {/* Directions */}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 mt-2 text-[11px] tracking-[0.08em] uppercase font-mono font-bold ${a.text} hover:opacity-80 transition-opacity`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      </svg>
                      {isNl ? `Route naar ${loc.slug}` : `Get directions to ${loc.slug}`}
                    </a>
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

function OpeningHoursCard({ label, time }: { label: string; time: string }) {
  return (
    <div className="bg-surface-container-high border border-white/5 px-3 py-3">
      <div className="text-[10px] tracking-[0.1em] uppercase font-mono font-bold text-white/50 mb-1">
        {label}
      </div>
      <div className="text-[13px] font-mono text-white">
        {time}
      </div>
    </div>
  );
}
