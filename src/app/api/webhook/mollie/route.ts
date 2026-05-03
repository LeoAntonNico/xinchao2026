
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/mollie";
import { sendOrderPaidEmail } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const paymentId = params.get("id");

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const payment = await getPayment(paymentId);
    const orderId = (payment.metadata as Record<string, unknown> | undefined)?.orderId as string | undefined;

    if (!orderId) {
      return NextResponse.json({ error: "No orderId in metadata" }, { status: 400 });
    }

    const status = payment.status;
    let orderStatus: "PENDING" | "PAID" | "CANCELLED" = "PENDING";

    if (status === "paid") orderStatus = "PAID";
    else if (status === "canceled" || status === "expired" || status === "failed") orderStatus = "CANCELLED";

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        paidAt: orderStatus === "PAID" ? new Date() : undefined,
      },
      include: { location: true, pickupSlot: true, items: { include: { menuItem: true } } },
    });

    if (orderStatus === "PAID" && order.customerEmail) {
      await sendOrderPaidEmail({
        to: order.customerEmail,
        orderId: order.id,
        customerName: order.customerName,
        total: order.totalAmount / 100,
        items: order.items.map((i) => ({ name: i.menuItem.name, qty: i.quantity })),
        location: order.location.name,
        pickupDate: new Date(order.pickupSlot.date).toLocaleDateString("en-GB"),
        pickupTime: order.pickupSlot.time,
      }).catch(console.error);
    }

    return NextResponse.json({ status: "ok" });
  } catch (e: unknown) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
