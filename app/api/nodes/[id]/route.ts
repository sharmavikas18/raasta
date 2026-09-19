// RAASTA API — PATCH /api/nodes/:id — PRD §25
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { routeErrorResponse } from '@/lib/api/routeError';
import { isNodeStatus } from '@/lib/domain/graph';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { journeyId, status, nextAction, blockedReason } = body;

    if (typeof journeyId !== 'string' || !journeyId) {
      return NextResponse.json({ error: 'journeyId is required' }, { status: 400 });
    }
    if (status !== undefined && !isNodeStatus(status)) {
      return NextResponse.json({ error: 'Invalid node status.' }, { status: 400 });
    }
    if (nextAction !== undefined && nextAction !== null && typeof nextAction !== 'string') {
      return NextResponse.json({ error: 'nextAction must be a string or null.' }, { status: 400 });
    }
    if (blockedReason !== undefined && blockedReason !== null && typeof blockedReason !== 'string') {
      return NextResponse.json({ error: 'blockedReason must be a string or null.' }, { status: 400 });
    }

    const updatedDetail = journeyStore.updateNode(journeyId, id, userId, {
      status,
      nextAction,
      blockedReason,
    });

    return NextResponse.json(updatedDetail);
  } catch (error: unknown) {
    return routeErrorResponse(error, 'Node update failed');
  }
}
