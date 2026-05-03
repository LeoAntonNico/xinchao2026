import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/mollie";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, locationId, slot: slotId, name, phone, email, notes } = body;
    const total = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    await prisma.$transaction(async (tx) => {
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
          create: items.map((i: any) => ({
            quantity: i.quantity,
            price: i.price,
            menuItemId: i.menuItemId,
          })),
        },
      },
    });

    const payment = await createPayment(
      total,
      order.id,
      `${process.env.NEXTAUTH_URL}/order/confirmation`
    );

    await prisma.order.update({
      where: { id: order.id },
      data: { molliePaymentId: payment.id },
    });

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
