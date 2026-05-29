import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/mollie";
import { sendOrderPendingEmail } from "@/lib/notifications";
import { orderNumberPrefix } from "@/lib/order-number";

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

const PICKUP_LEAD_TIME_MINUTES = 30;

function getAmsterdamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function parseTimeToMinutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function validatePickupLeadTime(date: Date, time: string) {
  const amsterdamNow = getAmsterdamNow();
  const pickupDate = date.toISOString().split("T")[0];
  const pickupMinutes = parseTimeToMinutes(time);

  if (pickupMinutes === null) return "Invalid pickup time";
  if (pickupDate < amsterdamNow.date) return "Pickup time is no longer available";
  if (pickupDate === amsterdamNow.date && pickupMinutes < amsterdamNow.minutes + PICKUP_LEAD_TIME_MINUTES) {
    return "Pickup time must be at least 30 minutes from now";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, locationSlug, slot, pickupDate, pickupTime, name, phone, email, notes, customerId } = body;
    let locationId = body.locationId as string | undefined;
    if (locationId) {
      const locationExists = await prisma.location.findUnique({ where: { id: locationId }, select: { id: true } });
      if (!locationExists) {
        const locationBySlug = await prisma.location.findUnique({ where: { slug: locationId }, select: { id: true } });
        locationId = locationBySlug?.id;
      }
    }
    if (!locationId && locationSlug) {
      const locationBySlug = await prisma.location.findUnique({ where: { slug: locationSlug }, select: { id: true } });
      locationId = locationBySlug?.id;
    }
    let slotId = slot as string | undefined;
    let selectedSlot: { id: string; date: Date; time: string } | null = null;
    if (slotId) {
      selectedSlot = await prisma.pickupSlot.findUnique({ where: { id: slotId }, select: { id: true, date: true, time: true } });
      if (!selectedSlot) slotId = undefined;
    }
    if (!slotId && locationId && pickupDate && pickupTime) {
      const pickupDateValue = new Date(`${pickupDate}T00:00:00`);
      const pickupLeadTimeError = validatePickupLeadTime(pickupDateValue, pickupTime);
      if (pickupLeadTimeError) {
        return NextResponse.json({ error: pickupLeadTimeError }, { status: 400 });
      }
      const slotRecord = await prisma.pickupSlot.upsert({
        where: {
          locationId_date_time: {
            locationId,
            date: pickupDateValue,
            time: pickupTime,
          },
        },
        update: {},
        create: {
          locationId,
          date: pickupDateValue,
          time: pickupTime,
          capacity: 50,
        },
        select: { id: true, date: true, time: true },
      });
      slotId = slotRecord.id;
      selectedSlot = slotRecord;
    }
    if (!locationId || !slotId) {
      return NextResponse.json({ error: "Missing location or pickup time" }, { status: 400 });
    }
    if (selectedSlot) {
      const pickupLeadTimeError = validatePickupLeadTime(selectedSlot.date, selectedSlot.time);
      if (pickupLeadTimeError) {
        return NextResponse.json({ error: pickupLeadTimeError }, { status: 400 });
      }
    }

    const itemIds = (items as OrderItemInput[]).map((item) => item.menuItemId);
    const dineInOnlyItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds }, isDineInOnly: true },
      select: { name: true },
    });
    if (dineInOnlyItems.length > 0) {
      return NextResponse.json(
        {
          error: `${dineInOnlyItems.map((item) => item.name).join(", ")} ${
            dineInOnlyItems.length === 1 ? "is" : "are"
          } available as dine-in only`,
        },
        { status: 400 }
      );
    }

    const total = items.reduce(
      (sum: number, i: OrderItemInput) => sum + i.price * i.quantity,
      0
    );

    const resolvedLocationId = locationId;
    const order = await prisma.$transaction(async (tx) => {
      const sequence = await tx.location.update({
        where: { id: resolvedLocationId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { slug: true, nextOrderNumber: true },
      });

      return tx.order.create({
        data: {
          orderNumber: `${orderNumberPrefix(sequence.slug)}-${sequence.nextOrderNumber}`,
          totalAmount: total,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || null,
          notes: notes || null,
          customerId: customerId || null,
          locationId: resolvedLocationId,
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
    });

    const requestOrigin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestOrigin;
    const configuredWebhookUrl = process.env.MOLLIE_WEBHOOK_URL;
    const webhookUrl =
      configuredWebhookUrl ||
      (baseUrl.startsWith("https://") && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")
        ? `${baseUrl}/api/webhook/mollie`
        : undefined);
    const payment = await createPayment({
      amount: total,
      description: `Order ${order.orderNumber || order.id}`,
      redirectUrl: `${baseUrl}/en/order/confirmation?orderId=${order.id}`,
      webhookUrl,
      metadata: { orderId: order.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { molliePaymentId: payment.id },
    });

    // Fetch related info for email
    const [location, pickupSlot] = await Promise.all([
      prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }),
      prisma.pickupSlot.findUnique({ where: { id: slotId }, select: { date: true, time: true } }),
    ]);
    const itemNames = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i: OrderItemInput) => i.menuItemId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(itemNames.map((m) => [m.id, m.name]));

    if (email && pickupSlot && location) {
      await sendOrderPendingEmail({
        to: email,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: name,
        total: total / 100,
        items: items.map((i: OrderItemInput) => ({ name: nameMap[i.menuItemId] ?? "Item", qty: i.quantity })),
        location: location.name,
        pickupDate: new Date(pickupSlot.date).toLocaleDateString("en-GB"),
        pickupTime: pickupSlot.time,
        paymentUrl: payment.getCheckoutUrl()!,
      }).catch(console.error);
    }

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Unknown error";
    if (/authorization header|api key|mollie|payment/i.test(message)) {
      return NextResponse.json({ error: "Payment could not be started" }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
