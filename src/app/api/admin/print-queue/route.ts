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

  const orderIds = jobs.map((job) => job.orderId).filter((id): id is string => Boolean(id));
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true },
      })
    : [];
  const orderNumbers = new Map(orders.map((order) => [order.id, order.orderNumber]));

  return Response.json(
    jobs.map((job) => ({
      ...job,
      orderNumber: job.orderId ? orderNumbers.get(job.orderId) || null : null,
    }))
  );
}
