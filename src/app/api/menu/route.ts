import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  if (!locationId) return NextResponse.json({ error: "Missing locationId" }, { status: 400 });

  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: {
          locations: { some: { id: locationId } },
          isAvailable: true,
        },
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { sortOrder: "asc" } }, modifiers: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return NextResponse.json(categories);
}
