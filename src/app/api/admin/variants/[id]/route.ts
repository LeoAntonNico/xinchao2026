import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, nameNl, price, sortOrder } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameNl !== undefined) data.nameNl = nameNl;
  if (price !== undefined) data.price = price;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const variant = await prisma.productVariant.update({ where: { id }, data });
  return NextResponse.json(variant);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.productVariant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
