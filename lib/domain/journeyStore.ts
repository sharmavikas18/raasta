// RAASTA Journey Storage & Business Service — PRD §8, §25, §26
// Bridges UI/API to deterministic calculation engines and data persistence (In-Memory + DynamoDB compatible).

import {
  Journey,
  JourneyNode,
  Dependency,
  Evidence,
  ChangeEvent,
  User,
  JourneyDetail,
  NodeStatus,
  ChangeType,
} from '@/types/domain';
import { DomainError } from '@/lib/domain/errors';
import {
  assertValidJourneyGraph,
  getUnmetBlockingDependencies,
  isChangeType,
  isNodeStatus,
} from '@/lib/domain/graph';
import { calculateReadiness } from '@/lib/readiness/engine';
import { selectNextAction } from '@/lib/readiness/nextAction';
import { generateForesightInsights } from '@/lib/foresight/engine';
import { adaptJourneyForAccessibility } from '@/lib/accessibility/adapter';
import { applyJourneyChange } from '@/lib/domain/changeEngine';
import {
  DEMO_USER,
  SCHOLARSHIP_JOURNEY,
  SCHOLARSHIP_NODES,
  SCHOLARSHIP_DEPENDENCIES,
  SCHOLARSHIP_EVIDENCE,
  CONFERENCE_JOURNEY,
  CONFERENCE_NODES,
  CONFERENCE_DEPENDENCIES,
  CONFERENCE_EVIDENCE,
} from '@/lib/mock/demoData';

// ─── In-Memory Store State ─────────────────────────────────────

class JourneyStore {
  private users: Map<string, User> = new Map();
  private journeys: Map<string, Journey> = new Map();
  private nodes: Map<string, JourneyNode[]> = new Map(); // journeyId -> nodes
  private dependencies: Map<string, Dependency[]> = new Map(); // journeyId -> deps
  private evidence: Map<string, Evidence[]> = new Map(); // journeyId -> evidence
  private changeEvents: Map<string, ChangeEvent[]> = new Map(); // journeyId -> events

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.users.set(DEMO_USER.id, { ...DEMO_USER });

    // Seed Scholarship
    this.storeGraph(
      SCHOLARSHIP_JOURNEY,
      SCHOLARSHIP_NODES,
      SCHOLARSHIP_DEPENDENCIES,
      SCHOLARSHIP_EVIDENCE
    );
    this.changeEvents.set(SCHOLARSHIP_JOURNEY.id, []);

    // Seed Conference
    this.storeGraph(
      CONFERENCE_JOURNEY,
      CONFERENCE_NODES,
      CONFERENCE_DEPENDENCIES,
      CONFERENCE_EVIDENCE
    );
    this.changeEvents.set(CONFERENCE_JOURNEY.id, []);
  }

  public getUser(userId: string): User {
    const user = this.users.get(userId);
    if (!user) {
      // Return default user for smooth demo
      return { ...DEMO_USER, id: userId };
    }
    return { ...user, accessibilityPreferences: user.accessibilityPreferences.map((p) => ({ ...p })) };
  }

  public updateUser(userId: string, updates: Partial<User>): User {
    const user = this.getUser(userId);
    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, cloneUser(updated));
    return cloneUser(updated);
  }

  public getJourneys(userId: string): Journey[] {
    const list: Journey[] = [];
    for (const journey of this.journeys.values()) {
      if (journey.userId === userId) {
        // Recompute current readiness percent
        const nodes = this.nodes.get(journey.id) || [];
        const deps = this.dependencies.get(journey.id) || [];
        const readiness = calculateReadiness(nodes, deps);
        list.push({
          ...cloneJourney(journey),
          readinessPercent: readiness.percent,
        });
      }
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getJourneyDetail(journeyId: string, userId: string): JourneyDetail | null {
    const journey = this.journeys.get(journeyId);
    if (!journey) return null;

    // PRD §24 / AT-08: Enforce ownership check
    if (journey.userId !== userId && userId !== 'system_admin') {
      throw new DomainError('FORBIDDEN_OWNERSHIP_MISMATCH', 'Forbidden: You do not own this journey.');
    }

    const nodes = this.nodes.get(journeyId) || [];
    const deps = this.dependencies.get(journeyId) || [];
    const ev = this.evidence.get(journeyId) || [];
    const events = this.changeEvents.get(journeyId) || [];
    const user = this.getUser(userId);

    const readiness = calculateReadiness(nodes, deps);
    const nextAction = selectNextAction(nodes, deps);
    const foresightInsights = generateForesightInsights(
      nodes,
      deps,
      ev,
      user.accessibilityPreferences,
      journey.deadline
    );

    return {
      journey: {
        ...cloneJourney(journey),
        readinessPercent: readiness.percent,
      },
      nodes: nodes.map(cloneNode),
      dependencies: deps.map(cloneDependency),
      evidence: ev.map(cloneEvidence),
      changeEvents: events.map(cloneChangeEvent),
      readiness,
      nextAction,
      foresightInsights,
    };
  }

  public createJourney(
    journey: Journey,
    nodes: JourneyNode[],
    dependencies: Dependency[],
    evidence: Evidence[] = []
  ): JourneyDetail {
    if (this.journeys.has(journey.id)) {
      throw new DomainError('DUPLICATE_ID', `Journey "${journey.id}" already exists.`);
    }

    const now = new Date().toISOString();
    const createdJourney = { ...journey, createdAt: now, updatedAt: now };
    const createdNodes = nodes.map((node) => ({
      ...node,
      journeyId: createdJourney.id,
      createdAt: node.createdAt || now,
      updatedAt: node.updatedAt || now,
    }));
    const createdDependencies = dependencies.map((dependency) => ({
      ...dependency,
      journeyId: createdJourney.id,
    }));
    const createdEvidence = evidence.map((item) => ({ ...item, journeyId: createdJourney.id }));

    this.storeGraph(createdJourney, createdNodes, createdDependencies, createdEvidence);
    this.changeEvents.set(createdJourney.id, []);

    return this.getJourneyDetail(createdJourney.id, createdJourney.userId)!;
  }

  public updateNode(
    journeyId: string,
    nodeId: string,
    userId: string,
    updates: NodeUpdate
  ): JourneyDetail {
    const journey = this.journeys.get(journeyId);
    if (!journey) throw new DomainError('JOURNEY_NOT_FOUND', 'Journey not found.');
    if (journey.userId !== userId) {
      throw new DomainError('FORBIDDEN_OWNERSHIP_MISMATCH', 'Forbidden: You do not own this journey.');
    }

    const nodes = this.nodes.get(journeyId) || [];
    const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) throw new DomainError('NODE_NOT_FOUND', 'Journey node not found.');

    if (updates.status !== undefined && !isNodeStatus(updates.status)) {
      throw new DomainError('INVALID_NODE_STATUS', 'The requested node status is invalid.');
    }
    if (updates.status === undefined && updates.nextAction === undefined && updates.blockedReason === undefined) {
      throw new DomainError('INVALID_UPDATE', 'Provide at least one node field to update.');
    }

    const currentNode = nodes[nodeIndex];
    if (updates.status === 'COMPLETED') {
      const unmet = getUnmetBlockingDependencies(nodeId, nodes, this.dependencies.get(journeyId) || []);
      if (unmet.length > 0) {
        throw new DomainError(
          'NODE_DEPENDENCY_UNMET',
          `Complete "${unmet[0].title}" before marking this step complete.`
        );
      }
    }

    const updatedNode = {
      ...currentNode,
      ...updates,
      blockedReason:
        updates.status && updates.status !== 'BLOCKED' && updates.blockedReason === undefined
          ? null
          : updates.blockedReason === undefined
            ? currentNode.blockedReason
            : updates.blockedReason,
      nextAction:
        updates.status === 'COMPLETED' && updates.nextAction === undefined
          ? null
          : updates.nextAction === undefined
            ? currentNode.nextAction
            : updates.nextAction,
      updatedAt: new Date().toISOString(),
    };
    const updatedNodes = nodes.map((node, index) => (index === nodeIndex ? updatedNode : node));

    this.storeGraph(
      this.reconcileJourneyStatus(journey, updatedNodes),
      updatedNodes,
      this.dependencies.get(journeyId) || [],
      this.evidence.get(journeyId) || []
    );

    return this.getJourneyDetail(journeyId, userId)!;
  }

  public simulateChange(
    journeyId: string,
    nodeId: string,
    userId: string,
    changeType: ChangeType,
    oldValue: string,
    newValue: string
  ): JourneyDetail {
    const journey = this.journeys.get(journeyId);
    if (!journey) throw new DomainError('JOURNEY_NOT_FOUND', 'Journey not found.');
    if (journey.userId !== userId) {
      throw new DomainError('FORBIDDEN_OWNERSHIP_MISMATCH', 'Forbidden: You do not own this journey.');
    }
    if (!isChangeType(changeType)) {
      throw new DomainError('INVALID_CHANGE_TYPE', 'The requested change type is invalid.');
    }

    const nodes = this.nodes.get(journeyId) || [];
    const deps = this.dependencies.get(journeyId) || [];
    if (!nodes.some((node) => node.id === nodeId)) {
      throw new DomainError('NODE_NOT_IN_JOURNEY', 'The change target does not belong to this journey.');
    }

    const { updatedNodes, changeEvent } = applyJourneyChange(
      journeyId,
      nodeId,
      changeType,
      oldValue,
      newValue,
      nodes,
      deps
    );

    this.storeGraph(
      { ...journey, updatedAt: new Date().toISOString() },
      updatedNodes,
      deps,
      this.evidence.get(journeyId) || []
    );
    const existingEvents = this.changeEvents.get(journeyId) || [];
    this.changeEvents.set(journeyId, [cloneChangeEvent(changeEvent), ...existingEvents.map(cloneChangeEvent)]);

    return this.getJourneyDetail(journeyId, userId)!;
  }

  public adaptAccessibility(journeyId: string, userId: string): JourneyDetail {
    const journey = this.journeys.get(journeyId);
    if (!journey) throw new DomainError('JOURNEY_NOT_FOUND', 'Journey not found.');
    if (journey.userId !== userId) {
      throw new DomainError('FORBIDDEN_OWNERSHIP_MISMATCH', 'Forbidden: You do not own this journey.');
    }

    const user = this.getUser(userId);
    const nodes = this.nodes.get(journeyId) || [];
    const deps = this.dependencies.get(journeyId) || [];
    const ev = this.evidence.get(journeyId) || [];

    const { updatedNodes, updatedDependencies, updatedEvidence, addedEvents } =
      adaptJourneyForAccessibility(
        journeyId,
        nodes,
        deps,
        ev,
        user.accessibilityPreferences
      );

    this.storeGraph(
      { ...journey, updatedAt: new Date().toISOString() },
      updatedNodes,
      updatedDependencies,
      updatedEvidence
    );

    const existingEvents = this.changeEvents.get(journeyId) || [];
    this.changeEvents.set(journeyId, [
      ...addedEvents.map(cloneChangeEvent),
      ...existingEvents.map(cloneChangeEvent),
    ]);

    return this.getJourneyDetail(journeyId, userId)!;
  }

  private storeGraph(
    journey: Journey,
    nodes: JourneyNode[],
    dependencies: Dependency[],
    evidence: Evidence[]
  ): void {
    assertValidJourneyGraph(journey, nodes, dependencies);
    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const item of evidence) {
      if (item.journeyId !== journey.id || !nodeIds.has(item.nodeId)) {
        throw new DomainError('INVALID_GRAPH', 'Every evidence item must belong to a node in its journey.');
      }
    }

    this.journeys.set(journey.id, cloneJourney(journey));
    this.nodes.set(journey.id, nodes.map(cloneNode));
    this.dependencies.set(journey.id, dependencies.map(cloneDependency));
    this.evidence.set(journey.id, evidence.map(cloneEvidence));
  }

  private reconcileJourneyStatus(journey: Journey, nodes: JourneyNode[]): Journey {
    const requiredNodes = nodes.filter((node) => node.isRequired);
    const allRequiredComplete =
      requiredNodes.length > 0 &&
      requiredNodes.every(
        (node) => node.status === 'COMPLETED' || node.status === 'NOT_APPLICABLE'
      );
    const status = allRequiredComplete
      ? 'COMPLETED'
      : journey.status === 'COMPLETED'
        ? 'ACTIVE'
        : journey.status;
    return { ...journey, status, updatedAt: new Date().toISOString() };
  }
}

interface NodeUpdate {
  status?: NodeStatus;
  nextAction?: string | null;
  blockedReason?: string | null;
}

function cloneJourney(journey: Journey): Journey {
  return { ...journey };
}

function cloneNode(node: JourneyNode): JourneyNode {
  return { ...node };
}

function cloneDependency(dependency: Dependency): Dependency {
  return { ...dependency };
}

function cloneEvidence(evidence: Evidence): Evidence {
  return { ...evidence };
}

function cloneChangeEvent(event: ChangeEvent): ChangeEvent {
  return { ...event, impact: [...event.impact] };
}

function cloneUser(user: User): User {
  return {
    ...user,
    accessibilityPreferences: user.accessibilityPreferences.map((preference) => ({ ...preference })),
    notificationPreferences: { ...user.notificationPreferences },
  };
}

// Global singleton instance
export const journeyStore = new JourneyStore();
