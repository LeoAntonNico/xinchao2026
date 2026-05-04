import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    include: { category: true, locations: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, price, imageUrl, isAvailable, categoryId, locationIds, sortOrder } = body;

  if (!name || !price || !categoryId || !locationIds || locationIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description || null,
      price,
      imageUrl,
      isAvailable,
      categoryId,
      sortOrder,
      locations: { connect: locationIds.map((id: string) => ({ id })) },
    },
    include: { category: true, locations: true },
  });
  return NextResponse.json(item);
}
