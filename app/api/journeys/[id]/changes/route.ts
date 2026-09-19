// RAASTA API — POST /api/journeys/:id/changes — PRD §7 Flow 4, §25, AT-07
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { routeErrorResponse } from '@/lib/api/routeError';
import { isChangeType } from '@/lib/domain/graph';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { nodeId, changeType, oldValue, newValue } = body;

    if (typeof nodeId !== 'string' || !nodeId || !isChangeType(changeType) || typeof newValue !== 'string' || !newValue.trim()) {
      return NextResponse.json(
        { error: 'Provide a nodeId, valid changeType, and newValue.' },
        { status: 400 }
      );
    }
    if (oldValue !== undefined && typeof oldValue !== 'string') {
      return NextResponse.json({ error: 'oldValue must be a string.' }, { status: 400 });
    }

    const updatedDetail = journeyStore.simulateChange(
      id,
      nodeId,
      userId,
      changeType,
      oldValue || 'Original configuration',
      newValue.trim()
    );

    return NextResponse.json(updatedDetail);
  } catch (error: unknown) {
    return routeErrorResponse(error, 'Change simulation failed');
  }
}
