import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  });

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
      variants: item.variants,
      modifiers: item.modifiers,
      exclusions: item.exclusions,
    })),
  }));

  return NextResponse.json(result);
}
