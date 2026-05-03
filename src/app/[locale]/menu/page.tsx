import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function MenuPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  const { locale } = await params;

  const categories = await prisma.menuCategory.findMany({
    include: {
      items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-white mb-2">{t("nav.menu")}</h1>
      <p className="text-gray-400 mb-8">Authentic Vietnamese dishes, made fresh daily</p>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-xl font-semibold text-brand-gold mb-4 flex items-center gap-2">
              {cat.name}
              <span className="h-px flex-1 bg-white/5" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between rounded-xl border border-white/5 bg-sidebar p-4 hover:border-brand-gold/30 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white group-hover:text-brand-gold transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-400">{item.description}</p>
                    )}
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <a
                    href={`/${locale}/order?item=${item.id}`}
                    className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-white text-sm font-bold hover:bg-red-700 transition-colors"
                    title="Add to cart"
                  >
                    +
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
