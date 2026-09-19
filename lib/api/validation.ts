// RAASTA AI Output Validation & Normalization Pipeline — PRD §30
// Strict parsing, schema validation, business-rule validation, and safe failure guards.

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: string[];
}

/**
 * Extracts and cleans JSON from raw LLM output strings (handling markdown blocks if present)
 */
export function extractAndParseJson<T>(rawOutput: string): { success: boolean; parsed?: T; error?: string } {
  try {
    let cleaned = rawOutput.trim();
    // Remove markdown code blocks if the model wrapped output in ```json ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    const parsed = JSON.parse(cleaned) as T;
    return { success: true, parsed };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse model JSON: ${err?.message || 'Invalid syntax'}`,
    };
  }
}

/**
 * Validate Document Intelligence extraction against PRD §14 schema
 */
export function validateDocumentExtraction(input: any): ValidationResult<{
  title: string;
  deadline: string | null;
  eligibility: string[];
  required_documents: string[];
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    prerequisiteStepNumbers: number[];
  }>;
  official_sources: Array<{ name: string; contactOrUrl: string }>;
  uncertainties: string[];
  notes: string[];
}> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, data: null, errors: ['Extracted data must be a JSON object'] };
  }

  if (typeof input.title !== 'string' || !input.title.trim()) {
    errors.push('Document title is missing or empty');
  }

  // Validate deadline format if present
  let normalizedDeadline: string | null = null;
  if (input.deadline) {
    if (typeof input.deadline === 'string') {
      const d = new Date(input.deadline);
      if (isNaN(d.getTime())) {
        errors.push(`Invalid deadline format: "${input.deadline}". Must be a valid ISO-8601 date.`);
      } else {
        normalizedDeadline = d.toISOString();
      }
    } else {
      errors.push('Deadline must be an ISO string or null');
    }
  }

  const eligibility = Array.isArray(input.eligibility)
    ? input.eligibility.filter((e: any) => typeof e === 'string' && e.trim())
    : [];

  const required_documents = Array.isArray(input.required_documents)
    ? input.required_documents.filter((d: any) => typeof d === 'string' && d.trim())
    : [];

  const steps: any[] = [];
  if (Array.isArray(input.steps)) {
    for (let i = 0; i < input.steps.length; i++) {
      const s = input.steps[i];
      if (typeof s === 'object' && s !== null && typeof s.title === 'string' && s.title.trim()) {
        steps.push({
          stepNumber: typeof s.stepNumber === 'number' ? s.stepNumber : i + 1,
          title: s.title.trim(),
          description: typeof s.description === 'string' ? s.description.trim() : '',
          prerequisiteStepNumbers: Array.isArray(s.prerequisiteStepNumbers)
            ? s.prerequisiteStepNumbers.filter((n: any) => typeof n === 'number')
            : [],
        });
      }
    }
  }

  const official_sources = Array.isArray(input.official_sources)
    ? input.official_sources
        .filter((src: any) => typeof src === 'object' && src !== null && typeof src.name === 'string')
        .map((src: any) => ({
          name: String(src.name).trim(),
          contactOrUrl: String(src.contactOrUrl || '').trim(),
        }))
    : [];

  const uncertainties = Array.isArray(input.uncertainties)
    ? input.uncertainties.filter((u: any) => typeof u === 'string' && u.trim())
    : [];

  const notes = Array.isArray(input.notes)
    ? input.notes.filter((n: any) => typeof n === 'string' && n.trim())
    : [];

  if (errors.length > 0) {
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data: {
      title: input.title.trim(),
      deadline: normalizedDeadline,
      eligibility,
      required_documents,
      steps,
      official_sources,
      uncertainties,
      notes,
    },
    errors: [],
  };
}

/**
 * Validate Intent Extraction response against PRD §16 schema
 */
export function validateIntentExtraction(input: any): ValidationResult<{
  normalizedGoal: string;
  category: string;
  keyEntities: string[];
  estimatedDeadline: string | null;
  constraints: string[];
  candidateNodes: any[];
  candidateDependencies: any[];
  missingHighValueQuestions: any[];
}> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, data: null, errors: ['Intent output must be a valid JSON object'] };
  }

  if (typeof input.normalizedGoal !== 'string' || !input.normalizedGoal.trim()) {
    errors.push('normalizedGoal is required and cannot be empty');
  }

  const allowedCategories = ['SCHOLARSHIP', 'TRAVEL', 'EVENT', 'APPLICATION', 'EDUCATION', 'OTHER'];
  const category = allowedCategories.includes(input.category) ? input.category : 'OTHER';

  let estimatedDeadline: string | null = null;
  if (input.estimatedDeadline) {
    const d = new Date(input.estimatedDeadline);
    if (!isNaN(d.getTime())) {
      estimatedDeadline = d.toISOString();
    }
  }

  if (errors.length > 0) {
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data: {
      normalizedGoal: input.normalizedGoal.trim(),
      category,
      keyEntities: Array.isArray(input.keyEntities) ? input.keyEntities.map(String) : [],
      estimatedDeadline,
      constraints: Array.isArray(input.constraints) ? input.constraints.map(String) : [],
      candidateNodes: Array.isArray(input.candidateNodes) ? input.candidateNodes : [],
      candidateDependencies: Array.isArray(input.candidateDependencies) ? input.candidateDependencies : [],
      missingHighValueQuestions: Array.isArray(input.missingHighValueQuestions)
        ? input.missingHighValueQuestions
        : [],
    },
    errors: [],
  };
}
