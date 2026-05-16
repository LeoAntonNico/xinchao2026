import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/* ─── GET ─── */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const menuItemId = searchParams.get("menuItemId");
  if (!menuItemId) return NextResponse.json({ error: "Missing menuItemId" }, { status: 400 });

  const exclusions = await prisma.productExclusion.findMany({
    where: { menuItemId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(exclusions);
}

/* ─── POST ─── */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { menuItemId, name, nameNl } = body;
  if (!menuItemId || !name) return NextResponse.json({ error: "menuItemId and name are required" }, { status: 400 });

  const max = await prisma.productExclusion.findFirst({
    where: { menuItemId },
    orderBy: { sortOrder: "desc" },
  });

  const exclusion = await prisma.productExclusion.create({
    data: { menuItemId, name, nameNl: nameNl || null, sortOrder: (max?.sortOrder ?? -1) + 1 },
  });

  return NextResponse.json(exclusion, { status: 201 });
}

/* ─── PATCH bulk reorder ─── */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { order } = body;
  if (!Array.isArray(order)) return NextResponse.json({ error: "order must be an array" }, { status: 400 });

  await Promise.all(
    order.map((id, idx) =>
      prisma.productExclusion.update({ where: { id }, data: { sortOrder: idx } })
    )
  );

  return NextResponse.json({ success: true });
}
