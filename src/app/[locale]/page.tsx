import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const locations: { id: string; name: string; address: string; phone: string; openTime: string; closeTime: string }[] = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#111111] border border-[#333] p-8 md:p-16">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c41e3a]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 relative z-10">
          {t("hero.title")}
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl relative z-10">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-wrap gap-4 relative z-10">
          <Link
            href={`/${locale}/order`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c41e3a] text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors"
          >
            {t("hero.orderCta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/${locale}/reserve`}
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#555] text-white rounded-lg font-medium hover:bg-[#333] transition-colors"
          >
            {t("hero.reserveCta")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">
          {t("locations.title")}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-[#252525] border border-[#333] rounded-xl p-6 hover:border-[#555] transition-colors">
              <h3 className="text-xl font-bold text-[#d4a017] mb-2">
                {loc.name}
              </h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#c41e3a] mt-0.5 shrink-0" />
                  <span>
                    {loc.address}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#c41e3a] shrink-0" />
                  <span>
                    {loc.phone}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#c41e3a] shrink-0" />
                  <span>
                    {loc.openTime} – {loc.closeTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
