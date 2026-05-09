/**
 * Admin print queue API
 * GET /api/admin/print-queue — list recent print jobs (admin only)
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  await requireAdminAuth();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);

  const jobs = await prisma.printJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json(jobs);
}
