// RAASTA API — POST & GET /api/journeys — PRD §25
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { extractGoalIntent } from '@/lib/api/bedrock';
import { Journey, JourneyNode, Dependency, Priority } from '@/types/domain';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const journeys = journeyStore.getJourneys(userId);
    return NextResponse.json({ journeys });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch journeys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { intent, context } = body;

    if (!intent || typeof intent !== 'string' || !intent.trim()) {
      return NextResponse.json({ error: 'Intent description is required' }, { status: 400 });
    }

    // Call Bedrock (or mock adapter) to extract structured intent & candidate graph
    const extracted = await extractGoalIntent(intent, context);
    if (!extracted) {
      return NextResponse.json({ error: 'Failed to extract structured goal intent' }, { status: 422 });
    }

    const journeyId = `jrn_${Date.now()}`;
    const now = new Date().toISOString();

    const newJourney: Journey = {
      id: journeyId,
      userId,
      title: extracted.normalizedGoal,
      originalIntent: intent,
      category: extracted.category as any,
      status: 'ACTIVE',
      readinessPercent: null,
      deadline: extracted.estimatedDeadline,
      priority: 'HIGH',
      createdAt: now,
      updatedAt: now,
    };

    // Map candidate nodes to JourneyNodes
    const tempIdToRealId = new Map<string, string>();
    const nodes: JourneyNode[] = extracted.candidateNodes.map((cn: any, index: number) => {
      const nodeId = `node_${journeyId}_${index + 1}`;
      tempIdToRealId.set(cn.tempId, nodeId);

      let dueAt: string | null = null;
      if (extracted.estimatedDeadline && cn.estimatedDaysBeforeDeadline) {
        const d = new Date(extracted.estimatedDeadline);
        d.setDate(d.getDate() - cn.estimatedDaysBeforeDeadline);
        dueAt = d.toISOString();
      }

      return {
        id: nodeId,
        journeyId,
        title: cn.title,
        description: cn.description,
        type: cn.type || 'TASK',
        status: index === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        priority: (cn.priority as Priority) || 'MEDIUM',
        dueAt,
        blockedReason: null,
        nextAction: cn.title,
        isRequired: cn.isRequired ?? true,
        weight: cn.priority === 'CRITICAL' ? 10 : cn.priority === 'HIGH' ? 8 : 5,
        createdAt: now,
        updatedAt: now,
      };
    });

    // Map candidate dependencies
    const dependencies: Dependency[] = extracted.candidateDependencies
      .map((cd: any, index: number) => {
        const fromId = tempIdToRealId.get(cd.fromTempId);
        const toId = tempIdToRealId.get(cd.toTempId);
        if (!fromId || !toId) return null;

        return {
          id: `dep_${journeyId}_${index + 1}`,
          journeyId,
          fromNodeId: fromId,
          toNodeId: toId,
          relationship: cd.relationship || 'PREREQUISITE',
          isBlocking: cd.isBlocking ?? true,
        };
      })
      .filter(Boolean) as Dependency[];

    // Save into journeyStore
    const detail = journeyStore.createJourney(newJourney, nodes, dependencies, []);

    // Check if user has active accessibility constraints to auto-adapt
    const user = journeyStore.getUser(userId);
    const hasActiveAcc = user.accessibilityPreferences.some((p) => p.enabled);
    const finalDetail = hasActiveAcc
      ? journeyStore.adaptAccessibility(journeyId, userId)
      : detail;

    return NextResponse.json({
      journeyId: finalDetail.journey.id,
      status: finalDetail.journey.status,
      readinessPercent: finalDetail.readiness.percent,
      nextAction: finalDetail.nextAction,
      nodes: finalDetail.nodes,
      clarifyingQuestions: extracted.missingHighValueQuestions,
      detail: finalDetail,
    });
  } catch (err: any) {
    console.error('Error creating journey:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create journey' },
      { status: 500 }
    );
  }
}
