import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const days = parseInt(searchParams.get("days") || "7", 10);

  if (!locationId) return NextResponse.json({ error: "No location" }, { status: 400 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + days);

  const slots = await prisma.pickupSlot.findMany({
    where: {
      locationId,
      date: { gte: today, lt: end },
      booked: { lt: prisma.pickupSlot.fields.capacity },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true, date: true, time: true, capacity: true, booked: true },
  });

  return NextResponse.json(slots);
}
