import { prisma } from "@/lib/prisma";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Prisma } from "@prisma/client";

type CategoryWithItems = Prisma.MenuCategoryGetPayload<{
  include: {
    items: { where: { isAvailable: true }; orderBy: { sortOrder: "asc" } };
  };
}>;

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const categories: CategoryWithItems[] = await prisma.menuCategory.findMany({
    include: {
      items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("nav.menu")}</h1>
        <p className="text-gray-400">Authentic Vietnamese dishes, made fresh daily</p>
      </div>

      <div className="space-y-10">
        {categories.map((cat: CategoryWithItems) => (
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
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
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
