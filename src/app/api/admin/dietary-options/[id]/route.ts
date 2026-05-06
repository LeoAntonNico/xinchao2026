import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { nameEn, nameNl, iconUrl, sortOrder } = body;

    const data: Record<string, unknown> = {};
    if (nameEn !== undefined) data.nameEn = nameEn;
    if (nameNl !== undefined) data.nameNl = nameNl;
    if (iconUrl !== undefined) data.iconUrl = iconUrl;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const option = await prisma.dietaryOption.update({ where: { id }, data });
    return NextResponse.json(option);
  } catch (e: unknown) {
    console.error("DietaryOption PATCH error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("Record to update not found")) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.dietaryOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("DietaryOption DELETE error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
