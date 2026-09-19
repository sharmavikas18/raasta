// RAASTA Domain Types — PRD §8, §9, §17

// ─── Status Enums ─────────────────────────────────────────────

export type JourneyStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type NodeStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'NEEDS_VERIFICATION'
  | 'NOT_APPLICABLE';

export type VerificationState =
  | 'VERIFIED_OFFICIAL'
  | 'VERIFIED_USER'
  | 'COMMUNITY_REPORTED'
  | 'AI_INFERRED'
  | 'UNKNOWN'
  | 'STALE';

export type JourneyCategory =
  | 'SCHOLARSHIP'
  | 'TRAVEL'
  | 'EVENT'
  | 'APPLICATION'
  | 'EDUCATION'
  | 'OTHER';

export type NodeType =
  | 'TASK'
  | 'DOCUMENT'
  | 'VERIFICATION'
  | 'BOOKING'
  | 'REGISTRATION'
  | 'ACCESSIBILITY'
  | 'PREPARATION'
  | 'DEADLINE';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ChangeType =
  | 'VENUE_CHANGE'
  | 'DATE_CHANGE'
  | 'REQUIREMENT_CHANGE'
  | 'STATUS_CHANGE'
  | 'INFORMATION_UPDATE';

export type ConstraintType =
  | 'STEP_FREE'
  | 'VISUAL_ASSISTANCE'
  | 'HEARING_COMMUNICATION'
  | 'REDUCED_WALKING';

// ─── Core Entities ────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  preferredLanguage: string;
  accessibilityPreferences: UserProfileConstraint[];
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  deadlineReminders: boolean;
  journeyChanges: boolean;
  newInsights: boolean;
}

export interface UserProfileConstraint {
  constraintType: ConstraintType;
  enabled: boolean;
  source: VerificationState;
  updatedAt: string;
}

export interface Journey {
  id: string;
  userId: string;
  title: string;
  originalIntent: string;
  category: JourneyCategory;
  status: JourneyStatus;
  readinessPercent: number | null; // null when data insufficient
  deadline: string | null; // ISO-8601
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyNode {
  id: string;
  journeyId: string;
  title: string;
  description: string;
  type: NodeType;
  status: NodeStatus;
  priority: Priority;
  dueAt: string | null;
  blockedReason: string | null;
  nextAction: string | null;
  isRequired: boolean;
  weight: number; // for readiness calculation (1-10)
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  journeyId: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: string;
  isBlocking: boolean;
}

export interface Evidence {
  id: string;
  journeyId: string;
  nodeId: string;
  type: string;
  label: string;
  url: string | null;
  referenceText: string;
  verificationState: VerificationState;
  capturedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  journeyId: string | null;
  fileName: string;
  s3Key: string;
  mimeType: string;
  status: 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'ANALYZED' | 'ERROR';
  extractedData: DocumentExtraction | null;
  createdAt: string;
}

export interface DocumentExtraction {
  title: string;
  deadline: string | null;
  eligibility: string[];
  requiredDocuments: string[];
  steps: string[];
  officialSources: string[];
  uncertainties: string[];
  notes: string[];
}

export interface ChangeEvent {
  id: string;
  journeyId: string;
  nodeId: string | null;
  changeType: ChangeType;
  oldValue: string;
  newValue: string;
  impact: string[];
  source: string;
  createdAt: string;
}

// ─── Computed / Derived Types ─────────────────────────────────

export interface ReadinessResult {
  percent: number | null;
  totalRequired: number;
  completedRequired: number;
  blockerCount: number;
  criticalUnknowns: number;
  qualitativeState: string | null; // when percent is null
}

export interface NextAction {
  nodeId: string;
  title: string;
  reason: string;
  urgency: Priority;
  blocksCount: number;
}

export interface ForesightInsight {
  id: string;
  type: 'MISSING_PREREQUISITE' | 'DEADLINE_RISK' | 'DEPENDENCY_CHAIN' | 'INFORMATION_UNCERTAINTY' | 'CHANGE_IMPACT' | 'ACCESSIBILITY_UNKNOWN' | 'CONFLICT';
  title: string;
  explanation: string;
  severity: Priority;
  affectedNodeIds: string[];
  suggestedAction: string;
  verificationRequired: boolean;
}

export interface JourneyDetail {
  journey: Journey;
  nodes: JourneyNode[];
  dependencies: Dependency[];
  evidence: Evidence[];
  changeEvents: ChangeEvent[];
  readiness: ReadinessResult;
  nextAction: NextAction | null;
  foresightInsights: ForesightInsight[];
}

// ─── API Request/Response Types ───────────────────────────────

export interface CreateJourneyRequest {
  intent: string;
  context?: Record<string, string>;
  profile?: Partial<User>;
}

export interface CreateJourneyResponse {
  journeyId: string;
  status: JourneyStatus;
  readinessPercent: number | null;
  nextAction: NextAction | null;
  nodes: JourneyNode[];
  unknowns: string[];
  clarifyingQuestions?: ClarifyingQuestion[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  impact: 'STRUCTURE' | 'READINESS' | 'DEADLINE' | 'ACCESSIBILITY' | 'NEXT_ACTION';
}

export interface SimulateChangeRequest {
  nodeId: string;
  changeType: ChangeType;
  oldValue: string;
  newValue: string;
}
