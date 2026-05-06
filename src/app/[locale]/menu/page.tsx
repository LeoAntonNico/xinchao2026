import { prisma } from "@/lib/prisma";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Prisma } from "@prisma/client";
import Image from "next/image";
import { Flame } from "lucide-react";

type CategoryWithItems = Prisma.MenuCategoryGetPayload<{
  include: {
    items: { where: { isAvailable: true }; orderBy: { sortOrder: "asc" } };
  };
}>;

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNl = locale === "nl";

  const [categories, dietaryOpts] = await Promise.all([
    prisma.menuCategory.findMany({
      include: {
        items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    }) as Promise<CategoryWithItems[]>,
    prisma.dietaryOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  const dietaryMap = new Map(dietaryOpts.map((d) => [d.slug, d]));

  return (
<div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("nav.menu")}</h1>
        <p className="text-gray-400">Authentic Vietnamese dishes, made fresh daily</p>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-xl font-semibold text-[#d4a017] mb-4 flex items-center gap-2">
              {cat.name}
              <span className="h-px flex-1 bg-white/5" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between rounded-xl border border-white/5 bg-[#252525] p-4 hover:border-[#d4a017]/30 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white group-hover:text-[#d4a017] transition-colors">
                      {isNl && item.nameNl ? item.nameNl : item.name}
                      {item.isSpicy && (
                        <Flame className="w-4 h-4 text-orange-400 inline ml-1 align-text-bottom" />
                      )}
                    </h3>
                    {(isNl && item.shortDescriptionNl ? item.shortDescriptionNl : item.shortDescription) && (
                      <p className="text-sm text-gray-400 mt-1">
                        {isNl && item.shortDescriptionNl ? item.shortDescriptionNl : item.shortDescription}
                      </p>
                    )}
                    {item.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.dietaryTags.map((slug) => {
                          const opt = dietaryMap.get(slug);
                          if (!opt) return null;
                          return (
                            <span key={slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-white/10 text-[11px] text-gray-300">
                              {opt.iconUrl ? (
                                <img src={opt.iconUrl} alt={opt.nameEn} className="w-3.5 h-3.5 object-contain" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-gray-700 inline-block" />
                              )}
                              {isNl && opt.nameNl ? opt.nameNl : opt.nameEn}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-white ml-4">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
