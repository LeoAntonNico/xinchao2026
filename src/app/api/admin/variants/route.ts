import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, nameNl, price, menuItemId, sortOrder } = body;
  if (!name || !menuItemId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const variant = await prisma.productVariant.create({
    data: { name, nameNl: nameNl ?? null, price: price ?? 0, menuItemId, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(variant);
}
