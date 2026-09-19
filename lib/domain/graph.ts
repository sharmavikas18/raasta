import type { ChangeType, Dependency, Journey, JourneyNode, NodeStatus } from '../../types/domain.ts';
import { DomainError } from './errors.ts';

const NODE_STATUSES: ReadonlySet<NodeStatus> = new Set([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'NEEDS_VERIFICATION',
  'NOT_APPLICABLE',
]);

const CHANGE_TYPES: ReadonlySet<ChangeType> = new Set([
  'VENUE_CHANGE',
  'DATE_CHANGE',
  'REQUIREMENT_CHANGE',
  'STATUS_CHANGE',
  'INFORMATION_UPDATE',
]);

export function isNodeStatus(value: unknown): value is NodeStatus {
  return typeof value === 'string' && NODE_STATUSES.has(value as NodeStatus);
}

export function isChangeType(value: unknown): value is ChangeType {
  return typeof value === 'string' && CHANGE_TYPES.has(value as ChangeType);
}

/**
 * Validates the small set of invariants every stored journey needs. The engine
 * deliberately accepts any relationship label—the label is descriptive—while
 * treating the dependency edges as the source of operational truth.
 */
export function assertValidJourneyGraph(
  journey: Journey,
  nodes: JourneyNode[],
  dependencies: Dependency[]
): void {
  if (!journey.id || !journey.userId) {
    throw new DomainError('INVALID_GRAPH', 'A journey must have an id and an owner.');
  }

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id || node.journeyId !== journey.id) {
      throw new DomainError('INVALID_GRAPH', 'Every node must belong to its journey.');
    }
    if (nodeIds.has(node.id)) {
      throw new DomainError('DUPLICATE_ID', `Node id "${node.id}" is duplicated.`);
    }
    if (!isNodeStatus(node.status)) {
      throw new DomainError('INVALID_NODE_STATUS', `Node "${node.id}" has an invalid status.`);
    }
    if (!Number.isFinite(node.weight) || node.weight < 0) {
      throw new DomainError('INVALID_GRAPH', `Node "${node.id}" has an invalid weight.`);
    }
    nodeIds.add(node.id);
  }

  const dependencyIds = new Set<string>();
  for (const dependency of dependencies) {
    if (!dependency.id || dependency.journeyId !== journey.id) {
      throw new DomainError('INVALID_GRAPH', 'Every dependency must belong to its journey.');
    }
    if (dependencyIds.has(dependency.id)) {
      throw new DomainError('DUPLICATE_ID', `Dependency id "${dependency.id}" is duplicated.`);
    }
    if (!nodeIds.has(dependency.fromNodeId) || !nodeIds.has(dependency.toNodeId)) {
      throw new DomainError('INVALID_GRAPH', `Dependency "${dependency.id}" references an unknown node.`);
    }
    if (dependency.fromNodeId === dependency.toNodeId) {
      throw new DomainError('DEPENDENCY_CYCLE', 'A node cannot depend on itself.');
    }
    dependencyIds.add(dependency.id);
  }

  assertAcyclic(nodes, dependencies);
}

export function assertAcyclic(nodes: JourneyNode[], dependencies: Dependency[]): void {
  const downstream = new Map<string, string[]>();
  for (const node of nodes) downstream.set(node.id, []);
  for (const dependency of dependencies) {
    downstream.get(dependency.fromNodeId)?.push(dependency.toNodeId);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      throw new DomainError('DEPENDENCY_CYCLE', 'Journey dependencies must not contain a cycle.');
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const dependentId of downstream.get(nodeId) ?? []) visit(dependentId);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of nodes) visit(node.id);
}

export function getUnmetBlockingDependencies(
  nodeId: string,
  nodes: JourneyNode[],
  dependencies: Dependency[]
): JourneyNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return dependencies
    .filter((dependency) => dependency.toNodeId === nodeId && dependency.isBlocking)
    .map((dependency) => byId.get(dependency.fromNodeId))
    .filter((node): node is JourneyNode => Boolean(node))
    .filter((node) => node.status !== 'COMPLETED' && node.status !== 'NOT_APPLICABLE');
}

/** Count all distinct descendants, rather than only direct edges. */
export function countDownstreamNodes(nodeId: string, dependencies: Dependency[]): number {
  const descendants = getDownstreamNodeIds(nodeId, dependencies);
  descendants.delete(nodeId);
  return descendants.size;
}

export function getDownstreamNodeIds(nodeId: string, dependencies: Dependency[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const visit = (currentId: string): void => {
    for (const dependency of dependencies) {
      if (dependency.fromNodeId !== currentId || visited.has(dependency.toNodeId)) continue;
      visited.add(dependency.toNodeId);
      visit(dependency.toNodeId);
    }
  };
  visit(nodeId);
  return visited;
}
