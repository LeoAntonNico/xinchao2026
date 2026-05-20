import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewMenuCategories } from "@/lib/local-preview-data";

export async function GET() {
  const items = await prisma.menuItem.findMany({
    select: {
      id: true,
      imageUrl: true,
      imageUrls: true,
    },
  }).catch(() =>
    previewMenuCategories.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        imageUrls: item.imageUrls,
      }))
    )
  );

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrls?.[0] || item.imageUrl || null,
    }))
  );
}
