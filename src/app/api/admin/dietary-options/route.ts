import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET - list all dietary options
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const options = await prisma.dietaryOption.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(options);
}

// POST - create new dietary option
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { slug, nameEn, nameNl, iconUrl, sortOrder } = body;

    if (!slug || !nameEn || !nameNl) {
      return NextResponse.json({ error: "slug, nameEn and nameNl required" }, { status: 400 });
    }

    const option = await prisma.dietaryOption.create({
      data: {
        slug,
        nameEn,
        nameNl: nameNl || nameEn,
        iconUrl: iconUrl || null,
        sortOrder: sortOrder ?? 0,
      },
    });
    return NextResponse.json(option);
  } catch (e: unknown) {
    console.error("DietaryOption POST error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Slug already exists. Choose a unique slug." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
