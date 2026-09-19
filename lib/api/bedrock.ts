// RAASTA Bedrock Adapter Service — PRD §15, §23, §30, AT-09, AT-10
// Model-agnostic, supports MOCK_AI=true for zero-spend deterministic demos, with single-retry validation.

import { INTENT_SYSTEM_PROMPT, buildIntentUserPrompt } from '@/prompts/intent';
import { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserPrompt } from '@/prompts/document';
import { FORESIGHT_SYSTEM_PROMPT, buildForesightUserPrompt } from '@/prompts/foresight';
import {
  extractAndParseJson,
  validateDocumentExtraction,
  validateIntentExtraction,
} from '@/lib/api/validation';
import { JourneyNode, Dependency, Evidence } from '@/types/domain';

export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

export const IS_MOCK_AI = process.env.MOCK_AI !== 'false'; // Default to true if unset or MOCK_AI=true

export interface BedrockInvokeOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Raw Bedrock invoker or mock dispatcher
 */
export async function invokeBedrockModel(options: BedrockInvokeOptions): Promise<string> {
  if (IS_MOCK_AI) {
    // Return mock response based on prompt contents
    return getMockModelResponse(options);
  }

  // Live Bedrock execution
  try {
    // Dynamic import to avoid crash if aws-sdk is not installed yet
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );

    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.1,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    };

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(decoded);

    // Extract text content from Anthropic Claude response format
    if (parsed.content && Array.isArray(parsed.content) && parsed.content[0]?.text) {
      return parsed.content[0].text;
    }

    return JSON.stringify(parsed);
  } catch (err: any) {
    console.error('[Bedrock] Invocation error:', err?.message || err);
    throw new Error(`BEDROCK_UNAVAILABLE: ${err?.message || 'Bedrock call failed'}`);
  }
}

/**
 * Parse and validate intent extraction with 1 retry on failure (AT-09)
 */
export async function extractGoalIntent(
  goal: string,
  context?: Record<string, string>,
  documentSummaries?: string[]
) {
  const userPrompt = buildIntentUserPrompt(goal, context, documentSummaries);

  // Attempt 1
  let raw = await invokeBedrockModel({
    systemPrompt: INTENT_SYSTEM_PROMPT,
    userPrompt,
  });

  let parsedRes = extractAndParseJson(raw);
  let valRes = parsedRes.success ? validateIntentExtraction(parsedRes.parsed) : null;

  // Retry once if invalid (AT-09)
  if (!parsedRes.success || !valRes?.isValid) {
    const correctivePrompt = `${userPrompt}\n\nATTENTION: Your previous response was invalid JSON or missing required fields. Return ONLY valid minified JSON conforming strictly to the requested schema.`;
    raw = await invokeBedrockModel({
      systemPrompt: INTENT_SYSTEM_PROMPT,
      userPrompt: correctivePrompt,
    });
    parsedRes = extractAndParseJson(raw);
    valRes = parsedRes.success ? validateIntentExtraction(parsedRes.parsed) : null;
  }

  if (!valRes || !valRes.isValid) {
    throw new Error('AI_VALIDATION_FAILED: Bedrock response did not conform to intent schema');
  }

  return valRes.data;
}

/**
 * Parse and validate document requirements extraction with 1 retry on failure (AT-09)
 */
export async function extractDocumentRequirements(documentText: string, fileName?: string) {
  const userPrompt = buildDocumentUserPrompt(documentText, fileName);

  // Attempt 1
  let raw = await invokeBedrockModel({
    systemPrompt: DOCUMENT_SYSTEM_PROMPT,
    userPrompt,
  });

  let parsedRes = extractAndParseJson(raw);
  let valRes = parsedRes.success ? validateDocumentExtraction(parsedRes.parsed) : null;

  // Retry once if invalid (AT-09)
  if (!parsedRes.success || !valRes?.isValid) {
    const correctivePrompt = `${userPrompt}\n\nATTENTION: Your previous extraction was invalid or malformed. Return ONLY valid minified JSON conforming strictly to the PRD document schema without markdown fence.`;
    raw = await invokeBedrockModel({
      systemPrompt: DOCUMENT_SYSTEM_PROMPT,
      userPrompt: correctivePrompt,
    });
    parsedRes = extractAndParseJson(raw);
    valRes = parsedRes.success ? validateDocumentExtraction(parsedRes.parsed) : null;
  }

  if (!valRes || !valRes.isValid) {
    throw new Error('AI_VALIDATION_FAILED: Document extraction response failed schema verification');
  }

  return valRes.data;
}

/**
 * Analyses a private S3 PDF directly with Bedrock Converse. The PDF never passes
 * through the browser after upload and no document contents are logged.
 */
export async function extractPdfFromS3(s3Key: string, fileName: string) {
  if (IS_MOCK_AI) {
    return extractDocumentRequirements('[PDF uploaded to private S3]', fileName);
  }

  const bucket = process.env.RAASTA_DOCUMENTS_BUCKET;
  if (!bucket) throw new Error('S3_UPLOAD_NOT_CONFIGURED');

  try {
    const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    const safeDocumentName = fileName.replace(/[^a-zA-Z0-9 ()_\-[\]]/g, ' ').slice(0, 100) || 'notice';
    const response = await client.send(new ConverseCommand({
      modelId: process.env.BEDROCK_DOCUMENT_MODEL_ID || BEDROCK_MODEL_ID,
      system: [{ text: DOCUMENT_SYSTEM_PROMPT }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.1 },
      messages: [{
        role: 'user',
        content: [
          {
            document: {
              name: safeDocumentName,
              format: 'pdf',
              source: { s3Location: { uri: `s3://${bucket}/${s3Key}` } },
            },
          },
          { text: buildDocumentUserPrompt('Read the attached PDF as the source of truth.', fileName) },
        ],
      }],
    }));
    const raw = response.output?.message?.content?.find((item: { text?: string }) => item.text)?.text;
    const parsed = raw ? extractAndParseJson(raw) : { success: false };
    const validation = parsed.success ? validateDocumentExtraction(parsed.parsed) : null;
    if (!validation?.isValid) throw new Error('AI_VALIDATION_FAILED: PDF extraction response was invalid');
    return validation.data;
  } catch (err: any) {
    console.error('[Bedrock PDF] analysis failed:', err?.message || err);
    throw new Error(`PDF_ANALYSIS_UNAVAILABLE: ${err?.message || 'Bedrock document analysis failed'}`);
  }
}

/**
 * Deterministic Mock AI Responses for local UI development & AT-10
 */
function getMockModelResponse(options: BedrockInvokeOptions): string {
  const { userPrompt } = options;

  if (userPrompt.includes('DOCUMENT TEXT EXTRACT')) {
    // Document Extraction Mock
    return JSON.stringify({
      title: 'National Merit STEM Research Fellowship Circular 2026',
      deadline: '2026-10-15T23:59:59Z',
      eligibility: [
        'Enrolled full-time in accredited STEM undergraduate or postgraduate program',
        'Minimum 8.5 CGPA or top decile institutional rank',
        'Annual household taxable income under INR 8,00,000',
      ],
      required_documents: [
        'Authenticated Family Income Certificate signed by Sub-Divisional Magistrate',
        'Official Transcript showing minimum 8.5 CGPA',
        'Dean or Department Head Recommendation Letter',
        'Bonafide Student College Certificate',
      ],
      steps: [
        {
          stepNumber: 1,
          title: 'Obtain Revenue Authority Family Income Certificate',
          description: 'Submit ITR and identity documents to Tehsil/SDM office',
          prerequisiteStepNumbers: [],
        },
        {
          stepNumber: 2,
          title: 'Secure Faculty Research Endorsement Letter',
          description: 'Provide preliminary research proposal to faculty advisor',
          prerequisiteStepNumbers: [],
        },
        {
          stepNumber: 3,
          title: 'National Scholarship Portal KYC Registration',
          description: 'Link Aadhaar and upload certified income serial number',
          prerequisiteStepNumbers: [1],
        },
        {
          stepNumber: 4,
          title: 'Final Portal Submission & Hardcopy Dispatch',
          description: 'Lock digital submission and dispatch certified dossier',
          prerequisiteStepNumbers: [2, 3],
        },
      ],
      official_sources: [
        {
          name: 'Department of Science Portal',
          contactOrUrl: 'https://scholarships.gov.in/stem2026',
        },
      ],
      uncertainties: [
        'Notification Clause 4.2 ambiguously states "Holders of state tuition waivers may require special exemption waiver", but specifies no cutoff threshold or waiver application link.',
      ],
      notes: [
        'Physical dispatch of signed application must reach New Delhi office within 5 days of online submission.',
      ],
    });
  }

  if (userPrompt.includes('USER GOAL:')) {
    // Intent Extraction Mock
    const isConference =
      userPrompt.toLowerCase().includes('conference') ||
      userPrompt.toLowerCase().includes('delhi') ||
      userPrompt.toLowerCase().includes('summit');

    if (isConference) {
      return JSON.stringify({
        normalizedGoal: 'Attend Technology Conference in Delhi',
        category: 'EVENT',
        keyEntities: ['Delhi', 'Conference', 'Registration', 'Venue'],
        estimatedDeadline: '2026-10-24T09:00:00Z',
        constraints: ['Travel required', 'Photo ID security clearance required'],
        candidateNodes: [
          {
            tempId: 'node_1',
            title: 'Confirm Conference Registration & Delegate Badge',
            description: 'Obtain digital pass and verification QR code from event site',
            type: 'REGISTRATION',
            priority: 'CRITICAL',
            isRequired: true,
            estimatedDaysBeforeDeadline: 20,
            suggestedVerificationState: 'VERIFIED_OFFICIAL',
          },
          {
            tempId: 'node_2',
            title: 'Book Inbound & Return Travel to New Delhi',
            description: 'Reserve train or flight arriving before day 1 morning keynote',
            type: 'BOOKING',
            priority: 'CRITICAL',
            isRequired: true,
            estimatedDaysBeforeDeadline: 14,
            suggestedVerificationState: 'AI_INFERRED',
          },
          {
            tempId: 'node_3',
            title: 'Reserve Accommodation Near Venue',
            description: 'Book hotel within 30 min transit radius of conference center',
            type: 'BOOKING',
            priority: 'HIGH',
            isRequired: true,
            estimatedDaysBeforeDeadline: 10,
            suggestedVerificationState: 'AI_INFERRED',
          },
          {
            tempId: 'node_4',
            title: 'Review Venue Access & Local Commute Route',
            description: 'Map out metro / cab route to hall entrance',
            type: 'PREPARATION',
            priority: 'MEDIUM',
            isRequired: true,
            estimatedDaysBeforeDeadline: 2,
            suggestedVerificationState: 'COMMUNITY_REPORTED',
          },
        ],
        candidateDependencies: [
          {
            fromTempId: 'node_2',
            toTempId: 'node_3',
            relationship: 'TRAVEL_DATES_DETERMINE_HOTEL_RESERVATION',
            isBlocking: true,
          },
        ],
        missingHighValueQuestions: [
          {
            question: 'What are your exact travel dates and preferred transit mode?',
            whyItMatters: 'Determines booking urgency, hotel check-in dates, and arrival buffer timing.',
            impact: 'DEADLINE',
          },
          {
            question: 'Do you have any step-free, visual, or mobility access preferences for transit & venue?',
            whyItMatters: 'Adapts route, entrance choices, and adds accessibility verification tasks.',
            impact: 'ACCESSIBILITY',
          },
        ],
      });
    }

    // Default general intent
    return JSON.stringify({
      normalizedGoal: 'Complete Real-World Journey Plan',
      category: 'OTHER',
      keyEntities: ['Goal'],
      estimatedDeadline: null,
      constraints: [],
      candidateNodes: [
        {
          tempId: 'node_1',
          title: 'Review Initial Requirements & Deadlines',
          description: 'Examine prerequisites and identify critical milestones',
          type: 'VERIFICATION',
          priority: 'HIGH',
          isRequired: true,
          estimatedDaysBeforeDeadline: 1,
          suggestedVerificationState: 'AI_INFERRED',
        },
      ],
      candidateDependencies: [],
      missingHighValueQuestions: [
        {
          question: 'What is your target completion date or hard deadline?',
          whyItMatters: 'Calibrates pacing, deadline alerts, and next action ranking.',
          impact: 'DEADLINE',
        },
      ],
    });
  }

  // Foresight mock
  return JSON.stringify({
    insights: [
      {
        title: 'Prerequisite document delay threatens portal cutoff',
        type: 'MISSING_PREREQUISITE',
        severity: 'CRITICAL',
        explanation: 'Income certificate issuance by Tehsil often takes 7-10 business days. Without the serial number, portal submission cannot be completed.',
        affectedNodeIds: ['sn_02_income_cert', 'sn_05_portal_reg'],
        suggestedAction: 'Visit Tehsil office today to expedite certificate verification',
        verificationRequired: true,
      },
    ],
  });
}
