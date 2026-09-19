// RAASTA API — GET /api/journeys/:id — PRD §24, §25, AT-08
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';

export async function GET(
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
      return NextResponse.json(
        { error: 'Forbidden: You do not own this journey' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve journey' },
      { status: 500 }
    );
  }
}
