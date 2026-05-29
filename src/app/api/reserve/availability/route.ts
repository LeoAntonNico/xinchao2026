
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const dateStr = searchParams.get("date");

  if (!locationId || !dateStr) {
    return NextResponse.json({ error: "Missing locationId or date" }, { status: 400 });
  }

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { capacity: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const daySetting = await prisma.reservationDaySetting.findUnique({
    where: {
      locationId_date: {
        locationId,
        date,
      },
    },
    select: { reservationsEnabled: true },
  });

  const reservations = await prisma.reservation.groupBy({
    by: ["time"],
    where: {
      locationId,
      date,
      status: { not: "CANCELLED" },
    },
    _sum: { partySize: true },
  });

  const availability: Record<string, number> = {};
  for (const r of reservations) {
    availability[r.time] = location.capacity - (r._sum.partySize || 0);
  }

  return NextResponse.json({
    capacity: location.capacity,
    availability,
    reservationsEnabled: daySetting?.reservationsEnabled ?? true,
  });
}
