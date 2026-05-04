import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reservations = await prisma.reservation.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { location: true },
    take: 200,
  });
  return NextResponse.json(reservations);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { customerName, customerPhone, customerEmail, locationId, date, time, partySize, notes, status } = body;
  const party = parseInt(`${partySize}`);

  if (!customerName || !customerPhone || !locationId || !date || !time || !partySize) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check capacity (excluding CANCELLED)
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

  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

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
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      notes: notes || null,
      locationId,
      status: status || "CONFIRMED",
    },
    include: { location: true },
  });

  return NextResponse.json(reservation);
}
