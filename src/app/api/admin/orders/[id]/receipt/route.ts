import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReceiptFromOrder, formatReceiptText } from "@/lib/receipt-formatter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      location: true,
      pickupSlot: true,
      items: {
        include: {
          menuItem: { select: { name: true, nameNl: true } },
        },
      },
    },
  });

  if (!order || !order.location) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const receipt = buildReceiptFromOrder(order, order.location, order.pickupSlot?.time);

  return NextResponse.json({
    orderId: order.orderNumber || order.id.slice(-8).toUpperCase(),
    receipt,
    text: formatReceiptText(receipt),
  });
}
