import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.menuItem.findMany({
    include: { categories: true, locations: true, variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } }, exclusions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, nameNl, description, descriptionNl, shortDescription, shortDescriptionNl, price, salePrice, taxClass, imageUrl, imageUrls, isAvailable, isDineInOnly, categoryIds, locationIds, sortOrder, dietaryTags, isSpicy } = body;

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
    },
    include: { categories: true, locations: true, variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } }, exclusions: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(item);
}
