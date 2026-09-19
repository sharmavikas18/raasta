// RAASTA Foresight Engine — PRD §12
// Deterministic pattern detection. No AI calls (AI foresight is additive, not this module).

import {
  JourneyNode,
  Dependency,
  Evidence,
  UserProfileConstraint,
  ForesightInsight,
} from '@/types/domain';

let insightCounter = 0;
function nextInsightId(): string {
  return `foresight-${++insightCounter}`;
}

/**
 * Analyze a journey for preventable future surprises.
 * All logic is deterministic.
 */
export function generateForesightInsights(
  nodes: JourneyNode[],
  dependencies: Dependency[],
  evidence: Evidence[],
  accessibilityPreferences: UserProfileConstraint[],
  deadline: string | null,
  now: Date = new Date()
): ForesightInsight[] {
  // The engine is pure from a caller's perspective: unchanged input produces
  // unchanged insight IDs, which keeps UI reconciliation stable on refresh.
  insightCounter = 0;
  const insights: ForesightInsight[] = [];

  insights.push(...detectMissingPrerequisites(nodes, dependencies));
  insights.push(...detectDeadlineRisks(nodes, deadline, now));
  insights.push(...detectDependencyChainRisks(nodes, dependencies, deadline, now));
  insights.push(...detectInformationUncertainty(nodes, evidence));
  insights.push(...detectAccessibilityUnknowns(nodes, evidence, accessibilityPreferences));
  insights.push(...detectConflicts(nodes));

  return insights;
}

/**
 * Missing prerequisite: A downstream action requires a document/task that hasn't been completed.
 */
function detectMissingPrerequisites(
  nodes: JourneyNode[],
  dependencies: Dependency[]
): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  for (const dep of dependencies) {
    if (!dep.isBlocking) continue;

    const fromNode = nodes.find((n) => n.id === dep.fromNodeId);
    const toNode = nodes.find((n) => n.id === dep.toNodeId);

    if (!fromNode || !toNode) continue;

    // Prerequisite incomplete but downstream is NOT_STARTED or IN_PROGRESS
    if (
      fromNode.status !== 'COMPLETED' &&
      fromNode.status !== 'NOT_APPLICABLE' &&
      (toNode.status === 'IN_PROGRESS' || toNode.status === 'NOT_STARTED')
    ) {
      insights.push({
        id: nextInsightId(),
        type: 'MISSING_PREREQUISITE',
        title: `"${fromNode.title}" is needed before "${toNode.title}"`,
        explanation: `${toNode.title} depends on ${fromNode.title}, which is currently ${formatStatus(fromNode.status)}.`,
        severity: fromNode.priority,
        affectedNodeIds: [fromNode.id, toNode.id],
        suggestedAction: fromNode.nextAction || `Complete "${fromNode.title}"`,
        verificationRequired: false,
      });
    }
  }

  return insights;
}

/**
 * Deadline risk: A required task is incomplete and the deadline is approaching.
 */
function detectDeadlineRisks(
  nodes: JourneyNode[],
  journeyDeadline: string | null,
  now: Date
): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  // Check individual node deadlines
  for (const node of nodes) {
    if (!node.isRequired) continue;
    if (node.status === 'COMPLETED' || node.status === 'NOT_APPLICABLE') continue;

    const dueDate = node.dueAt ? new Date(node.dueAt) : journeyDeadline ? new Date(journeyDeadline) : null;
    if (!dueDate) continue;

    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue <= 0) {
      insights.push({
        id: nextInsightId(),
        type: 'DEADLINE_RISK',
        title: `"${node.title}" is past due`,
        explanation: `This required task was due on ${dueDate.toLocaleDateString()} and is not yet completed.`,
        severity: 'CRITICAL',
        affectedNodeIds: [node.id],
        suggestedAction: node.nextAction || `Complete "${node.title}" immediately`,
        verificationRequired: false,
      });
    } else if (daysUntilDue <= 3) {
      insights.push({
        id: nextInsightId(),
        type: 'DEADLINE_RISK',
        title: `"${node.title}" is due in ${Math.ceil(daysUntilDue)} day${Math.ceil(daysUntilDue) > 1 ? 's' : ''}`,
        explanation: `This required task is due on ${dueDate.toLocaleDateString()} and is currently ${formatStatus(node.status)}.`,
        severity: 'HIGH',
        affectedNodeIds: [node.id],
        suggestedAction: node.nextAction || `Prioritize "${node.title}"`,
        verificationRequired: false,
      });
    } else if (daysUntilDue <= 7) {
      insights.push({
        id: nextInsightId(),
        type: 'DEADLINE_RISK',
        title: `"${node.title}" is due this week`,
        explanation: `This required task is due on ${dueDate.toLocaleDateString()}.`,
        severity: 'MEDIUM',
        affectedNodeIds: [node.id],
        suggestedAction: node.nextAction || `Plan for "${node.title}"`,
        verificationRequired: false,
      });
    }
  }

  return insights;
}

/**
 * Dependency chain risk: Multiple incomplete prerequisites upstream of a deadline.
 */
function detectDependencyChainRisks(
  nodes: JourneyNode[],
  dependencies: Dependency[],
  deadline: string | null,
  now: Date
): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  // Find nodes with deadlines
  const nodesWithDeadlines = nodes.filter((n) => {
    const due = n.dueAt || deadline;
    if (!due) return false;
    const daysUntil = (new Date(due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 14 && n.status !== 'COMPLETED' && n.status !== 'NOT_APPLICABLE';
  });

  for (const targetNode of nodesWithDeadlines) {
    // Count incomplete prerequisites
    const prereqs = getUpstreamPrerequisites(targetNode.id, nodes, dependencies);
    const incompletePrereqs = prereqs.filter(
      (n) => n.status !== 'COMPLETED' && n.status !== 'NOT_APPLICABLE'
    );

    if (incompletePrereqs.length >= 2) {
      insights.push({
        id: nextInsightId(),
        type: 'DEPENDENCY_CHAIN',
        title: `${incompletePrereqs.length} prerequisites needed before "${targetNode.title}"`,
        explanation: `"${targetNode.title}" has ${incompletePrereqs.length} incomplete prerequisites that must be completed first: ${incompletePrereqs.map((n) => n.title).join(', ')}.`,
        severity: incompletePrereqs.length >= 3 ? 'HIGH' : 'MEDIUM',
        affectedNodeIds: [targetNode.id, ...incompletePrereqs.map((n) => n.id)],
        suggestedAction: `Start with "${incompletePrereqs[0].title}"`,
        verificationRequired: false,
      });
    }
  }

  return insights;
}

/**
 * Information uncertainty: Important journey conditions are UNKNOWN or STALE.
 */
function detectInformationUncertainty(
  nodes: JourneyNode[],
  evidence: Evidence[]
): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  // Check for nodes with UNKNOWN or STALE evidence
  for (const node of nodes) {
    if (!node.isRequired) continue;
    if (node.status === 'COMPLETED' || node.status === 'NOT_APPLICABLE') continue;

    const nodeEvidence = evidence.filter((e) => e.nodeId === node.id);
    const uncertainEvidence = nodeEvidence.filter(
      (e) => e.verificationState === 'UNKNOWN' || e.verificationState === 'STALE'
    );

    if (uncertainEvidence.length > 0) {
      insights.push({
        id: nextInsightId(),
        type: 'INFORMATION_UNCERTAINTY',
        title: `"${node.title}" has unverified information`,
        explanation: `${uncertainEvidence.length} piece${uncertainEvidence.length > 1 ? 's' : ''} of information related to "${node.title}" ${uncertainEvidence.length > 1 ? 'are' : 'is'} ${uncertainEvidence[0].verificationState.toLowerCase()}.`,
        severity: 'MEDIUM',
        affectedNodeIds: [node.id],
        suggestedAction: `Verify information for "${node.title}"`,
        verificationRequired: true,
      });
    }
  }

  // Check for NEEDS_VERIFICATION status
  const verificationNodes = nodes.filter((n) => n.status === 'NEEDS_VERIFICATION');
  for (const node of verificationNodes) {
    // Only add if not already covered by evidence check
    const alreadyCovered = insights.some(
      (i) => i.type === 'INFORMATION_UNCERTAINTY' && i.affectedNodeIds.includes(node.id)
    );
    if (!alreadyCovered) {
      insights.push({
        id: nextInsightId(),
        type: 'INFORMATION_UNCERTAINTY',
        title: `"${node.title}" needs verification`,
        explanation: `This step cannot proceed until the information is verified.`,
        severity: node.priority,
        affectedNodeIds: [node.id],
        suggestedAction: node.nextAction || `Verify "${node.title}"`,
        verificationRequired: true,
      });
    }
  }

  return insights;
}

/**
 * Accessibility unknown: Accessibility-related requirements cannot be verified.
 */
function detectAccessibilityUnknowns(
  nodes: JourneyNode[],
  evidence: Evidence[],
  accessibilityPreferences: UserProfileConstraint[]
): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  const enabledPrefs = accessibilityPreferences.filter((p) => p.enabled);
  if (enabledPrefs.length === 0) return insights;

  // Find accessibility-typed nodes
  const accessibilityNodes = nodes.filter((n) => n.type === 'ACCESSIBILITY');

  for (const node of accessibilityNodes) {
    if (node.status === 'COMPLETED' || node.status === 'NOT_APPLICABLE') continue;

    const nodeEvidence = evidence.filter((e) => e.nodeId === node.id);
    const hasVerifiedInfo = nodeEvidence.some(
      (e) => e.verificationState === 'VERIFIED_OFFICIAL' || e.verificationState === 'VERIFIED_USER'
    );

    if (!hasVerifiedInfo) {
      insights.push({
        id: nextInsightId(),
        type: 'ACCESSIBILITY_UNKNOWN',
        title: `Accessibility: "${node.title}" is not verified`,
        explanation: `No verified accessibility information is available for this step. Your preferences require this information.`,
        severity: 'HIGH',
        affectedNodeIds: [node.id],
        suggestedAction: node.nextAction || `Contact the venue or service provider to verify accessibility`,
        verificationRequired: true,
      });
    }
  }

  return insights;
}

/**
 * Conflict: Two required tasks have overlapping timing constraints.
 */
function detectConflicts(nodes: JourneyNode[]): ForesightInsight[] {
  const insights: ForesightInsight[] = [];

  const timedNodes = nodes.filter(
    (n) => n.dueAt && n.isRequired && n.status !== 'COMPLETED' && n.status !== 'NOT_APPLICABLE'
  );

  for (let i = 0; i < timedNodes.length; i++) {
    for (let j = i + 1; j < timedNodes.length; j++) {
      const a = timedNodes[i];
      const b = timedNodes[j];

      if (a.dueAt && b.dueAt && a.dueAt === b.dueAt) {
        insights.push({
          id: nextInsightId(),
          type: 'CONFLICT',
          title: `"${a.title}" and "${b.title}" have the same deadline`,
          explanation: `Both tasks are due on ${new Date(a.dueAt).toLocaleDateString()}. Plan to complete them in sequence.`,
          severity: 'MEDIUM',
          affectedNodeIds: [a.id, b.id],
          suggestedAction: `Prioritize one of these tasks`,
          verificationRequired: false,
        });
      }
    }
  }

  return insights;
}

// ─── Helpers ──────────────────────────────────────────────────

function getUpstreamPrerequisites(
  nodeId: string,
  nodes: JourneyNode[],
  dependencies: Dependency[]
): JourneyNode[] {
  const result: JourneyNode[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    const deps = dependencies.filter((d) => d.toNodeId === currentId && d.isBlocking);
    for (const dep of deps) {
      if (visited.has(dep.fromNodeId)) continue;
      visited.add(dep.fromNodeId);
      const node = nodes.find((n) => n.id === dep.fromNodeId);
      if (node) {
        result.push(node);
        traverse(node.id);
      }
    }
  }

  traverse(nodeId);
  return result;
}

function formatStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}
