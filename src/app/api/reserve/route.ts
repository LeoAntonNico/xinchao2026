
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendReservationEmail } from "@/lib/notifications";

function parseTimeToMinutes(time: unknown) {
  if (typeof time !== "string") return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, date, time, partySize, name, phone, email, notes } = body;
    const party = parseInt(`${partySize}`);

    // Check total covers for this location + date + time
    const existing = await prisma.reservation.aggregate({
      where: {
        locationId,
        date: new Date(date),
        time,
        status: { not: "CANCELLED" },
      },
      _sum: { partySize: true },
    });

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { capacity: true, name: true, phone: true, openTime: true, closeTime: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const reservationMinutes = parseTimeToMinutes(time);
    const openMinutes = parseTimeToMinutes(location.openTime);
    const closeMinutes = parseTimeToMinutes(location.closeTime);
    if (
      reservationMinutes === null ||
      openMinutes === null ||
      closeMinutes === null ||
      reservationMinutes < openMinutes ||
      reservationMinutes > closeMinutes - 30
    ) {
      return NextResponse.json(
        { error: "Selected time is outside reservation hours" },
        { status: 400 }
      );
    }

    const booked = existing._sum.partySize || 0;
    if (booked + party > location.capacity) {
      return NextResponse.json(
        { error: `Only ${location.capacity - booked} seats available at this time` },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.create({
      data: {
        date: new Date(date),
        time,
        partySize: party,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        notes: notes || null,
        locationId,
      },
    });

    if (email) {
      await sendReservationEmail({
        to: email,
        customerName: name,
        partySize: party,
        date: new Date(date).toLocaleDateString("en-GB"),
        time,
        location: location?.name ?? "",
        restaurantPhone: location?.phone ?? "",
      }).catch(console.error);
    }

    return NextResponse.json({ id: reservation.id });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Reservation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
