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
      select: { id: true, name: true, email: true, phone: true },
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
  return NextResponse.json(customer);
}

export async function PATCH(req: Request) {
  const customer = await getCustomer(req);
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, phone, password } = body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (password) {
      const bcrypt = await import("bcryptjs");
      updateData.password = await bcrypt.hash(password, 12);
    }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
