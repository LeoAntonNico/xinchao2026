import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.reservation.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

const validStatuses = ["CONFIRMED", "SEATED", "CANCELLED", "NO_SHOW"];

export async function PATCH(
  request: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // If only status change, quick update
  if (body.status && Object.keys(body).length === 1) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(reservation);
  }

  // Full update
  const { customerName, customerPhone, customerEmail, locationId, date, time, partySize, notes, status } = body;
  const party = parseInt(`${partySize}`);

  // Get current reservation to compare date/time change
  const current = await prisma.reservation.findUnique({
    where: { id },
    select: { date: true, time: true, locationId: true, partySize: true },
  });

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateChanged = date && current.date.toISOString().split("T")[0] !== date;
  const timeChanged = time && current.time !== time;
  const locationChanged = locationId && current.locationId !== locationId;
  const partyChanged = partySize && current.partySize !== party;

  // Re-check capacity if date/time/location/party changed
  if (dateChanged || timeChanged || locationChanged || partyChanged) {
    const checkLocationId = locationId || current.locationId;
    const checkDate = date || current.date.toISOString().split("T")[0];
    const checkTime = time || current.time;

    const existing = await prisma.reservation.aggregate({
      where: {
        locationId: checkLocationId,
        date: new Date(checkDate),
        time: checkTime,
        status: { not: "CANCELLED" },
        id: { not: id }, // exclude current reservation
      },
      _sum: { partySize: true },
    });

    const location = await prisma.location.findUnique({
      where: { id: checkLocationId },
      select: { capacity: true },
    });

    if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

    const totalParty = partyChanged ? party : current.partySize;
    const booked = existing._sum.partySize || 0;
    if (booked + totalParty > location.capacity) {
      return NextResponse.json(
        { error: `Only ${location.capacity - booked} seats available at this time` },
        { status: 400 }
      );
    }
  }

  const updateData: any = {};
  if (customerName !== undefined) updateData.customerName = customerName;
  if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
  if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
  if (locationId) updateData.locationId = locationId;
  if (date) updateData.date = new Date(date);
  if (time) updateData.time = time;
  if (partySize) updateData.partySize = party;
  if (notes !== undefined) updateData.notes = notes || null;
  if (status && validStatuses.includes(status)) updateData.status = status;

  const reservation = await prisma.reservation.update({
    where: { id },
    data: updateData,
    include: { location: true },
  });

  return NextResponse.json(reservation);
}

export async function DELETE(
  request: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.reservation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
