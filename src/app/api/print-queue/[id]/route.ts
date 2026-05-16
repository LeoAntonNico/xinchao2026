import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

function getAgentSecret() {
  return process.env['PRINT_AGENT_SECRET'] || '';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = req.headers.get('x-agent-secret');
  if (!getAgentSecret() || secret !== getAgentSecret()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !body.status) {
    return Response.json({ error: 'Missing status' }, { status: 400 });
  }

  const update: Record<string, any> = {
    status: body.status,
    attemptCount: { increment: 1 },
  };

  if (body.status === 'PRINTED') {
    update.printedAt = new Date();
  }
  if (body.error) {
    update.lastError = body.error;
  }

  const job = await prisma.printJob.update({
    where: { id },
    data: update,
  });

  return Response.json({ job });
}
