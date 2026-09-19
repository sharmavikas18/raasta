/**
 * Canonical contract for the Bedrock-to-Raasta journey pipeline.
 * The legacy UI types remain intentionally compatible while the API migrates.
 */
export type TrustState = 'VERIFIED' | 'USER_PROVIDED' | 'COMMUNITY_REPORTED' | 'AI_INFERENCE' | 'UNKNOWN';

export interface EvidenceSource {
  id: string;
  kind: 'DOCUMENT' | 'OFFICIAL_URL' | 'USER_INPUT' | 'COMMUNITY' | 'AI_REASONING';
  label: string;
  documentId?: string;
  url?: string;
  excerpt?: string;
  capturedAt: string;
}

export interface Provenance {
  trust: TrustState;
  evidenceIds: string[];
  /** Present only for model inference; it is never a claim of factual certainty. */
  confidence?: number;
  needsVerification: boolean;
}

export interface JourneyRequirement {
  id: string;
  label: string;
  category: 'DOCUMENT' | 'ELIGIBILITY' | 'PAYMENT' | 'VERIFICATION' | 'OTHER';
  required: boolean;
  status: 'MISSING' | 'AVAILABLE' | 'SUBMITTED' | 'NOT_APPLICABLE' | 'UNKNOWN';
  provenance: Provenance;
  linkedTaskIds: string[];
}

export interface JourneyTask {
  id: string;
  title: string;
  description?: string;
  kind: 'ACTION' | 'DOCUMENT' | 'VERIFICATION' | 'BOOKING' | 'REGISTRATION';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'NEEDS_VERIFICATION';
  required: boolean;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  dueAt?: string;
  durationDays?: number;
  requirementIds: string[];
  provenance: Provenance;
}

export interface JourneyDependency {
  id: string;
  /** The predecessor must happen before the successor. The persisted graph must be acyclic. */
  predecessorTaskId: string;
  successorTaskId: string;
  relation: 'BLOCKS' | 'REQUIRES' | 'RECOMMENDED_BEFORE';
  provenance: Provenance;
}

export interface JourneyUnknown {
  id: string;
  question: string;
  whyItMatters: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  resolutionAction: string;
  linkedTaskIds: string[];
  provenance: Provenance;
}

export interface JourneyRisk {
  id: string;
  title: string;
  consequence: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
  linkedTaskIds: string[];
  provenance: Provenance;
}

export interface BedrockJourneyProposal {
  normalizedGoal: string;
  category: 'SCHOLARSHIP' | 'TRAVEL' | 'EVENT' | 'APPLICATION' | 'OTHER';
  evidence: EvidenceSource[];
  requirements: JourneyRequirement[];
  tasks: JourneyTask[];
  dependencies: JourneyDependency[];
  unknowns: JourneyUnknown[];
  risks: JourneyRisk[];
  clarifyingQuestions: Array<{ question: string; whyItMatters: string }>;
}
