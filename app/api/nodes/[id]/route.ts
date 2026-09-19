// RAASTA API — PATCH /api/nodes/:id — PRD §25
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { journeyId, status, nextAction, blockedReason } = body;

    if (!journeyId) {
      return NextResponse.json({ error: 'journeyId is required' }, { status: 400 });
    }

    const updatedDetail = journeyStore.updateNode(journeyId, id, userId, {
      status,
      nextAction,
      blockedReason,
    });

    return NextResponse.json(updatedDetail);
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN_OWNERSHIP_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err?.message || 'Node update failed' },
      { status: 500 }
    );
  }
}
