import { prisma } from "@/lib/prisma";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Prisma } from "@prisma/client";
import Image from "next/image";

type CategoryWithItems = Prisma.MenuCategoryGetPayload<{
  include: {
    items: { where: { isAvailable: true }; orderBy: { sortOrder: "asc" } };
  };
}>;

/* Brutalist category display: e.g. PHỞ + SOUL */
const SOUL_WORDS = ["SOUL", "FRESH", "BOWL", "CRISP", "SIP", "HEAT", "ZEN", "WILD"];

function soulWord(idx: number) {
  return SOUL_WORDS[idx % SOUL_WORDS.length];
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function tagStyle(slug: string, crossColor: string) {
  // crossColor is the *other* section's color (pink for lime sections, lime for pink)
  switch (slug) {
    case "vegan":
      return crossColor === "lime" ? "bg-lime text-black border-lime" : "bg-neon-pink text-black border-neon-pink";
    case "gluten-free":
      return "bg-transparent text-white border-white/40";
    case "spicy":
      return "bg-transparent text-white border-white/40";
    default:
      return "bg-transparent text-white border-white/40";
  }
}

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNl = locale === "nl";

  const categories = await prisma.menuCategory.findMany({
    include: {
      items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  }) as CategoryWithItems[];

  const dietaryOpts = await prisma.dietaryOption.findMany({ orderBy: { sortOrder: "asc" } });
  const dietaryMap = new Map(dietaryOpts.map((d) => [d.slug, d]));

  return (
    <div className="space-y-16 pb-20">
      {/* Page header */}
      <header className="px-6 md:px-10 pt-6">
        <h1 className="font-display text-[48px] md:text-[64px] leading-none tracking-tight text-on-surface-variant">
          SÀIGÒN STREET FOOD
        </h1>
      </header>

      {categories.map((cat, catIdx) => {
        /* Alternate styling every section */
        const isEven = catIdx % 2 === 0;
        const accentBar = isEven ? "bg-neon-pink" : "bg-lime";
        const crossBadge = isEven ? "bg-lime" : "bg-neon-pink";   // price badge uses cross-color
        const useWide = isEven;                                    // even = 2-col wide cards
        const cols = useWide ? "md:grid-cols-2" : "md:grid-cols-3";
        const categoryName = cat.name;

        return (
          <section key={cat.id} className="px-6 md:px-10">
            {/* Section title */}
            <div className="mb-8">
              <h2 className="text-[32px] md:text-[40px] font-display font-normal italic uppercase leading-none tracking-tight">
                <span className="text-white">{categoryName}</span>
                <span className="text-soul-red"> {soulWord(catIdx)}</span>
              </h2>
              <div className={`mt-3 h-[6px] w-24 ${accentBar}`} />
            </div>

            {/* Cards grid */}
            <div className={`grid grid-cols-1 ${cols} gap-4 md:gap-6`}>
              {cat.items.map((item) => {
                const name = (isNl && item.nameNl) ? item.nameNl : item.name;
                const desc = (isNl && item.shortDescriptionNl) ? item.shortDescriptionNl : item.shortDescription;
                const img = item.imageUrls?.[0] || item.imageUrl || "/images/hero-pho.jpg";
                const price = formatPrice(item.price);

                return useWide ? (
                  /* Wide card (image left + content right) */
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row bg-surface-container border border-white/5 overflow-hidden"
                  >
                    <div className="relative w-full md:w-1/2 aspect-[4/3] md:aspect-auto">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        className="object-cover grayscale"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[18px] font-bold italic uppercase text-white leading-tight">
                          {name}
                        </h3>
                        <span className={`inline-block shrink-0 ${crossBadge} text-black text-[11px] font-bold font-mono tracking-wide px-2 py-1`}>
                          {price}
                        </span>
                      </div>
                      {desc && (
                        <p className="mt-3 text-[14px] text-on-surface-variant leading-relaxed">{desc}</p>
                      )}
                      {item.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {item.dietaryTags.map((slug) => {
                            const opt = dietaryMap.get(slug);
                            if (!opt) return null;
                            return (
                              <span
                                key={slug}
                                className={`inline-block text-[10px] tracking-[0.08em] uppercase font-bold font-mono px-2 py-1 border ${tagStyle(slug, crossBadge)}`}
                              >
                                {isNl && opt.nameNl ? opt.nameNl : opt.nameEn}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard card (image top + content below) */
                  <div
                    key={item.id}
                    className="bg-surface-container border border-white/5 overflow-hidden"
                  >
                    <div className="relative w-full aspect-[16/10]">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        className="object-cover grayscale"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <span className={`absolute top-3 right-3 ${crossBadge} text-black text-[11px] font-bold font-mono tracking-wide px-2 py-1`}>
                        {price}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[16px] font-bold italic uppercase text-white leading-tight">
                        {name}
                      </h3>
                      {desc && (
                        <p className="mt-2 text-[13px] text-on-surface-variant leading-relaxed">{desc}</p>
                      )}
                      {item.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.dietaryTags.map((slug) => {
                            const opt = dietaryMap.get(slug);
                            if (!opt) return null;
                            return (
                              <span
                                key={slug}
                                className={`inline-block text-[10px] tracking-[0.08em] uppercase font-bold font-mono px-2 py-1 border ${tagStyle(slug, crossBadge)}`}
                              >
                                {isNl && opt.nameNl ? opt.nameNl : opt.nameEn}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
