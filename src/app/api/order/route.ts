import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/mollie";
import { Prisma } from "@prisma/client";

interface OrderItemInput {
  price: number;
  quantity: number;
  menuItemId: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, locationId, slot: slotId, name, phone, email, notes } = body;
    const total = items.reduce(
      (sum: number, i: OrderItemInput) => sum + i.price * i.quantity,
      0
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const slot = await tx.pickupSlot.update({
        where: { id: slotId },
        data: { booked: { increment: 1 } },
      });
      if (slot.booked > slot.capacity) {
        throw new Error("Slot full");
      }
    });

    const order = await prisma.order.create({
      data: {
        totalAmount: total,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        notes: notes || null,
        locationId,
        pickupSlotId: slotId,
        items: {
          create: (items as OrderItemInput[]).map((i) => ({
            quantity: i.quantity,
            price: i.price,
            menuItemId: i.menuItemId,
          })),
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const payment = await createPayment({
      amount: total,
      description: `Order ${order.id}`,
      redirectUrl: `${baseUrl}/en/order/confirmation?orderId=${order.id}`,
      metadata: { orderId: order.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { molliePaymentId: payment.id },
    });

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
