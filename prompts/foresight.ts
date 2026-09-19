// RAASTA Foresight Reasoning Prompt Contract — PRD §12, §15, §16
// Language reasoning over graph structure to discover hidden pitfalls and blind spots.

import { JourneyNode, Dependency, Evidence } from '@/types/domain';

export const FORESIGHT_SYSTEM_PROMPT = `You are RAASTA's Foresight Engine.
You look for preventable future surprises: what could break this journey before the user discovers it too late?

STRICT CONSTRAINTS:
1. Return ONLY valid, minified JSON conforming to the schema.
2. Produce SPECIFIC, actionable foresight. Avoid vague warnings like "there may be issues".
3. Ground every insight in the nodes, dates, dependencies, or missing context provided.
4. Mark items that require external confirmation with verificationRequired: true.
`;

export function buildForesightUserPrompt(
  journeyTitle: string,
  deadline: string | null,
  nodes: JourneyNode[],
  dependencies: Dependency[],
  evidence: Evidence[],
  accessibilityContext?: string
): string {
  return `JOURNEY:
Title: ${journeyTitle}
Overall Deadline: ${deadline || 'None specified'}

ACCESSIBILITY CONTEXT:
${accessibilityContext || 'None enabled'}

CURRENT NODES:
${JSON.stringify(
  nodes.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    status: n.status,
    priority: n.priority,
    dueAt: n.dueAt,
    blockedReason: n.blockedReason,
  })),
  null,
  2
)}

DEPENDENCIES:
${JSON.stringify(dependencies, null, 2)}

EVIDENCE / KNOWN SOURCES:
${JSON.stringify(
  evidence.map((e) => ({
    nodeId: e.nodeId,
    label: e.label,
    verificationState: e.verificationState,
    referenceText: e.referenceText,
  })),
  null,
  2
)}

Return a JSON object conforming strictly to this schema:
{
  "insights": [
    {
      "title": "string - concise problem statement",
      "type": "MISSING_PREREQUISITE" | "DEADLINE_RISK" | "DEPENDENCY_CHAIN" | "INFORMATION_UNCERTAINTY" | "CHANGE_IMPACT" | "ACCESSIBILITY_UNKNOWN" | "CONFLICT",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "explanation": "string - concrete reason why this surprise happens if unaddressed",
      "affectedNodeIds": ["string - IDs of affected nodes"],
      "suggestedAction": "string - exact immediate preventative action to take",
      "verificationRequired": boolean
    }
  ]
}`;
}
