import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const menuItemInclude = {
  categories: true,
  locations: true,
  plasticSurcharges: true,
  variants: { orderBy: { sortOrder: "asc" as const } },
  modifiers: { orderBy: { sortOrder: "asc" as const } },
  exclusions: { orderBy: { sortOrder: "asc" as const } },
};

type PlasticSurchargeInput = {
  locationId?: string;
  amount?: number;
  isActive?: boolean;
};

function normalizePlasticSurcharges(input: unknown): Array<{ locationId: string; amount: number; isActive: boolean }> {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry: PlasticSurchargeInput) => {
    if (!entry?.locationId) return [];
    const amount = Number.isFinite(entry.amount) ? Math.max(0, Math.round(Number(entry.amount))) : 0;
    const isActive = Boolean(entry.isActive);
    if (!isActive && amount === 0) return [];
    return [{ locationId: entry.locationId, amount, isActive }];
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: menuItemInclude,
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const fields = ["name","nameNl","description","descriptionNl","shortDescription","shortDescriptionNl","price","salePrice","taxClass","imageUrl","imageUrls","isAvailable","isDineInOnly","sortOrder","dietaryTags","isSpicy","categoryIds","locationIds"];

  const data: Record<string, unknown> = {};
  for (const f of fields) {
    if (body[f] !== undefined) {
      if (f === "categoryIds") data.categories = { set: body[f].map((id: string) => ({ id })) };
      else if (f === "locationIds") data.locations = { set: body[f].map((id: string) => ({ id })) };
      else data[f] = body[f];
    }
  }
  if (body.plasticSurcharges !== undefined) {
    const plasticSurcharges = normalizePlasticSurcharges(body.plasticSurcharges);
    data.plasticSurcharges = {
      deleteMany: {},
      create: plasticSurcharges.map((surcharge) => ({
        locationId: surcharge.locationId,
        amount: surcharge.amount,
        isActive: surcharge.isActive,
      })),
    };
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data,
    include: menuItemInclude,
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
