
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendReservationEmail } from "@/lib/notifications";
import { createReservationEditToken, verifyReservationEditToken } from "@/lib/reservation-edit-token";

function parseTimeToMinutes(time: unknown) {
  if (typeof time !== "string") return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

async function findLocation(locationId: string) {
  return prisma.location.findUnique({
    where: { id: locationId },
    select: {
      capacity: true,
      name: true,
      slug: true,
      address: true,
      email: true,
      phone: true,
      openTime: true,
      closeTime: true,
    },
  });
}

async function checkReservationAvailability(input: {
  locationId: string;
  date: string;
  time: string;
  party: number;
  excludeReservationId?: string;
}) {
  const location = await findLocation(input.locationId);
  if (!location) {
    return { error: NextResponse.json({ error: "Location not found" }, { status: 404 }) };
  }

  const reservationMinutes = parseTimeToMinutes(input.time);
  const openMinutes = parseTimeToMinutes(location.openTime);
  const closeMinutes = parseTimeToMinutes(location.closeTime);
  if (
    reservationMinutes === null ||
    openMinutes === null ||
    closeMinutes === null ||
    reservationMinutes < openMinutes ||
    reservationMinutes > closeMinutes - 30
  ) {
    return {
      error: NextResponse.json(
        { error: "Selected time is outside reservation hours" },
        { status: 400 }
      ),
    };
  }

  const daySetting = await prisma.reservationDaySetting.findUnique({
    where: {
      locationId_date: {
        locationId: input.locationId,
        date: new Date(input.date),
      },
    },
    select: { reservationsEnabled: true },
  });
  if (daySetting?.reservationsEnabled === false) {
    return {
      error: NextResponse.json(
        { error: "Sorry, we're fully booked today. We do accept walk-ins. We always keep a few tables open for the brave." },
        { status: 400 }
      ),
    };
  }

  const existing = await prisma.reservation.aggregate({
    where: {
      locationId: input.locationId,
      date: new Date(input.date),
      time: input.time,
      status: { not: "CANCELLED" },
      ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
    },
    _sum: { partySize: true },
  });
  const booked = existing._sum.partySize || 0;
  if (booked + input.party > location.capacity) {
    return {
      error: NextResponse.json(
        { error: `Only ${location.capacity - booked} seats available at this time` },
        { status: 400 }
      ),
    };
  }

  return { location };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const token = searchParams.get("token") || "";
  if (!id || !token || !verifyReservationEditToken(id, token)) {
    return NextResponse.json({ error: "This edit link is not valid." }, { status: 403 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!reservation || reservation.status === "CANCELLED") {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: reservation.id,
    name: reservation.customerName,
    phone: reservation.customerPhone,
    email: reservation.customerEmail || "",
    date: reservation.date.toISOString().split("T")[0],
    time: reservation.time,
    partySize: reservation.partySize,
    notes: reservation.notes || "",
    location: reservation.location,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, date, time, partySize, name, phone, email, notes } = body;
    const party = parseInt(`${partySize}`);
    const availability = await checkReservationAvailability({ locationId, date, time, party });
    if ("error" in availability) return availability.error;
    const location = availability.location;

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
        reservationId: reservation.id,
        customerName: name,
        customerPhone: phone,
        partySize: party,
        date,
        time,
        location: location.name,
        locationSlug: location.slug,
        restaurantAddress: location.address,
        restaurantEmail: location.email ?? "hello@xinchao.nl",
        restaurantPhone: location.phone,
        notes,
      }).catch(console.error);
    }

    return NextResponse.json({
      id: reservation.id,
      editToken: createReservationEditToken(reservation.id),
    });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Reservation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, token, locationId, date, time, partySize, name, phone, email, notes } = body;
    if (typeof id !== "string" || typeof token !== "string" || !verifyReservationEditToken(id, token)) {
      return NextResponse.json({ error: "This edit link is not valid." }, { status: 403 });
    }

    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current || current.status === "CANCELLED") {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }

    const party = parseInt(`${partySize}`);
    const availability = await checkReservationAvailability({
      locationId,
      date,
      time,
      party,
      excludeReservationId: id,
    });
    if ("error" in availability) return availability.error;
    const location = availability.location;

    const reservation = await prisma.reservation.update({
      where: { id },
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
        reservationId: reservation.id,
        customerName: name,
        customerPhone: phone,
        partySize: party,
        date,
        time,
        location: location.name,
        locationSlug: location.slug,
        restaurantAddress: location.address,
        restaurantEmail: location.email ?? "hello@xinchao.nl",
        restaurantPhone: location.phone,
        notes,
      }).catch(console.error);
    }

    return NextResponse.json({
      id: reservation.id,
      editToken: createReservationEditToken(reservation.id),
    });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Reservation update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
