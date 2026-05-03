import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, date, time, partySize, name, phone, email, notes } = body;

    const reservation = await prisma.reservation.create({
      data: {
        date: new Date(date),
        time,
        partySize: parseInt(partySize),
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        notes: notes || null,
        locationId,
      },
    });

    return NextResponse.json({ id: reservation.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
