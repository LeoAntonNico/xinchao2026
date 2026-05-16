import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/mollie";
import { sendOrderPendingEmail } from "@/lib/notifications";

interface OrderItemInput {
  price: number;
  quantity: number;
  menuItemId: string;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
  exclusionIds?: string[];
  exclusionNames?: string[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, locationId, slot: slotId, name, phone, email, notes, customerId } = body;
    const total = items.reduce(
      (sum: number, i: OrderItemInput) => sum + i.price * i.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        totalAmount: total,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        notes: notes || null,
        customerId: customerId || null,
        locationId,
        pickupSlotId: slotId,
        items: {
          create: (items as OrderItemInput[]).map((i) => ({
            quantity: i.quantity,
            price: i.price,
            menuItemId: i.menuItemId,
            variantId: i.variantId || null,
            variantName: i.variantName || null,
            modifierIds: i.modifierIds || [],
            modifierNames: i.modifierNames || [],
            exclusionIds: i.exclusionIds || [],
            exclusionNames: i.exclusionNames || [],
          })),
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const payment = await createPayment({
      amount: total,
      description: `Order ${order.id}`,
      redirectUrl: `${baseUrl}/en/order/confirmation?orderId=${order.id}`,
      webhookUrl: process.env.MOLLIE_WEBHOOK_URL || `${baseUrl}/api/webhook/mollie`,
      metadata: { orderId: order.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { molliePaymentId: payment.id },
    });

    // Fetch related info for email
    const [location, slot] = await Promise.all([
      prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }),
      prisma.pickupSlot.findUnique({ where: { id: slotId }, select: { date: true, time: true } }),
    ]);
    const itemNames = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i: OrderItemInput) => i.menuItemId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(itemNames.map((m) => [m.id, m.name]));

    if (email && slot && location) {
      await sendOrderPendingEmail({
        to: email,
        orderId: order.id,
        customerName: name,
        total: total / 100,
        items: items.map((i: OrderItemInput) => ({ name: nameMap[i.menuItemId] ?? "Item", qty: i.quantity })),
        location: location.name,
        pickupDate: new Date(slot.date).toLocaleDateString("en-GB"),
        pickupTime: slot.time,
        paymentUrl: payment.getCheckoutUrl()!,
      }).catch(console.error);
    }

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
