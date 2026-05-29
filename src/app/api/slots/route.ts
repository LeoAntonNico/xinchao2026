import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewLocations } from "@/lib/local-preview-data";

const PICKUP_LEAD_TIME_MINUTES = 30;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getAmsterdamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function previewTimes(locationId: string, minimumMinutes = Number.NEGATIVE_INFINITY) {
  const location = previewLocations.find((loc) => loc.id === locationId);
  const openMinutes = parseTime(location?.openTime ?? "12:00");
  const closeMinutes = parseTime(location?.closeTime ?? "20:00");
  const times: string[] = [];

  for (let minutes = openMinutes; minutes <= closeMinutes; minutes += 15) {
    if (minutes >= minimumMinutes) times.push(formatTime(minutes));
  }

  return times;
}

function previewSlots(locationId: string, days: number) {
  const amsterdamNow = getAmsterdamNow();
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }).flatMap((_, dayIndex) => {
    const date = new Date(today);
    date.setDate(today.getDate() + dayIndex);
    const dateStr = formatLocalDate(date);
    const minimumMinutes =
      dateStr === amsterdamNow.date ? amsterdamNow.minutes + PICKUP_LEAD_TIME_MINUTES : Number.NEGATIVE_INFINITY;
    const times = previewTimes(locationId, minimumMinutes);

    return times.map((time) => ({
      id: `preview-slot-${dateStr}-${time.replace(":", "")}`,
      date: dateStr,
      time,
    }));
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const days = parseInt(searchParams.get("days") || "7", 10);

  if (!locationId) return NextResponse.json({ error: "No location" }, { status: 400 });

  const amsterdamNow = getAmsterdamNow();
  const today = new Date(`${amsterdamNow.date}T00:00:00`);
  const end = new Date(today);
  end.setDate(today.getDate() + days);

  const slotsRaw: { id: string; date: Date; time: string; capacity: number; booked: number }[] = await prisma.pickupSlot.findMany({
    where: { locationId, date: { gte: today, lt: end } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: { id: true, date: true, time: true, capacity: true, booked: true },
  }).catch(() => []);

  if (slotsRaw.length === 0 && locationId.startsWith("preview-")) {
    return NextResponse.json(previewSlots(locationId, days));
  }

  const slots = slotsRaw
    .map((s) => ({
      id: s.id,
      date: s.date.toISOString().split("T")[0], // YYYY-MM-DD
      time: s.time,
    }))
    .filter((slot) => {
      if (slot.date !== amsterdamNow.date) return true;
      return parseTime(slot.time) >= amsterdamNow.minutes + PICKUP_LEAD_TIME_MINUTES;
    });

  return NextResponse.json(slots);
}
