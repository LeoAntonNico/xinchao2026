import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewLocations } from "@/lib/local-preview-data";

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
  }).catch(() => previewLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    address: loc.address,
    openTime: loc.openTime,
    closeTime: loc.closeTime,
  })));
  return NextResponse.json(locations);
}
