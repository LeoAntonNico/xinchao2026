import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      openTime: true,
      closeTime: true,
    },
  });
  return NextResponse.json(locations);
}
