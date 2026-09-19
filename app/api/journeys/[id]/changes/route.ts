// RAASTA API — POST /api/journeys/:id/changes — PRD §7 Flow 4, §25, AT-07
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { nodeId, changeType, oldValue, newValue } = body;

    if (!nodeId || !changeType || !newValue) {
      return NextResponse.json(
        { error: 'Missing required parameters: nodeId, changeType, newValue' },
        { status: 400 }
      );
    }

    const updatedDetail = journeyStore.simulateChange(
      id,
      nodeId,
      userId,
      changeType,
      oldValue || 'Original configuration',
      newValue
    );

    return NextResponse.json(updatedDetail);
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN_OWNERSHIP_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err?.message || 'Change simulation failed' },
      { status: 500 }
    );
  }
}
