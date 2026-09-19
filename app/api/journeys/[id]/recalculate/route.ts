// RAASTA API — POST /api/journeys/:id/recalculate — PRD §25
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';

    const detail = journeyStore.getJourneyDetail(id, userId);
    if (!detail) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN_OWNERSHIP_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: err?.message || 'Recalculation failed' },
      { status: 500 }
    );
  }
}
