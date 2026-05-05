import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { categories: true, locations: true, variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const fields = ["name","nameNl","description","descriptionNl","shortDescription","shortDescriptionNl","price","salePrice","taxClass","imageUrl","imageUrls","isAvailable","sortOrder","dietaryTags","isSpicy","categoryIds","locationIds"];

  const data: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] !== undefined) {
      if (f === "categoryIds") data.categories = { set: body[f].map((id: string) => ({ id })) };
      else if (f === "locationIds") data.locations = { set: body[f].map((id: string) => ({ id })) };
      else data[f] = body[f];
    }
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data,
    include: { categories: true, locations: true, variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
