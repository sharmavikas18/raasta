// RAASTA API — POST /api/documents — PRD §7 Flow 2, §14, AT-03, AT-04
import { NextRequest, NextResponse } from 'next/server';
import { journeyStore } from '@/lib/domain/journeyStore';
import { extractDocumentRequirements, extractPdfFromS3 } from '@/lib/api/bedrock';
import { Journey, JourneyNode, Dependency, Evidence } from '@/types/domain';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
    const body = await request.json();
    const { documentText, fileName, s3Key } = body;

    if (!s3Key && (!documentText || typeof documentText !== 'string' || !documentText.trim())) {
      return NextResponse.json(
        { error: 'Document text content is required for processing' },
        { status: 400 }
      );
    }

    if (s3Key && (typeof s3Key !== 'string' || !s3Key.startsWith(`private/${userId}/`))) {
      return NextResponse.json({ error: 'Invalid document location.' }, { status: 403 });
    }

    // Private PDFs are read directly from S3 by Bedrock. Text mode remains a
    // useful local/demo fallback and never pretends to be an uploaded PDF.
    const extraction = s3Key
      ? await extractPdfFromS3(s3Key, fileName || 'uploaded-notice.pdf')
      : await extractDocumentRequirements(documentText, fileName);
    if (!extraction) {
      return NextResponse.json(
        { error: 'Failed to extract structured document requirements' },
        { status: 422 }
      );
    }

    const journeyId = `jrn_doc_${Date.now()}`;
    const now = new Date().toISOString();

    const newJourney: Journey = {
      id: journeyId,
      userId,
      title: extraction.title || 'Document Opportunity Journey',
      originalIntent: `Extracted from uploaded document: ${fileName || 'Notification.pdf'}`,
      category: 'SCHOLARSHIP',
      status: 'ACTIVE',
      readinessPercent: null,
      deadline: extraction.deadline,
      priority: 'CRITICAL',
      createdAt: now,
      updatedAt: now,
    };

    const nodes: JourneyNode[] = [];
    const dependencies: Dependency[] = [];
    const evidence: Evidence[] = [];

    // Map extracted steps
    const stepNumberToNodeId = new Map<number, string>();

    extraction.steps.forEach((step, idx) => {
      const nodeId = `node_${journeyId}_step_${idx + 1}`;
      stepNumberToNodeId.set(step.stepNumber, nodeId);

      nodes.push({
        id: nodeId,
        journeyId,
        title: step.title,
        description: step.description,
        type: idx === extraction.steps.length - 1 ? 'DEADLINE' : 'TASK',
        status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        priority: idx === 0 ? 'CRITICAL' : 'HIGH',
        dueAt: extraction.deadline,
        blockedReason: null,
        nextAction: step.title,
        isRequired: true,
        weight: 8,
        createdAt: now,
        updatedAt: now,
      });
    });

    // Map step dependencies
    extraction.steps.forEach((step) => {
      const toId = stepNumberToNodeId.get(step.stepNumber);
      if (!toId) return;

      step.prerequisiteStepNumbers.forEach((prereqNum) => {
        const fromId = stepNumberToNodeId.get(prereqNum);
        if (fromId) {
          dependencies.push({
            id: `dep_${journeyId}_${fromId}_${toId}`,
            journeyId,
            fromNodeId: fromId,
            toNodeId: toId,
            relationship: 'DOCUMENT_SEQUENCE_PREREQUISITE',
            isBlocking: true,
          });
        }
      });
    });

    // PRD §14 / AT-04: Ambiguous requirements MUST be marked as NEEDS_VERIFICATION / UNKNOWN
    if (extraction.uncertainties && extraction.uncertainties.length > 0) {
      extraction.uncertainties.forEach((unc, uIdx) => {
        const unkNodeId = `node_${journeyId}_unc_${uIdx + 1}`;
        nodes.push({
          id: unkNodeId,
          journeyId,
          title: `Verify Ambiguous Requirement: Clause ${uIdx + 1}`,
          description: unc,
          type: 'VERIFICATION',
          status: 'NEEDS_VERIFICATION', // AT-04 requirement!
          priority: 'HIGH',
          dueAt: extraction.deadline,
          blockedReason: null,
          nextAction: `Contact issuing department authority to clarify: "${unc.slice(0, 80)}..."`,
          isRequired: true,
          weight: 6,
          createdAt: now,
          updatedAt: now,
        });

        evidence.push({
          id: `ev_${journeyId}_unc_${uIdx + 1}`,
          journeyId,
          nodeId: unkNodeId,
          type: 'DOCUMENT_AMBIGUOUS_PROVISO',
          label: `Ambiguous Notice Clause ${uIdx + 1}`,
          url: null,
          referenceText: unc,
          verificationState: 'UNKNOWN', // Must be UNKNOWN!
          capturedAt: now,
        });
      });
    }

    // Attach official source evidence
    if (extraction.official_sources && extraction.official_sources.length > 0) {
      extraction.official_sources.forEach((src, sIdx) => {
        if (nodes[0]) {
          evidence.push({
            id: `ev_${journeyId}_src_${sIdx + 1}`,
            journeyId,
            nodeId: nodes[0].id,
            type: 'OFFICIAL_DOCUMENT_NOTICE',
            label: src.name,
            url: src.contactOrUrl || null,
            referenceText: `Referenced official authority: ${src.name} (${src.contactOrUrl})`,
            verificationState: 'VERIFIED_OFFICIAL',
            capturedAt: now,
          });
        }
      });
    }

    const detail = journeyStore.createJourney(newJourney, nodes, dependencies, evidence);

    return NextResponse.json({
      success: true,
      journeyId: detail.journey.id,
      extraction,
      detail,
    });
  } catch (err: any) {
    console.error('Document analysis error:', err);
    return NextResponse.json(
      { error: err?.message || 'Document extraction failed' },
      { status: 500 }
    );
  }
}
