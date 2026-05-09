/**
 * Restaurant print queue API
 * GET    /api/print-queue?location=utrecht    — fetch pending jobs (agent)
 * POST   /api/print-queue                     — enqueue a receipt
 * PATCH  /api/print-queue/[id]                — mark printed / failed
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildReceiptFromOrder, formatReceiptEscPos, formatReceiptText, ReceiptData } from '@/lib/receipt-formatter';

const AGENT_SECRET = process.env.PRINT_AGENT_SECRET || '';

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

/* ═══════════════════════════════
   GET  — agents poll for jobs
   ═══════════════════════════════ */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret');
  if (!AGENT_SECRET || secret !== AGENT_SECRET) return unauthorized();

  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  const jobs = await prisma.printJob.findMany({
    where: {
      location: location || undefined,
      status: { in: ['PENDING', 'RETRYING'] },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  return Response.json({ jobs });
}

/* ═══════════════════════════════
   POST  — enqueue new print job
   Body: { orderId, location }
   OR:   { testData: ReceiptData, location }
   ═══════════════════════════════ */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.location) {
    return Response.json({ error: 'Missing location' }, { status: 400 });
  }

  const location = body.location.toLowerCase();
  let receiptData: ReceiptData;
  let orderId: string | null = null;

  // TEST MODE: admin sends testData directly
  if (body.testData) {
    receiptData = body.testData as ReceiptData;
  }
  // PRODUCTION MODE: build from order
  else if (body.orderId) {
    orderId = body.orderId;
    const order = await prisma.order.findUnique({
      where: { id: orderId! },
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

    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    receiptData = buildReceiptFromOrder(order, order.location, order.pickupSlot?.time);
  } else {
    return Response.json({ error: 'Missing orderId or testData' }, { status: 400 });
  }

  // Generate ESC/POS buffer and base64-encode for wire transfer
  const escposBuffer = formatReceiptEscPos(receiptData);
  const escposBase64 = escposBuffer.toString('base64');

  const job = await prisma.printJob.create({
    data: {
      orderId,
      location,
      payload: receiptData as any,
      escposData: escposBase64,
      status: 'PENDING',
    },
  });

  return Response.json({ jobId: job.id, status: 'queued' });
}
