
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/mollie";

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

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: orderStatus,
        paidAt: orderStatus === "PAID" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (e: unknown) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
