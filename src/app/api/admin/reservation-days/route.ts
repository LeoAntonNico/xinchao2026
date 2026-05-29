import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function parseDateOnly(dateValue: unknown) {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  return new Date(`${dateValue}T00:00:00`);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.reservationDaySetting.findMany({
    orderBy: [{ date: "asc" }],
    select: {
      id: true,
      locationId: true,
      date: true,
      reservationsEnabled: true,
    },
  });

  return NextResponse.json(
    settings.map((setting) => ({
      ...setting,
      date: setting.date.toISOString().split("T")[0],
    }))
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const locationId = typeof body.locationId === "string" ? body.locationId : "";
  const date = parseDateOnly(body.date);
  const reservationsEnabled = Boolean(body.reservationsEnabled);

  if (!locationId || !date) {
    return NextResponse.json({ error: "Missing location or date" }, { status: 400 });
  }

  const setting = await prisma.reservationDaySetting.upsert({
    where: {
      locationId_date: {
        locationId,
        date,
      },
    },
    update: { reservationsEnabled },
    create: {
      locationId,
      date,
      reservationsEnabled,
    },
    select: {
      id: true,
      locationId: true,
      date: true,
      reservationsEnabled: true,
    },
  });

  return NextResponse.json({
    ...setting,
    date: setting.date.toISOString().split("T")[0],
  });
}
