import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  MapPin, Phone, Mail, Clock, Calendar, ShoppingBag, Navigation,
  Building2, Leaf
} from "lucide-react";
import Link from "next/link";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNl = locale === "nl";

  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-[42px] md:text-[64px] leading-[0.9] uppercase tracking-tight text-foreground">
          <span>{isNl ? "Contact" : "Contact"}</span>
          <span className="text-logo-red">.</span>
        </h1>
        <p className="text-gray-500 text-[14px] leading-relaxed mt-3 max-w-md">
          {isNl
            ? "Bel, mail of bezoek één van onze locaties. Voor reserveren of bestellen kies je je locatie."
            : "Call, email or visit one of our locations. To reserve or order, choose your location."}
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href={`/${locale}/reserve`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-logo-red text-white text-[12px] font-bold rounded-lg hover:bg-logo-red-hover transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {isNl ? "Reserveer tafel" : "Reserve table"}
        </Link>
        <Link
          href={`/${locale}/order`}
          className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-foreground text-foreground text-[12px] font-bold rounded-lg hover:bg-foreground/5 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          {isNl ? "Bestel online" : "Order online"}
        </Link>
      </div>

      {/* Locations */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {isNl ? "Onze locaties" : "Our locations"}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((loc) => {
          const isUtrecht = loc.slug === "utrecht";
          const accent = isUtrecht
            ? { iconBg: "bg-logo-red", text: "text-logo-red", border: "border-logo-red", hover: "hover:bg-logo-red/10" }
            : { iconBg: "bg-logo-gold", text: "text-logo-gold", border: "border-logo-gold", hover: "hover:bg-logo-gold/10" };
          const district = isUtrecht
            ? (isNl ? "Centrum" : "City Centre")
            : (isNl ? "Universiteitsstad" : "University Town");
          const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(loc.address || "")}`;

          return (
            <div key={loc.id} className="bg-surface rounded-xl border border-outline-variant p-5">
              {/* Icon + district */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${accent.iconBg} flex items-center justify-center shrink-0`}>
                  {isUtrecht ? (
                    <Building2 className="w-5 h-5 text-white" />
                  ) : (
                    <Leaf className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${accent.border} ${accent.text}`}>
                  {district}
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground mb-3">{loc.name}</h3>

              {/* Info rows */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-start gap-2.5">
                  <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${accent.text}`} />
                  <span className="text-[12px] text-on-surface-variant">{loc.address}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className={`w-4 h-4 shrink-0 ${accent.text}`} />
                  <a href={`tel:${loc.phone}`} className="text-[12px] text-on-surface-variant hover:text-foreground transition-colors">
                    {loc.phone}
                  </a>
                </div>
                {loc.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className={`w-4 h-4 shrink-0 ${accent.text}`} />
                    <a href={`mailto:${loc.email}`} className="text-[12px] text-on-surface-variant hover:text-foreground transition-colors">
                      {loc.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-4 h-4 shrink-0 ${accent.text}`} />
                  <span className="text-[12px] text-on-surface-variant">
                    {isNl ? "Vandaag" : "Today"}: {loc.openTime} – {loc.closeTime}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${loc.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-[11px] font-medium text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {isNl ? "Bel" : "Call"}
                </a>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-[11px] font-medium text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  {isNl ? "Route" : "Directions"}
                </a>
                <Link
                  href={`/${locale}/reserve`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white ${accent.iconBg} hover:opacity-90 transition-opacity`}
                >
                  <Calendar className="w-3 h-3" />
                  {isNl ? "Reserveer" : "Reserve"}
                </Link>
                <Link
                  href={`/${locale}/order`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white ${accent.iconBg} hover:opacity-90 transition-opacity`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  {isNl ? "Bestel" : "Order"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
