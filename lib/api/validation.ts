// RAASTA AI output boundary. Model output is untrusted until it crosses here.

import type {
  ClarifyingQuestion,
  JourneyCategory,
  NodeType,
  Priority,
} from '@/types/domain';

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: string[];
}

export interface DocumentExtractionResult {
  title: string;
  deadline: string | null;
  eligibility: string[];
  required_documents: string[];
  steps: DocumentStep[];
  official_sources: Array<{ name: string; contactOrUrl: string }>;
  uncertainties: string[];
  notes: string[];
}

export interface DocumentStep {
  stepNumber: number;
  title: string;
  description: string;
  prerequisiteStepNumbers: number[];
}

export interface IntentCandidateNode {
  tempId: string;
  title: string;
  description: string;
  type: NodeType;
  priority: Priority;
  isRequired: boolean;
  estimatedDaysBeforeDeadline: number | null;
  suggestedVerificationState: string | null;
}

export interface IntentCandidateDependency {
  fromTempId: string;
  toTempId: string;
  relationship: string;
  isBlocking: boolean;
}

export interface IntentExtractionResult {
  normalizedGoal: string;
  category: JourneyCategory;
  keyEntities: string[];
  estimatedDeadline: string | null;
  constraints: string[];
  candidateNodes: IntentCandidateNode[];
  candidateDependencies: IntentCandidateDependency[];
  missingHighValueQuestions: ClarifyingQuestion[];
}

const CATEGORIES: ReadonlySet<JourneyCategory> = new Set([
  'SCHOLARSHIP',
  'TRAVEL',
  'EVENT',
  'APPLICATION',
  'EDUCATION',
  'OTHER',
]);
const NODE_TYPES: ReadonlySet<NodeType> = new Set([
  'TASK',
  'DOCUMENT',
  'VERIFICATION',
  'BOOKING',
  'REGISTRATION',
  'ACCESSIBILITY',
  'PREPARATION',
  'DEADLINE',
]);
const PRIORITIES: ReadonlySet<Priority> = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const QUESTION_IMPACTS: ReadonlySet<ClarifyingQuestion['impact']> = new Set([
  'STRUCTURE',
  'READINESS',
  'DEADLINE',
  'ACCESSIBILITY',
  'NEXT_ACTION',
]);

/** Extract JSON while tolerating a model that wrapped it in one Markdown fence. */
export function extractAndParseJson<T = unknown>(
  rawOutput: string
): { success: boolean; parsed?: T; error?: string } {
  try {
    let cleaned = rawOutput.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    return { success: true, parsed: JSON.parse(cleaned) as T };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Invalid syntax';
    return { success: false, error: `Failed to parse model JSON: ${reason}` };
  }
}

export function validateDocumentExtraction(input: unknown): ValidationResult<DocumentExtractionResult> {
  if (!isRecord(input)) return invalid('Extracted data must be a JSON object');

  const errors: string[] = [];
  const title = stringValue(input.title);
  if (!title) errors.push('Document title is missing or empty');

  const deadline = normalizeDate(input.deadline, 'deadline', errors);
  const eligibility = stringList(input.eligibility);
  const requiredDocuments = stringList(input.required_documents);
  const steps = normalizeDocumentSteps(input.steps, errors);
  const officialSources = normalizeOfficialSources(input.official_sources, errors);
  const uncertainties = stringList(input.uncertainties);
  const notes = stringList(input.notes);

  if (steps.length === 0) errors.push('At least one actionable document step is required');
  assertStepDependencies(steps, errors);

  if (errors.length > 0 || !title) return { isValid: false, data: null, errors };
  return {
    isValid: true,
    data: {
      title,
      deadline,
      eligibility,
      required_documents: requiredDocuments,
      steps,
      official_sources: officialSources,
      uncertainties,
      notes,
    },
    errors: [],
  };
}

export function validateIntentExtraction(input: unknown): ValidationResult<IntentExtractionResult> {
  if (!isRecord(input)) return invalid('Intent output must be a valid JSON object');

  const errors: string[] = [];
  const normalizedGoal = stringValue(input.normalizedGoal);
  if (!normalizedGoal) errors.push('normalizedGoal is required and cannot be empty');

  const category = CATEGORIES.has(input.category as JourneyCategory)
    ? (input.category as JourneyCategory)
    : 'OTHER';
  const estimatedDeadline = normalizeDate(input.estimatedDeadline, 'estimatedDeadline', errors);
  const candidateNodes = normalizeIntentNodes(input.candidateNodes, errors);
  const candidateDependencies = normalizeIntentDependencies(
    input.candidateDependencies,
    candidateNodes,
    errors
  );
  const questions = normalizeQuestions(input.missingHighValueQuestions);

  if (candidateNodes.length === 0) errors.push('At least one candidate node is required');
  assertIntentDependencyGraph(candidateNodes, candidateDependencies, errors);

  if (errors.length > 0 || !normalizedGoal) return { isValid: false, data: null, errors };
  return {
    isValid: true,
    data: {
      normalizedGoal,
      category,
      keyEntities: stringList(input.keyEntities),
      estimatedDeadline,
      constraints: stringList(input.constraints),
      candidateNodes,
      candidateDependencies,
      missingHighValueQuestions: questions,
    },
    errors: [],
  };
}

function normalizeDocumentSteps(value: unknown, errors: string[]): DocumentStep[] {
  if (!Array.isArray(value)) return [];
  const stepNumbers = new Set<number>();
  const steps: DocumentStep[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!isRecord(raw)) {
      errors.push(`Step ${index + 1} must be an object`);
      continue;
    }
    const title = stringValue(raw.title);
    if (!title) {
      errors.push(`Step ${index + 1} is missing a title`);
      continue;
    }
    const stepNumber = isPositiveInteger(raw.stepNumber) ? raw.stepNumber : index + 1;
    if (stepNumbers.has(stepNumber)) {
      errors.push(`Step number ${stepNumber} is duplicated`);
      continue;
    }
    stepNumbers.add(stepNumber);
    steps.push({
      stepNumber,
      title,
      description: stringValue(raw.description) || '',
      prerequisiteStepNumbers: uniquePositiveIntegers(raw.prerequisiteStepNumbers),
    });
  }
  return steps;
}

function normalizeOfficialSources(
  value: unknown,
  errors: string[]
): Array<{ name: string; contactOrUrl: string }> {
  if (!Array.isArray(value)) return [];
  const sources: Array<{ name: string; contactOrUrl: string }> = [];
  for (const source of value) {
    if (!isRecord(source)) {
      errors.push('Each official source must be an object');
      continue;
    }
    const name = stringValue(source.name);
    if (!name) {
      errors.push('An official source is missing a name');
      continue;
    }
    sources.push({ name, contactOrUrl: stringValue(source.contactOrUrl) || '' });
  }
  return sources;
}

function normalizeIntentNodes(value: unknown, errors: string[]): IntentCandidateNode[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const nodes: IntentCandidateNode[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!isRecord(raw)) {
      errors.push(`Candidate node ${index + 1} must be an object`);
      continue;
    }
    const tempId = stringValue(raw.tempId);
    const title = stringValue(raw.title);
    if (!tempId || !title) {
      errors.push(`Candidate node ${index + 1} requires tempId and title`);
      continue;
    }
    if (ids.has(tempId)) {
      errors.push(`Candidate node id "${tempId}" is duplicated`);
      continue;
    }
    if (!NODE_TYPES.has(raw.type as NodeType)) {
      errors.push(`Candidate node "${tempId}" has an invalid type`);
      continue;
    }
    if (!PRIORITIES.has(raw.priority as Priority)) {
      errors.push(`Candidate node "${tempId}" has an invalid priority`);
      continue;
    }
    if (typeof raw.isRequired !== 'boolean') {
      errors.push(`Candidate node "${tempId}" must specify isRequired`);
      continue;
    }
    const days = raw.estimatedDaysBeforeDeadline;
    if (days !== null && days !== undefined && (typeof days !== 'number' || !Number.isFinite(days) || days < 0)) {
      errors.push(`Candidate node "${tempId}" has an invalid deadline offset`);
      continue;
    }
    ids.add(tempId);
    nodes.push({
      tempId,
      title,
      description: stringValue(raw.description) || '',
      type: raw.type as NodeType,
      priority: raw.priority as Priority,
      isRequired: raw.isRequired,
      estimatedDaysBeforeDeadline: typeof days === 'number' ? days : null,
      suggestedVerificationState: stringValue(raw.suggestedVerificationState),
    });
  }
  return nodes;
}

function normalizeIntentDependencies(
  value: unknown,
  nodes: IntentCandidateNode[],
  errors: string[]
): IntentCandidateDependency[] {
  if (!Array.isArray(value)) return [];
  const knownIds = new Set(nodes.map((node) => node.tempId));
  const dependencies: IntentCandidateDependency[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!isRecord(raw)) {
      errors.push(`Candidate dependency ${index + 1} must be an object`);
      continue;
    }
    const fromTempId = stringValue(raw.fromTempId);
    const toTempId = stringValue(raw.toTempId);
    if (!fromTempId || !toTempId || !knownIds.has(fromTempId) || !knownIds.has(toTempId)) {
      errors.push(`Candidate dependency ${index + 1} references an unknown node`);
      continue;
    }
    if (fromTempId === toTempId) {
      errors.push(`Candidate dependency ${index + 1} cannot point to itself`);
      continue;
    }
    dependencies.push({
      fromTempId,
      toTempId,
      relationship: stringValue(raw.relationship) || 'PREREQUISITE',
      isBlocking: raw.isBlocking !== false,
    });
  }
  return dependencies;
}

function normalizeQuestions(value: unknown): ClarifyingQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: ClarifyingQuestion[] = [];
  for (const raw of value) {
    if (questions.length === 3 || !isRecord(raw)) continue;
    const question = stringValue(raw.question);
    const whyItMatters = stringValue(raw.whyItMatters);
    if (!question || !whyItMatters || !QUESTION_IMPACTS.has(raw.impact as ClarifyingQuestion['impact'])) continue;
    questions.push({
      id: `question-${questions.length + 1}`,
      question,
      whyItMatters,
      impact: raw.impact as ClarifyingQuestion['impact'],
    });
  }
  return questions;
}

function assertStepDependencies(steps: DocumentStep[], errors: string[]): void {
  const byNumber = new Map(steps.map((step) => [step.stepNumber, step]));
  for (const step of steps) {
    for (const prerequisite of step.prerequisiteStepNumbers) {
      if (!byNumber.has(prerequisite) || prerequisite === step.stepNumber) {
        errors.push(`Step ${step.stepNumber} has an invalid prerequisite`);
      }
    }
  }
  if (errors.length === 0 && hasCycle(steps.map((step) => step.stepNumber), (number) => byNumber.get(number)?.prerequisiteStepNumbers ?? [])) {
    errors.push('Document steps must not contain a prerequisite cycle');
  }
}

function assertIntentDependencyGraph(
  nodes: IntentCandidateNode[],
  dependencies: IntentCandidateDependency[],
  errors: string[]
): void {
  if (errors.length > 0) return;
  const outgoing = new Map(nodes.map((node) => [node.tempId, [] as string[]]));
  for (const dependency of dependencies) outgoing.get(dependency.fromTempId)?.push(dependency.toTempId);
  if (hasCycle(nodes.map((node) => node.tempId), (id) => outgoing.get(id) ?? [])) {
    errors.push('Candidate dependencies must not contain a cycle');
  }
}

function hasCycle<T>(ids: T[], getNeighbours: (id: T) => T[]): boolean {
  const visiting = new Set<T>();
  const visited = new Set<T>();
  const visit = (id: T): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const neighbour of getNeighbours(id)) if (visit(neighbour)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return ids.some(visit);
}

function normalizeDate(value: unknown, label: string, errors: string[]): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    errors.push(`${label} must be an ISO-8601 string or null`);
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`Invalid ${label} format: "${value}"`);
    return null;
  }
  return parsed.toISOString();
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function uniquePositiveIntegers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPositiveInteger))];
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid<T>(message: string): ValidationResult<T> {
  return { isValid: false, data: null, errors: [message] };
}
