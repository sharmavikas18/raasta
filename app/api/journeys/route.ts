// RAASTA API — POST & GET /api/journeys — PRD §25
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { extractGoalIntent } from '@/lib/api/bedrock';
import { Journey, JourneyNode, Dependency } from '@/types/domain';
import { routeErrorResponse } from '@/lib/api/routeError';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const journeys = journeyStore.getJourneys(userId);
    return NextResponse.json({ journeys });
  } catch (error: unknown) {
    return routeErrorResponse(error, 'Failed to fetch journeys');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body: { intent?: unknown; context?: unknown } = await request.json();
    const { intent } = body;

    if (!intent || typeof intent !== 'string' || !intent.trim()) {
      return NextResponse.json({ error: 'Intent description is required' }, { status: 400 });
    }
    const context = isStringRecord(body.context) ? body.context : undefined;

    // Call Bedrock (or mock adapter) to extract structured intent & candidate graph
    const extracted = await extractGoalIntent(intent, context);
    if (!extracted) {
      return NextResponse.json({ error: 'Failed to extract structured goal intent' }, { status: 422 });
    }

    const journeyId = `jrn_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const newJourney: Journey = {
      id: journeyId,
      userId,
      title: extracted.normalizedGoal,
      originalIntent: intent,
      category: extracted.category,
      status: 'ACTIVE',
      readinessPercent: null,
      deadline: extracted.estimatedDeadline,
      priority: 'HIGH',
      createdAt: now,
      updatedAt: now,
    };

    // Map candidate nodes to JourneyNodes
    const tempIdToRealId = new Map<string, string>();
    const nodes: JourneyNode[] = extracted.candidateNodes.map((cn, index) => {
      const nodeId = `node_${journeyId}_${index + 1}`;
      tempIdToRealId.set(cn.tempId, nodeId);

      let dueAt: string | null = null;
      if (extracted.estimatedDeadline && cn.estimatedDaysBeforeDeadline !== null) {
        const d = new Date(extracted.estimatedDeadline);
        d.setDate(d.getDate() - cn.estimatedDaysBeforeDeadline);
        dueAt = d.toISOString();
      }

      return {
        id: nodeId,
        journeyId,
        title: cn.title,
        description: cn.description,
        type: cn.type,
        status: index === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        priority: cn.priority,
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
    const dependencies: Dependency[] = [];
    extracted.candidateDependencies.forEach((dependency, index) => {
      const fromId = tempIdToRealId.get(dependency.fromTempId);
      const toId = tempIdToRealId.get(dependency.toTempId);
      if (!fromId || !toId) return;
      dependencies.push({
        id: `dep_${journeyId}_${index + 1}`,
        journeyId,
        fromNodeId: fromId,
        toNodeId: toId,
        relationship: dependency.relationship,
        isBlocking: dependency.isBlocking,
      });
    });

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
  } catch (error: unknown) {
    return routeErrorResponse(error, 'Failed to create journey');
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
