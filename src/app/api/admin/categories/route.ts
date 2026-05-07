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
