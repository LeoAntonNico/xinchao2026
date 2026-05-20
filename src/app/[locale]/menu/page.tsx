import { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { previewDietaryOptions, previewMenuCategories } from "@/lib/local-preview-data";
import MenuOrderClient, { type MenuCategoryView, type MenuDietaryOptionView, type MenuItemView } from "@/components/menu/MenuOrderClient";

type CategoryWithItems = Prisma.MenuCategoryGetPayload<{
  include: {
    items: {
      where: { isAvailable: true };
      orderBy: { sortOrder: "asc" };
    };
  };
}>;

type ProductVariant = Prisma.ProductVariantGetPayload<Record<string, never>>;
type ProductModifier = Prisma.ProductModifierGetPayload<Record<string, never>>;
type ProductExclusion = Prisma.ProductExclusionGetPayload<Record<string, never>>;

function groupByMenuItemId<T extends { menuItemId: string }>(records: T[]) {
  return records.reduce((map, record) => {
    const current = map.get(record.menuItemId) ?? [];
    current.push(record);
    map.set(record.menuItemId, current);
    return map;
  }, new Map<string, T[]>());
}

function normalizeDishKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productOptionScore(item: MenuItemView) {
  return item.variants.length * 4 + item.modifiers.length * 3 + item.exclusions.length * 2 + item.description.length / 1000;
}

function dedupeMenuItems(items: MenuItemView[]) {
  const uniqueItems = new Map<string, MenuItemView>();

  for (const item of items) {
    const key = `${normalizeDishKey(item.name)}:${item.price}:${item.image}`;
    const existing = uniqueItems.get(key);
    if (!existing || productOptionScore(item) > productOptionScore(existing)) {
      uniqueItems.set(key, item);
    }
  }

  return Array.from(uniqueItems.values());
}

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations();
  const isNl = locale === "nl";

  const categories = (await prisma.menuCategory
    .findMany({
      include: {
        items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => previewMenuCategories)) as CategoryWithItems[];

  const dietaryOptions = await prisma.dietaryOption
    .findMany({ orderBy: { sortOrder: "asc" } })
    .catch(() => previewDietaryOptions);

  const itemIds = categories.flatMap((category) => category.items.map((item) => item.id));
  const [variants, modifiers, exclusions]: [ProductVariant[], ProductModifier[], ProductExclusion[]] = itemIds.length > 0
    ? await Promise.all([
        prisma.productVariant
          .findMany({
            where: { menuItemId: { in: itemIds } },
            orderBy: [{ menuItemId: "asc" }, { sortOrder: "asc" }],
          })
          .catch(() => [] as ProductVariant[]),
        prisma.productModifier
          .findMany({
            where: { menuItemId: { in: itemIds } },
            orderBy: [{ menuItemId: "asc" }, { sortOrder: "asc" }],
          })
          .catch(() => [] as ProductModifier[]),
        prisma.productExclusion
          .findMany({
            where: { menuItemId: { in: itemIds } },
            orderBy: [{ menuItemId: "asc" }, { sortOrder: "asc" }],
          })
          .catch(() => [] as ProductExclusion[]),
      ])
    : [[], [], []];

  const variantsByItemId = groupByMenuItemId(variants);
  const modifiersByItemId = groupByMenuItemId(modifiers);
  const exclusionsByItemId = groupByMenuItemId(exclusions);

  const categoryViews: MenuCategoryView[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    items: dedupeMenuItems(category.items.map((item) => ({
      id: item.id,
      name: isNl && item.nameNl ? item.nameNl : item.name,
      description:
        (isNl && item.shortDescriptionNl ? item.shortDescriptionNl : item.shortDescription) ||
        (isNl && item.descriptionNl ? item.descriptionNl : item.description) ||
        "",
      price: item.price,
      image: item.imageUrls?.[0] || item.imageUrl || "/images/hero-pho.jpg",
      dietaryTags: item.dietaryTags,
      variants: (variantsByItemId.get(item.id) ?? []).map((variant) => ({
        id: variant.id,
        name: isNl && variant.nameNl ? variant.nameNl : variant.name,
        price: variant.price,
      })),
      modifiers: (modifiersByItemId.get(item.id) ?? []).map((modifier) => ({
        id: modifier.id,
        name: isNl && modifier.nameNl ? modifier.nameNl : modifier.name,
        price: modifier.price,
      })),
      exclusions: (exclusionsByItemId.get(item.id) ?? []).map((exclusion) => ({
        id: exclusion.id,
        name: isNl && exclusion.nameNl ? exclusion.nameNl : exclusion.name,
      })),
    }))),
  }));

  const dietaryOptionViews: MenuDietaryOptionView[] = dietaryOptions.map((option) => ({
    slug: option.slug,
    label: isNl && option.nameNl ? option.nameNl : option.nameEn,
  }));

  return <MenuOrderClient categories={categoryViews} dietaryOptions={dietaryOptionViews} locale={locale} />;
}
