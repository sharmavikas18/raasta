// RAASTA Accessibility Adaptation Engine — PRD §7 Flow 3, §17, AT-06
// Deterministic rule-based adaptation. NEVER fabricates accessibility facts.

import type {
  JourneyNode,
  Dependency,
  Evidence,
  UserProfileConstraint,
  ConstraintType,
  ChangeEvent,
} from '../../types/domain.ts';

export interface AccessibilityAdaptationResult {
  updatedNodes: JourneyNode[];
  updatedDependencies: Dependency[];
  updatedEvidence: Evidence[];
  addedEvents: ChangeEvent[];
  impactSummary: string[];
}

/**
 * Adapts a journey graph based on active user accessibility preferences.
 * Adds explicit accessibility verification nodes and unknowns when preferences are enabled.
 */
export function adaptJourneyForAccessibility(
  journeyId: string,
  nodes: JourneyNode[],
  dependencies: Dependency[],
  evidence: Evidence[],
  preferences: UserProfileConstraint[]
): AccessibilityAdaptationResult {
  const activePrefs = preferences.filter((p) => p.enabled);
  let updatedNodes = [...nodes];
  let updatedDependencies = [...dependencies];
  let updatedEvidence = [...evidence];
  const addedEvents: ChangeEvent[] = [];
  const impactSummary: string[] = [];

  const now = new Date().toISOString();

  for (const pref of activePrefs) {
    switch (pref.constraintType) {
      case 'STEP_FREE': {
        // Step-free route preferred: affect venue entrance, transport, and internal navigation
        const stepFreeNodeId = `${journeyId}-acc-step-free`;
        const alreadyExists = updatedNodes.some((n) => n.id === stepFreeNodeId);

        if (!alreadyExists) {
          const venueNode = updatedNodes.find(
            (n) => n.type === 'BOOKING' || n.title.toLowerCase().includes('venue') || n.title.toLowerCase().includes('reach')
          );

          const newAccNode: JourneyNode = {
            id: stepFreeNodeId,
            journeyId,
            title: 'Verify Step-Free Venue & Transit Access',
            description:
              'Check whether the venue entrance, elevators, and local transit interchange have level, step-free access without unexpected stairs or high curbs.',
            type: 'ACCESSIBILITY',
            status: 'NEEDS_VERIFICATION',
            priority: 'HIGH',
            dueAt: venueNode?.dueAt || null,
            blockedReason: null,
            nextAction: 'Contact venue accessibility desk to confirm ramp/elevator status before travelling',
            isRequired: true,
            weight: 5,
            createdAt: now,
            updatedAt: now,
          };

          updatedNodes.push(newAccNode);

          // Add evidence with UNKNOWN state
          const newEvidenceId = `ev-acc-step-free-${Date.now()}`;
          updatedEvidence.push({
            id: newEvidenceId,
            journeyId,
            nodeId: stepFreeNodeId,
            type: 'ACCESSIBILITY_AUDIT',
            label: 'Venue Step-Free Entrance Verification',
            url: null,
            referenceText: 'Step-free access status is currently unverified. Official venue confirmation required.',
            verificationState: 'UNKNOWN',
            capturedAt: now,
          });

          // If there's a venue node or final attendance node, link it
          if (venueNode) {
            updatedDependencies.push({
              id: `dep-acc-${Date.now()}`,
              journeyId,
              fromNodeId: stepFreeNodeId,
              toNodeId: venueNode.id,
              relationship: 'REQUIRES_ACCESSIBILITY_CONFIRMATION',
              isBlocking: false, // Foresight warning, non-blocking default
            });
          }

          addedEvents.push({
            id: `chg-acc-${Date.now()}`,
            journeyId,
            nodeId: stepFreeNodeId,
            changeType: 'INFORMATION_UPDATE',
            oldValue: 'Default route planning',
            newValue: 'Step-free preference active: added access verification task',
            impact: [
              'Venue entrance accessibility flagged as UNKNOWN',
              'Added step-free verification action before travel',
              'Local transit transfer needs confirmation',
            ],
            source: 'ACCESSIBILITY_PROFILE_ENGINE',
            createdAt: now,
          });

          impactSummary.push(
            'Step-free preference enabled: Added venue and transit accessibility verification node (marked UNKNOWN until verified).'
          );
        }
        break;
      }

      case 'VISUAL_ASSISTANCE': {
        const visualNodeId = `${journeyId}-acc-visual`;
        if (!updatedNodes.some((n) => n.id === visualNodeId)) {
          const newAccNode: JourneyNode = {
            id: visualNodeId,
            journeyId,
            title: 'Verify Audio Announcements & Tactile Navigation',
            description:
              'Confirm available wayfinding support, digital screen reader format for schedules, and on-site staff assistance at the venue.',
            type: 'ACCESSIBILITY',
            status: 'NEEDS_VERIFICATION',
            priority: 'HIGH',
            dueAt: null,
            blockedReason: null,
            nextAction: 'Request large-print or digital screen-reader accessible schedule from organizers',
            isRequired: true,
            weight: 4,
            createdAt: now,
            updatedAt: now,
          };

          updatedNodes.push(newAccNode);

          updatedEvidence.push({
            id: `ev-acc-vis-${Date.now()}`,
            journeyId,
            nodeId: visualNodeId,
            type: 'ACCESSIBILITY_AUDIT',
            label: 'Visual Assistance Availability',
            url: null,
            referenceText: 'Audio announcements and digital materials format not yet confirmed by organizers.',
            verificationState: 'UNKNOWN',
            capturedAt: now,
          });

          impactSummary.push(
            'Visual accessibility preference enabled: Added digital schedule and audio wayfinding verification task.'
          );
        }
        break;
      }

      case 'HEARING_COMMUNICATION': {
        const hearingNodeId = `${journeyId}-acc-hearing`;
        if (!updatedNodes.some((n) => n.id === hearingNodeId)) {
          const newAccNode: JourneyNode = {
            id: hearingNodeId,
            journeyId,
            title: 'Confirm Live Captions / Assistive Listening',
            description: 'Check whether session halls provide assistive listening induction loops or real-time live transcription (CART).',
            type: 'ACCESSIBILITY',
            status: 'NEEDS_VERIFICATION',
            priority: 'MEDIUM',
            dueAt: null,
            blockedReason: null,
            nextAction: 'Check registration portal for captioning/hearing loop accommodations',
            isRequired: true,
            weight: 4,
            createdAt: now,
            updatedAt: now,
          };

          updatedNodes.push(newAccNode);

          updatedEvidence.push({
            id: `ev-acc-hear-${Date.now()}`,
            journeyId,
            nodeId: hearingNodeId,
            type: 'ACCESSIBILITY_AUDIT',
            label: 'Assistive Listening / CART Confirmation',
            url: null,
            referenceText: 'Stage audio loops and CART services unverified in public event guide.',
            verificationState: 'UNKNOWN',
            capturedAt: now,
          });

          impactSummary.push(
            'Hearing communication preference enabled: Added captioning and induction loop verification task.'
          );
        }
        break;
      }

      case 'REDUCED_WALKING': {
        const walkingNodeId = `${journeyId}-acc-reduced-walking`;
        if (!updatedNodes.some((n) => n.id === walkingNodeId)) {
          const newAccNode: JourneyNode = {
            id: walkingNodeId,
            journeyId,
            title: 'Review Transit Distance & On-Site Seating',
            description: 'Assess total walking distance from transit stop to hall entrance and verify regular seating availability along corridors.',
            type: 'ACCESSIBILITY',
            status: 'NEEDS_VERIFICATION',
            priority: 'MEDIUM',
            dueAt: null,
            blockedReason: null,
            nextAction: 'Map drop-off zone proximity and request close-in seating access',
            isRequired: true,
            weight: 4,
            createdAt: now,
            updatedAt: now,
          };

          updatedNodes.push(newAccNode);

          updatedEvidence.push({
            id: `ev-acc-walk-${Date.now()}`,
            journeyId,
            nodeId: walkingNodeId,
            type: 'ACCESSIBILITY_AUDIT',
            label: 'Walking Distance Audit',
            url: null,
            referenceText: 'Walking distance from nearest metro/cab point to main hall is unconfirmed.',
            verificationState: 'UNKNOWN',
            capturedAt: now,
          });

          impactSummary.push(
            'Reduced walking preference enabled: Added transit drop-off distance and corridor seating check.'
          );
        }
        break;
      }
    }
  }

  // If a preference was turned off, we preserve existing user-modified nodes but could flag them
  return {
    updatedNodes,
    updatedDependencies,
    updatedEvidence,
    addedEvents,
    impactSummary,
  };
}
