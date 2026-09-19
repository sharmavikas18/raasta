// RAASTA Next Best Action Engine — PRD §11
// Deterministic ranking. No AI calls.

import type {
  JourneyNode,
  Dependency,
  NextAction,
  NodeStatus,
  Priority,
} from '../../types/domain.ts';
import {
  countDownstreamNodes,
  getUnmetBlockingDependencies,
} from '../domain/graph.ts';

const PRIORITY_SCORE: Record<Priority, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
};

const STATUS_ELIGIBILITY: Set<NodeStatus> = new Set([
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'NEEDS_VERIFICATION',
]);

/**
 * Select the single most valuable next action from a journey's nodes.
 *
 * Deterministic ordering:
 * 1. Critical blocker with near deadline
 * 2. Missing prerequisite that blocks multiple steps
 * 3. High-priority verification task
 * 4. Near-term required task
 * 5. Optional task
 */
export function selectNextAction(
  nodes: JourneyNode[],
  dependencies: Dependency[],
  now: Date = new Date()
): NextAction | null {
  // Only consider actionable nodes
  const actionable = nodes.filter((node) => {
    if (!STATUS_ELIGIBILITY.has(node.status) || node.status === 'BLOCKED') return false;
    return getUnmetBlockingDependencies(node.id, nodes, dependencies).length === 0;
  });

  if (actionable.length === 0) {
    // Check if there are blocked nodes — the action is to unblock
    const blocked = nodes.filter((n) => n.status === 'BLOCKED');
    if (blocked.length > 0) {
      // Find the prerequisite that unblocks the most things
      return findUnblockingAction(blocked, nodes, dependencies);
    }
    return null;
  }

  // Score each actionable node
  const scored = actionable.map((node) => ({
    node,
    score: computeActionScore(node, dependencies, now),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));

  const best = scored[0];
  const blocksCount = countDownstreamNodes(best.node.id, dependencies);

  return {
    nodeId: best.node.id,
    title: best.node.nextAction || best.node.title,
    reason: generateReason(best.node, blocksCount, now),
    urgency: best.node.priority,
    blocksCount,
  };
}

function computeActionScore(
  node: JourneyNode,
  dependencies: Dependency[],
  now: Date
): number {
  let score = PRIORITY_SCORE[node.priority];

  // Bonus for blocking other tasks
  const downstreamBlocked = countDownstreamNodes(node.id, dependencies);
  score += downstreamBlocked * 20;

  // Bonus for being required
  if (node.isRequired) score += 15;

  // Bonus for deadline proximity
  if (node.dueAt) {
    const daysUntilDue = (new Date(node.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue <= 1) score += 50;
    else if (daysUntilDue <= 3) score += 30;
    else if (daysUntilDue <= 7) score += 15;
  }

  // Bonus for verification tasks (surface unknowns early)
  if (node.status === 'NEEDS_VERIFICATION') score += 10;

  // Penalty for optional tasks
  if (!node.isRequired) score -= 20;

  return score;
}

function findUnblockingAction(
  blockedNodes: JourneyNode[],
  allNodes: JourneyNode[],
  dependencies: Dependency[]
): NextAction | null {
  // Find prerequisites of blocked nodes that are themselves actionable
  const prerequisiteMap = new Map<string, number>();

  for (const blocked of blockedNodes) {
    const deps = dependencies.filter(
      (d) => d.toNodeId === blocked.id && d.isBlocking
    );
    for (const dep of deps) {
      const fromNode = allNodes.find((n) => n.id === dep.fromNodeId);
      if (fromNode && fromNode.status !== 'COMPLETED' && fromNode.status !== 'NOT_APPLICABLE') {
        prerequisiteMap.set(fromNode.id, (prerequisiteMap.get(fromNode.id) || 0) + 1);
      }
    }
  }

  if (prerequisiteMap.size === 0) return null;

  // Find the prerequisite that unblocks the most tasks
  let bestId = '';
  let bestCount = 0;
  for (const [id, count] of prerequisiteMap) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }

  const bestNode = allNodes.find((n) => n.id === bestId);
  if (!bestNode) return null;

  return {
    nodeId: bestNode.id,
    title: bestNode.nextAction || bestNode.title,
    reason: `This blocks ${bestCount} downstream step${bestCount > 1 ? 's' : ''}`,
    urgency: bestNode.priority,
    blocksCount: bestCount,
  };
}

function generateReason(node: JourneyNode, blocksCount: number, now: Date): string {
  if (blocksCount > 0) {
    return `This blocks ${blocksCount} downstream step${blocksCount > 1 ? 's' : ''}`;
  }

  if (node.dueAt) {
    const daysUntil = Math.ceil(
      (new Date(node.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 1) return 'Due today or tomorrow';
    if (daysUntil <= 3) return `Due in ${daysUntil} days`;
    if (daysUntil <= 7) return `Due this week`;
  }

  if (node.status === 'NEEDS_VERIFICATION') {
    return 'Needs verification before proceeding';
  }

  return 'Required for journey completion';
}
