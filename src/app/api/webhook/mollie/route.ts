import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/mollie";
import { sendOrderPaidEmail } from "@/lib/notifications";
import { ensurePrintJobForOrder } from "@/lib/print-jobs";

export async function POST(req: Request) {
  try {
    // Mollie sends webhooks as application/x-www-form-urlencoded
    const text = await req.text();
    const params = new URLSearchParams(text);
    const paymentId = params.get("id");

    if (!paymentId) {
      console.error("[Mollie Webhook] Missing payment id");
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    console.log("[Mollie Webhook] Received for payment:", paymentId);

    // Fetch payment status from Mollie
    const payment = await getPayment(paymentId);
    const status = payment.status;

    console.log("[Mollie Webhook] Payment status:", status);

    // Find order by Mollie payment ID
    const order = await prisma.order.findFirst({
      where: { molliePaymentId: paymentId },
      include: {
        location: { select: { name: true, slug: true } },
        pickupSlot: { select: { date: true, time: true } },
        items: {
          include: {
            menuItem: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      console.error("[Mollie Webhook] Order not found for payment:", paymentId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order based on payment status
    if (status === "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", paidAt: new Date() },
      });

      // Send confirmation email
      if (order.customerEmail && order.location && order.pickupSlot) {
        await sendOrderPaidEmail({
          to: order.customerEmail,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.totalAmount / 100,
          items: order.items.map((i) => ({
            name: i.menuItem.name,
            qty: i.quantity,
            unitPrice: i.price / 100,
            variantName: i.variantName,
            modifierNames: i.modifierNames,
            exclusionNames: i.exclusionNames,
          })),
          location: order.location.name,
          locationSlug: order.location.slug,
          pickupDate: new Date(order.pickupSlot.date).toLocaleDateString("en-GB"),
          pickupTime: order.pickupSlot.time,
        }).catch((err) => console.error("[Mollie Webhook] Email failed:", err));
      }

      // Queue print job for the branch printer
      try {
        const result = await ensurePrintJobForOrder(order.id);
        console.log("[Mollie Webhook] Print queued:", result.jobId, result.status);
      } catch (err) {
        console.error("[Mollie Webhook] Print queue failed:", err);
      }
    } else if (status === "canceled" || status === "failed" || status === "expired") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
    }

    // Always return 200 so Mollie stops retrying
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[Mollie Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
