import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, phone are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Customer with that email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 12)
      : null;

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(customer);
  } catch (e: unknown) {
    console.error("Customer register error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
