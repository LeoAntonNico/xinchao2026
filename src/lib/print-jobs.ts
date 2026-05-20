import { prisma } from "@/lib/prisma";
import { buildReceiptFromOrder, formatReceiptEscPos } from "@/lib/receipt-formatter";

export async function ensurePrintJobForOrder(orderId: string) {
  const existing = await prisma.printJob.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  if (existing) {
    return { jobId: existing.id, status: existing.status, created: false };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      location: true,
      pickupSlot: true,
      items: {
        include: {
          menuItem: { select: { name: true, nameNl: true } },
        },
      },
    },
  });

  if (!order || !order.location) {
    throw new Error("Order or location not found for print job");
  }

  const receiptData = buildReceiptFromOrder(order, order.location, order.pickupSlot?.time);
  const escposData = formatReceiptEscPos(receiptData).toString("base64");
  const location = order.location.slug || order.location.name.toLowerCase();

  const job = await prisma.printJob.create({
    data: {
      orderId,
      location,
      payload: receiptData as any,
      escposData,
      status: "PENDING",
    },
  });

  return { jobId: job.id, status: job.status, created: true };
}
