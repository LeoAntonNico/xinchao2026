import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  return NextResponse.json({
    authenticated: !!token?.id,
    userId: token?.id || null,
    cookies: request.cookies.getAll().map(c => c.name),
    contentType: request.headers.get("content-type"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
  });
}
