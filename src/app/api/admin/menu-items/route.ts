import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { previewLocations, previewMenuCategories } from "@/lib/local-preview-data";

const menuItemInclude = {
  categories: true,
  locations: true,
  plasticSurcharges: true,
  variants: { orderBy: { sortOrder: "asc" as const } },
  modifiers: { orderBy: { sortOrder: "asc" as const } },
  exclusions: { orderBy: { sortOrder: "asc" as const } },
};

type PlasticSurchargeInput = {
  locationId?: string;
  amount?: number;
  isActive?: boolean;
};

function normalizePlasticSurcharges(input: unknown): Array<{ locationId: string; amount: number; isActive: boolean }> {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry: PlasticSurchargeInput) => {
    if (!entry?.locationId) return [];
    const amount = Number.isFinite(entry.amount) ? Math.max(0, Math.round(Number(entry.amount))) : 0;
    const isActive = Boolean(entry.isActive);
    if (!isActive && amount === 0) return [];
    return [{ locationId: entry.locationId, amount, isActive }];
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const items = await prisma.menuItem.findMany({
      include: menuItemInclude,
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.warn("[admin] Using local preview menu items", error);
    const locations = previewLocations.map(({ id, name }) => ({ id, name }));
    const items = previewMenuCategories.flatMap((category) => {
      const { items: categoryItems, ...categorySummary } = category;
      return categoryItems.map((item) => ({
        ...item,
        categories: [categorySummary],
        locations,
        variants: [],
        modifiers: [],
        exclusions: [],
        plasticSurcharges: [],
      }));
    });

    return NextResponse.json(items);
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, nameNl, description, descriptionNl, shortDescription, shortDescriptionNl, price, salePrice, taxClass, imageUrl, imageUrls, isAvailable, isDineInOnly, categoryIds, locationIds, sortOrder, dietaryTags, isSpicy } = body;
  const plasticSurcharges = normalizePlasticSurcharges(body.plasticSurcharges);

  if (!name || !price || !categoryIds || categoryIds.length === 0 || !locationIds || locationIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      name,
      nameNl: nameNl || null,
      description: description || null,
      descriptionNl: descriptionNl || null,
      shortDescription: shortDescription || null,
      shortDescriptionNl: shortDescriptionNl || null,
      price,
      salePrice: salePrice || null,
      taxClass: taxClass || "standard",
      imageUrl: imageUrl || null,
      imageUrls: imageUrls || [],
      isAvailable,
      isDineInOnly: isDineInOnly || false,
      sortOrder: sortOrder || 0,
      dietaryTags: dietaryTags || [],
      isSpicy: isSpicy || false,
      categories: { connect: categoryIds.map((id: string) => ({ id })) },
      locations: { connect: locationIds.map((id: string) => ({ id })) },
      plasticSurcharges: {
        create: plasticSurcharges.map((surcharge) => ({
          locationId: surcharge.locationId,
          amount: surcharge.amount,
          isActive: surcharge.isActive,
        })),
      },
    },
    include: menuItemInclude,
  });
  return NextResponse.json(item);
}
