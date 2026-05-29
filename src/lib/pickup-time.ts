import { prisma } from "@/lib/prisma";

const PICKUP_LEAD_TIME_MINUTES = 30;
const PICKUP_SLOT_INTERVAL_MINUTES = 15;

function parseTimeToMinutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatMinutesAsTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function roundUpToInterval(minutes: number) {
  return Math.ceil(minutes / PICKUP_SLOT_INTERVAL_MINUTES) * PICKUP_SLOT_INTERVAL_MINUTES;
}

function getAmsterdamNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function dateKeyToDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function slotDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function findNextPickupTime(args: {
  openTime: string;
  closeTime: string;
  paidAt: Date;
}) {
  const openMinutes = parseTimeToMinutes(args.openTime);
  const closeMinutes = parseTimeToMinutes(args.closeTime);
  if (openMinutes === null || closeMinutes === null || closeMinutes < openMinutes) return null;

  const amsterdamNow = getAmsterdamNow(args.paidAt);
  const earliestToday = roundUpToInterval(amsterdamNow.minutes + PICKUP_LEAD_TIME_MINUTES);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const date = addDays(amsterdamNow.date, dayOffset);
    const earliestForDay = dayOffset === 0 ? earliestToday : openMinutes;
    const candidateMinutes = Math.max(openMinutes, earliestForDay);

    if (candidateMinutes <= closeMinutes) {
      return {
        date,
        time: formatMinutesAsTime(candidateMinutes),
      };
    }
  }

  return null;
}

function pickupTimeIsStillValid(args: {
  slotDate: Date;
  slotTime: string;
  paidAt: Date;
}) {
  const current = getAmsterdamNow(args.paidAt);
  const selectedDate = slotDateKey(args.slotDate);
  const selectedMinutes = parseTimeToMinutes(args.slotTime);
  if (selectedMinutes === null) return false;
  if (selectedDate > current.date) return true;
  if (selectedDate < current.date) return false;
  return selectedMinutes >= current.minutes + PICKUP_LEAD_TIME_MINUTES;
}

export async function ensurePickupSlotAfterPayment(orderId: string, paidAt = new Date()) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      location: { select: { id: true, openTime: true, closeTime: true } },
      pickupSlot: { select: { id: true, date: true, time: true, capacity: true } },
    },
  });

  if (!order?.location || !order.pickupSlot) {
    return null;
  }

  if (pickupTimeIsStillValid({
    slotDate: order.pickupSlot.date,
    slotTime: order.pickupSlot.time,
    paidAt,
  })) {
    return {
      changed: false,
      pickupSlot: order.pickupSlot,
    };
  }

  const nextPickup = findNextPickupTime({
    openTime: order.location.openTime,
    closeTime: order.location.closeTime,
    paidAt,
  });

  if (!nextPickup) {
    return {
      changed: false,
      pickupSlot: order.pickupSlot,
    };
  }

  const pickupSlot = await prisma.pickupSlot.upsert({
    where: {
      locationId_date_time: {
        locationId: order.location.id,
        date: dateKeyToDate(nextPickup.date),
        time: nextPickup.time,
      },
    },
    update: {},
    create: {
      locationId: order.location.id,
      date: dateKeyToDate(nextPickup.date),
      time: nextPickup.time,
      capacity: order.pickupSlot.capacity || 50,
    },
    select: { id: true, date: true, time: true, capacity: true },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { pickupSlotId: pickupSlot.id },
  });

  return {
    changed: true,
    pickupSlot,
  };
}
