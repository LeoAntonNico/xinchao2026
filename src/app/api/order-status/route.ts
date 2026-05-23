import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/mollie";
import { ensurePrintJobForOrder } from "@/lib/print-jobs";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      location: { select: { name: true } },
      pickupSlot: { select: { date: true, time: true } },
      items: { include: { menuItem: { select: { name: true, shortDescription: true, shortDescriptionNl: true, imageUrl: true, imageUrls: true } } } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Confirm successful payments without requiring manual status changes in admin.
  if (order.molliePaymentId && (order.status === "PENDING" || order.status === "PAID")) {
    try {
      const payment = await getPayment(order.molliePaymentId);
      if (payment.status === "paid") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "COMPLETED", paidAt: new Date() },
        });
        order.status = "COMPLETED";
      } else if (["canceled", "expired", "failed"].includes(payment.status)) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        order.status = "CANCELLED";
      }
    } catch {
      // ignore mollie fetch errors
    }
  }

  if (order.status === "COMPLETED") {
    ensurePrintJobForOrder(order.id).catch((err) => {
      console.error("[Order Status] Print queue failed:", err);
    });
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    molliePaymentId: order.molliePaymentId,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      name: i.menuItem.name,
      shortDescription: i.menuItem.shortDescription,
      shortDescriptionNl: i.menuItem.shortDescriptionNl,
      quantity: i.quantity,
      price: i.price,
      imageUrl: i.menuItem.imageUrl,
      imageUrls: i.menuItem.imageUrls,
      variantName: i.variantName,
      modifierNames: i.modifierNames,
      exclusionNames: i.exclusionNames,
    })),
    location: order.location,
    pickupSlot: order.pickupSlot,
  });
}
