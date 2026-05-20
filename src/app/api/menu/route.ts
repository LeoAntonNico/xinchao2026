import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewMenuCategories } from "@/lib/local-preview-data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const locale = searchParams.get("locale");
  if (!locationId) return NextResponse.json({ error: "Missing locationId" }, { status: 400 });

  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: {
          locations: { some: { id: locationId } },
        },
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } }, exclusions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  }).catch(() => previewMenuCategories);

  const isNl = locale === "nl";
  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    items: cat.items.map((item) => ({
      id: item.id,
      name: isNl && item.nameNl ? item.nameNl : item.name,
      description: isNl && item.descriptionNl ? item.descriptionNl : item.description,
      shortDescription: isNl && item.shortDescriptionNl ? item.shortDescriptionNl : item.shortDescription,
      price: item.price,
      salePrice: item.salePrice,
      imageUrl: item.imageUrl,
      dietaryTags: item.dietaryTags,
      isSpicy: item.isSpicy,
      isAvailable: item.isAvailable,
      isDineInOnly: item.isDineInOnly,
      variants: "variants" in item ? item.variants : [],
      modifiers: "modifiers" in item ? item.modifiers : [],
      exclusions: "exclusions" in item ? item.exclusions : [],
    })),
  }));

  return NextResponse.json(result);
}
