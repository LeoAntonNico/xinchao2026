import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { categories: true, locations: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, description, price, imageUrl, isAvailable, categoryIds, locationIds, sortOrder } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = price;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (isAvailable !== undefined) data.isAvailable = isAvailable;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (categoryIds !== undefined) {
    data.categories = { set: categoryIds.map((id: string) => ({ id })) };
  }
  if (locationIds !== undefined) {
    data.locations = { set: locationIds.map((id: string) => ({ id })) };
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data,
    include: { categories: true, locations: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
