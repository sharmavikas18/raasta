// RAASTA Readiness Engine — PRD §10
// Deterministic computation. No AI calls.

import type {
  JourneyNode,
  Dependency,
  ReadinessResult,
  NodeStatus,
} from '../../types/domain.ts';

const BLOCKER_PENALTY = 5; // percentage points per blocker
const CRITICAL_UNKNOWN_PENALTY = 3; // percentage points per critical unknown
const MIN_REQUIRED_NODES_FOR_PERCENT = 2;

/**
 * Compute journey readiness as a product metric.
 * 
 * readiness = (weighted completion of required nodes)
 *           - blocker penalty
 *           - unresolved critical dependency penalty
 *
 * Returns null percent when insufficient data, with a qualitative state instead.
 */
export function calculateReadiness(
  nodes: JourneyNode[],
  dependencies: Dependency[]
): ReadinessResult {
  const requiredNodes = nodes.filter((n) => n.isRequired);
  const totalRequired = requiredNodes.length;

  // Not enough data for a meaningful percentage
  if (totalRequired < MIN_REQUIRED_NODES_FOR_PERCENT) {
    return {
      percent: null,
      totalRequired,
      completedRequired: 0,
      blockerCount: 0,
      criticalUnknowns: 0,
      qualitativeState: totalRequired === 0 ? 'No requirements identified' : 'Needs preparation',
    };
  }

  const completedRequired = requiredNodes.filter(
    (n) => n.status === 'COMPLETED' || n.status === 'NOT_APPLICABLE'
  ).length;

  const blockers = nodes.filter((n) => n.status === 'BLOCKED');
  const blockerCount = blockers.length;

  const needsVerification = nodes.filter(
    (n) => n.status === 'NEEDS_VERIFICATION' && n.isRequired
  );
  const criticalUnknowns = needsVerification.length;

  // Count blocking dependencies that are unresolved
  const blockingDeps = dependencies.filter((d) => d.isBlocking);
  const unresolvedBlockingDeps = blockingDeps.filter((dep) => {
    const fromNode = nodes.find((n) => n.id === dep.fromNodeId);
    return fromNode && fromNode.status !== 'COMPLETED' && fromNode.status !== 'NOT_APPLICABLE';
  });

  // Weighted completion
  const totalWeight = requiredNodes.reduce((sum, n) => sum + n.weight, 0);
  const completedWeight = requiredNodes
    .filter((n) => n.status === 'COMPLETED' || n.status === 'NOT_APPLICABLE')
    .reduce((sum, n) => sum + n.weight, 0);

  const basePercent = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  // Apply penalties
  const penalty =
    blockerCount * BLOCKER_PENALTY +
    criticalUnknowns * CRITICAL_UNKNOWN_PENALTY +
    unresolvedBlockingDeps.length * BLOCKER_PENALTY;

  const percent = Math.max(0, Math.min(100, Math.round(basePercent - penalty)));

  return {
    percent,
    totalRequired,
    completedRequired,
    blockerCount,
    criticalUnknowns,
    qualitativeState: null,
  };
}

/**
 * Get a human-readable readiness description
 */
export function getReadinessDescription(result: ReadinessResult): string {
  if (result.percent === null) {
    return result.qualitativeState || 'Needs preparation';
  }

  if (result.percent >= 90) return 'Almost ready';
  if (result.percent >= 70) return 'Good progress';
  if (result.percent >= 50) return 'Making progress';
  if (result.percent >= 25) return 'Early stages';
  return 'Needs preparation';
}

/**
 * Check if a node is blocked by unmet dependencies
 */
export function isNodeBlocked(
  nodeId: string,
  nodes: JourneyNode[],
  dependencies: Dependency[]
): { blocked: boolean; reason: string | null } {
  const blockingDeps = dependencies.filter(
    (d) => d.toNodeId === nodeId && d.isBlocking
  );

  for (const dep of blockingDeps) {
    const fromNode = nodes.find((n) => n.id === dep.fromNodeId);
    if (fromNode && fromNode.status !== 'COMPLETED' && fromNode.status !== 'NOT_APPLICABLE') {
      return {
        blocked: true,
        reason: `Requires "${fromNode.title}" to be completed first`,
      };
    }
  }

  return { blocked: false, reason: null };
}
