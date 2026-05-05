import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, slug, sortOrder } = body;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const item = await prisma.menuCategory.create({
    data: { name, slug: generatedSlug, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const count = await prisma.menuItem.count({ where: { categories: { some: { id } } } });
  if (count > 0) return NextResponse.json({ error: "Category has items" }, { status: 400 });

  await prisma.menuCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
