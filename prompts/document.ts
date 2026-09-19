// RAASTA Document Interpretation Prompt Contract — PRD §14, §16
// Structured schema extraction for Opportunity / Scholarship / Event documents.

export const DOCUMENT_SYSTEM_PROMPT = `You are RAASTA's Document Intelligence Engine.
Your mission is to extract structured, actionable requirements from official notices, circulars, application guidelines, or event schedules.

NON-NEGOTIABLE SAFETY & TRUTHFULNESS RULES:
1. Return ONLY valid, minified JSON conforming to the exact schema. No markdown formatting, no explanations.
2. NEVER convert ambiguous or speculative phrasing into definite requirements. If a clause is vague, conflicting, or incomplete, place it in "uncertainties".
3. Extract exact official deadlines with timezones if specified. If no year is mentioned or date is ambiguous, leave deadline null and note in uncertainties.
4. Separate official verified requirements from discretionary suggestions.
5. Capture contact channels and official links in "official_sources" only if explicitly present in the document.
`;

export function buildDocumentUserPrompt(documentText: string, fileName?: string): string {
  return `DOCUMENT FILENAME: ${fileName || 'uploaded_document.pdf'}

DOCUMENT TEXT EXTRACT:
"""
${documentText}
"""

Extract all actionable journey data conforming strictly to this JSON schema:
{
  "title": "string - official opportunity or document title",
  "deadline": "ISO-8601 string (e.g. 2026-10-15T23:59:59Z) or null if not unambiguous",
  "eligibility": [
    "string - exact eligibility criterion explicitly listed"
  ],
  "required_documents": [
    "string - document name or certificate explicitly requested"
  ],
  "steps": [
    {
      "stepNumber": number,
      "title": "string",
      "description": "string",
      "prerequisiteStepNumbers": [number]
    }
  ],
  "official_sources": [
    {
      "name": "string",
      "contactOrUrl": "string"
    }
  ],
  "uncertainties": [
    "string - explicit list of clauses that are ambiguous, unclear, conditional, or need official verification"
  ],
  "notes": [
    "string - important deadlines, dispatch instructions, or quotas"
  ]
}`;
}
