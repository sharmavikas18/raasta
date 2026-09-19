// RAASTA Bedrock Intent Extraction Prompt Contract — PRD §15, §16
// Strict schema prompt for natural language goal understanding.

export const INTENT_SYSTEM_PROMPT = `You are RAASTA's Goal Understanding & Intent Parsing Engine.
RAASTA turns real-world intent into a dependency-aware, deadline-aware, uncertainty-aware journey.

STRICT RULES:
1. Return ONLY valid, minified JSON matching the specified schema. No markdown backticks, no markdown fence, no preamble, no conversational filler.
2. NEVER invent facts, deadlines, official endorsements, or verified data.
3. If information is missing or ambiguous, explicitly classify it in "missingHighValueQuestions" or mark as UNKNOWN / NEEDS_VERIFICATION.
4. Keep questions high-value: ask at most 2 or 3 questions that materially alter the journey structure or deadlines.
5. Identify clear sequential steps, prerequisite dependencies, and potential failure points.
`;

export function buildIntentUserPrompt(
  userGoal: string,
  userContext?: Record<string, string>,
  availableDocumentSummaries?: string[]
): string {
  return `USER GOAL:
${userGoal}

KNOWN CONTEXT:
${userContext ? JSON.stringify(userContext, null, 2) : 'None provided'}

AVAILABLE DOCUMENTS:
${availableDocumentSummaries && availableDocumentSummaries.length > 0 ? availableDocumentSummaries.join('\n') : 'None'}

Return a JSON object conforming strictly to this structure:
{
  "normalizedGoal": "string - clear, concise goal title",
  "category": "SCHOLARSHIP" | "TRAVEL" | "EVENT" | "APPLICATION" | "EDUCATION" | "OTHER",
  "keyEntities": ["string - key entities like locations, organizations, programs"],
  "estimatedDeadline": "ISO-8601 string or null if not explicitly known or inferred",
  "constraints": ["string - explicit user or domain constraints"],
  "candidateNodes": [
    {
      "tempId": "string - e.g. node_1",
      "title": "string - concise action title",
      "description": "string - what must be done",
      "type": "TASK" | "DOCUMENT" | "VERIFICATION" | "BOOKING" | "REGISTRATION" | "PREPARATION" | "DEADLINE",
      "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "isRequired": boolean,
      "estimatedDaysBeforeDeadline": number or null,
      "suggestedVerificationState": "VERIFIED_OFFICIAL" | "VERIFIED_USER" | "COMMUNITY_REPORTED" | "AI_INFERRED" | "UNKNOWN"
    }
  ],
  "candidateDependencies": [
    {
      "fromTempId": "string",
      "toTempId": "string",
      "relationship": "string",
      "isBlocking": boolean
    }
  ],
  "missingHighValueQuestions": [
    {
      "question": "string - high impact question",
      "whyItMatters": "string - how answer changes journey",
      "impact": "STRUCTURE" | "READINESS" | "DEADLINE" | "ACCESSIBILITY" | "NEXT_ACTION"
    }
  ]
}`;
}
