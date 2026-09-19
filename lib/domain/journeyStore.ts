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
    this.journeys.set(SCHOLARSHIP_JOURNEY.id, { ...SCHOLARSHIP_JOURNEY });
    this.nodes.set(SCHOLARSHIP_JOURNEY.id, SCHOLARSHIP_NODES.map((n) => ({ ...n })));
    this.dependencies.set(
      SCHOLARSHIP_JOURNEY.id,
      SCHOLARSHIP_DEPENDENCIES.map((d) => ({ ...d }))
    );
    this.evidence.set(SCHOLARSHIP_JOURNEY.id, SCHOLARSHIP_EVIDENCE.map((e) => ({ ...e })));
    this.changeEvents.set(SCHOLARSHIP_JOURNEY.id, []);

    // Seed Conference
    this.journeys.set(CONFERENCE_JOURNEY.id, { ...CONFERENCE_JOURNEY });
    this.nodes.set(CONFERENCE_JOURNEY.id, CONFERENCE_NODES.map((n) => ({ ...n })));
    this.dependencies.set(
      CONFERENCE_JOURNEY.id,
      CONFERENCE_DEPENDENCIES.map((d) => ({ ...d }))
    );
    this.evidence.set(CONFERENCE_JOURNEY.id, CONFERENCE_EVIDENCE.map((e) => ({ ...e })));
    this.changeEvents.set(CONFERENCE_JOURNEY.id, []);
  }

  public getUser(userId: string): User {
    const user = this.users.get(userId);
    if (!user) {
      // Return default user for smooth demo
      return { ...DEMO_USER, id: userId };
    }
    return user;
  }

  public updateUser(userId: string, updates: Partial<User>): User {
    const user = this.getUser(userId);
    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return updated;
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
          ...journey,
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
      throw new Error('FORBIDDEN_OWNERSHIP_MISMATCH');
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
        ...journey,
        readinessPercent: readiness.percent,
      },
      nodes,
      dependencies: deps,
      evidence: ev,
      changeEvents: events,
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
    const now = new Date().toISOString();
    journey.createdAt = now;
    journey.updatedAt = now;

    this.journeys.set(journey.id, journey);
    this.nodes.set(journey.id, nodes);
    this.dependencies.set(journey.id, dependencies);
    this.evidence.set(journey.id, evidence);
    this.changeEvents.set(journey.id, []);

    return this.getJourneyDetail(journey.id, journey.userId)!;
  }

  public updateNode(
    journeyId: string,
    nodeId: string,
    userId: string,
    updates: Partial<JourneyNode>
  ): JourneyDetail {
    const journey = this.journeys.get(journeyId);
    if (!journey) throw new Error('JOURNEY_NOT_FOUND');
    if (journey.userId !== userId) throw new Error('FORBIDDEN_OWNERSHIP_MISMATCH');

    const nodes = this.nodes.get(journeyId) || [];
    const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) throw new Error('NODE_NOT_FOUND');

    const updatedNode = {
      ...nodes[nodeIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    nodes[nodeIndex] = updatedNode;
    this.nodes.set(journeyId, nodes);

    // Update journey timestamp
    journey.updatedAt = new Date().toISOString();
    this.journeys.set(journeyId, journey);

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
    if (!journey) throw new Error('JOURNEY_NOT_FOUND');
    if (journey.userId !== userId) throw new Error('FORBIDDEN_OWNERSHIP_MISMATCH');

    const nodes = this.nodes.get(journeyId) || [];
    const deps = this.dependencies.get(journeyId) || [];

    const { updatedNodes, changeEvent } = applyJourneyChange(
      journeyId,
      nodeId,
      changeType,
      oldValue,
      newValue,
      nodes,
      deps
    );

    this.nodes.set(journeyId, updatedNodes);
    const existingEvents = this.changeEvents.get(journeyId) || [];
    this.changeEvents.set(journeyId, [changeEvent, ...existingEvents]);

    journey.updatedAt = new Date().toISOString();
    this.journeys.set(journeyId, journey);

    return this.getJourneyDetail(journeyId, userId)!;
  }

  public adaptAccessibility(journeyId: string, userId: string): JourneyDetail {
    const journey = this.journeys.get(journeyId);
    if (!journey) throw new Error('JOURNEY_NOT_FOUND');
    if (journey.userId !== userId) throw new Error('FORBIDDEN_OWNERSHIP_MISMATCH');

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

    this.nodes.set(journeyId, updatedNodes);
    this.dependencies.set(journeyId, updatedDependencies);
    this.evidence.set(journeyId, updatedEvidence);

    const existingEvents = this.changeEvents.get(journeyId) || [];
    this.changeEvents.set(journeyId, [...addedEvents, ...existingEvents]);

    journey.updatedAt = new Date().toISOString();
    this.journeys.set(journeyId, journey);

    return this.getJourneyDetail(journeyId, userId)!;
  }
}

// Global singleton instance
export const journeyStore = new JourneyStore();
