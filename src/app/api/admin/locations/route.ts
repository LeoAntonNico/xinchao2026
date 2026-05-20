import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { previewLocations } from "@/lib/local-preview-data";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(locations);
  } catch (error) {
    console.warn("[admin] Using local preview locations", error);
    return NextResponse.json(previewLocations.map(({ id, name }) => ({ id, name })));
  }
}
