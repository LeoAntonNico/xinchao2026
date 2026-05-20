import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { previewMenuCategories } from "@/lib/local-preview-data";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const categories = await prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json(categories);
  } catch (error) {
    console.warn("[admin] Using local preview categories", error);
    return NextResponse.json(
      previewMenuCategories.map(({ items: _items, ...category }) => category)
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, slug, sortOrder } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    let generatedSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!generatedSlug) {
      generatedSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    }
    if (!generatedSlug) {
      generatedSlug = crypto.randomUUID().slice(0, 8); // fallback for fully non-ASCII names
    }

    // Handle duplicate slug by appending a random suffix
    let finalSlug = generatedSlug;
    let attempts = 0;
    while (attempts++ < 10) {
      const existing = await prisma.menuCategory.findUnique({ where: { slug: finalSlug }, select: { id: true } });
      if (!existing) break;
      finalSlug = `${generatedSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const item = await prisma.menuCategory.create({
      data: { name, slug: finalSlug, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json(item);
  } catch (e: unknown) {
    console.error("Category POST error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { order } = body;
    if (!Array.isArray(order)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

    await prisma.$transaction(
      order.map((id: string, index: number) =>
        prisma.menuCategory.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("Category reorder error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
