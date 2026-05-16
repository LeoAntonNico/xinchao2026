import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─── PATCH rename ─── */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, nameNl, sortOrder } = body;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (nameNl !== undefined) data.nameNl = nameNl;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const exclusion = await prisma.productExclusion.update({
    where: { id },
    data,
  });

  return NextResponse.json(exclusion);
}

/* ─── DELETE ─── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.productExclusion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
