// RAASTA API — GET & PATCH /api/profile — PRD §25, AT-06
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { ConstraintType } from '@/types/domain';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const user = journeyStore.getUser(userId);
    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { constraintType, enabled, notificationPreferences, preferredLanguage } = body;

    const currentUser = journeyStore.getUser(userId);
    let updatedAccessibility = [...currentUser.accessibilityPreferences];

    if (constraintType) {
      const idx = updatedAccessibility.findIndex((p) => p.constraintType === constraintType);
      if (idx !== -1) {
        updatedAccessibility[idx] = {
          ...updatedAccessibility[idx],
          enabled: Boolean(enabled),
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedAccessibility.push({
          constraintType: constraintType as ConstraintType,
          enabled: Boolean(enabled),
          source: 'VERIFIED_USER',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const updatedUser = journeyStore.updateUser(userId, {
      accessibilityPreferences: updatedAccessibility,
      notificationPreferences: notificationPreferences || currentUser.notificationPreferences,
      preferredLanguage: preferredLanguage || currentUser.preferredLanguage,
    });

    // Auto-adapt all active journeys belonging to this user (AT-06)
    const userJourneys = journeyStore.getJourneys(userId);
    for (const j of userJourneys) {
      if (j.status === 'ACTIVE') {
        try {
          journeyStore.adaptAccessibility(j.id, userId);
        } catch {
          // ignore individual journey adaptation error if any
        }
      }
    }

    return NextResponse.json({ user: updatedUser });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update profile' }, { status: 500 });
  }
}
