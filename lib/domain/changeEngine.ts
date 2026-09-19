// RAASTA Change Engine — PRD §7 Flow 4, §12, AT-07
// Detects changed journey nodes, propagates downstream impacts, records change events, and guides re-verification.

import type {
  JourneyNode,
  Dependency,
  ChangeEvent,
  ChangeType,
} from '../../types/domain.ts';

export interface ChangeSimulationResult {
  updatedNodes: JourneyNode[];
  changeEvent: ChangeEvent;
  affectedNodeIds: string[];
  impactMessages: string[];
}

/**
 * Propagate a node change event downstream through the dependency graph.
 * For example: Venue A -> Venue B triggers transit re-routing, arrival time review,
 * and resets venue accessibility verification to UNKNOWN / NEEDS_VERIFICATION.
 */
export function applyJourneyChange(
  journeyId: string,
  targetNodeId: string,
  changeType: ChangeType,
  oldValue: string,
  newValue: string,
  nodes: JourneyNode[],
  dependencies: Dependency[]
): ChangeSimulationResult {
  const updatedNodes = nodes.map((node) => ({ ...node }));
  const targetNode = updatedNodes.find((n) => n.id === targetNodeId);

  const affectedNodeIds: string[] = [targetNodeId];
  const impactMessages: string[] = [];

  // Find all downstream dependent nodes
  function collectDownstream(nodeId: string) {
    const directDeps = dependencies.filter((d) => d.fromNodeId === nodeId);
    for (const dep of directDeps) {
      if (!affectedNodeIds.includes(dep.toNodeId)) {
        affectedNodeIds.push(dep.toNodeId);
        collectDownstream(dep.toNodeId);
      }
    }
  }

  collectDownstream(targetNodeId);

  const now = new Date().toISOString();

  // Apply domain-specific change impact rules
  if (changeType === 'VENUE_CHANGE') {
    impactMessages.push(`Primary venue relocated from "${oldValue}" to "${newValue}".`);
    impactMessages.push('Transit route and travel duration must be re-evaluated.');
    impactMessages.push('Arrival time buffer requires recalculation for security & registration.');
    impactMessages.push('All on-site accessibility verifications reset to UNKNOWN / Needs Verification.');

    for (const node of updatedNodes) {
      if (node.id === targetNodeId) {
        node.description = `${node.description}\n[UPDATED VENUE: ${newValue} (previously ${oldValue})]`;
        node.status = 'NEEDS_VERIFICATION';
        node.nextAction = `Verify new venue location at ${newValue} and check updated entrance guide`;
        node.updatedAt = now;
      } else if (
        node.title.toLowerCase().includes('travel') ||
        node.title.toLowerCase().includes('transit') ||
        node.title.toLowerCase().includes('commute') ||
        node.title.toLowerCase().includes('metro') ||
        node.title.toLowerCase().includes('cab')
      ) {
        node.status = 'NEEDS_VERIFICATION';
        node.blockedReason = `Venue changed to ${newValue}; transit route must be re-planned.`;
        node.nextAction = `Re-plan transit route to ${newValue}`;
        node.updatedAt = now;
        if (!affectedNodeIds.includes(node.id)) affectedNodeIds.push(node.id);
      } else if (node.type === 'ACCESSIBILITY') {
        node.status = 'NEEDS_VERIFICATION';
        node.blockedReason = `Venue changed; previous accessibility information is now STALE/UNKNOWN.`;
        node.nextAction = `Contact new venue at ${newValue} to confirm step-free access and accommodations`;
        node.updatedAt = now;
        if (!affectedNodeIds.includes(node.id)) affectedNodeIds.push(node.id);
      } else if (affectedNodeIds.includes(node.id) && node.status === 'COMPLETED') {
        // Downstream completed tasks may need review
        node.status = 'NEEDS_VERIFICATION';
        node.blockedReason = `Upstream venue change may invalidate previous confirmation.`;
        node.nextAction = `Re-verify step under new venue conditions (${newValue})`;
        node.updatedAt = now;
      }
    }
  } else if (changeType === 'DATE_CHANGE') {
    impactMessages.push(`Schedule adjusted from "${oldValue}" to "${newValue}".`);
    impactMessages.push('Deadlines and buffer times adjusted.');
    impactMessages.push('Downstream booking and reservation confirmations need review.');

    for (const node of updatedNodes) {
      if (affectedNodeIds.includes(node.id)) {
        node.updatedAt = now;
        if (node.status === 'COMPLETED') {
          node.status = 'NEEDS_VERIFICATION';
          node.nextAction = `Confirm booking aligns with new date (${newValue})`;
        }
      }
    }
  } else {
    impactMessages.push(`Information updated: ${oldValue} -> ${newValue}`);
    for (const node of updatedNodes) {
      if (node.id === targetNodeId) {
        node.updatedAt = now;
      }
    }
  }

  const changeEvent: ChangeEvent = {
    id: `event-chg-${Date.now()}`,
    journeyId,
    nodeId: targetNodeId,
    changeType,
    oldValue,
    newValue,
    impact: impactMessages,
    source: 'SIMULATED_CHANGE_ENGINE',
    createdAt: now,
  };

  return {
    updatedNodes,
    changeEvent,
    affectedNodeIds,
    impactMessages,
  };
}
