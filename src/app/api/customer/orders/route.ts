import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key"
);

async function getCustomer(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 });
    if (!payload.id || typeof payload.id !== "string") return null;
    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });
    return customer;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const customer = await getCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        location: { select: { name: true } },
        pickupSlot: { select: { date: true, time: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            variantName: true,
            modifierNames: true,
            exclusionNames: true,
            menuItem: { select: { name: true, nameNl: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (e: unknown) {
    console.error("Customer orders error:", e);
    const message = e instanceof Error ? e.message : "Failed to load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
