
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
      select: { capacity: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
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

    return NextResponse.json({ id: reservation.id });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Reservation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
