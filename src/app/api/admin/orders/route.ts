import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      location: { select: { id: true, name: true } },
      pickupSlot: { select: { date: true, time: true } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
    take: 50,
  });

  return NextResponse.json(orders);
}
