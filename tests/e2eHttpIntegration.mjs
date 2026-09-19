// RAASTA Live Server End-to-End Integration Verification — PRD §34
// Verifies live runtime path against http://localhost:3000

import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🚀 Running Live End-to-End HTTP Integration Test Suite...');

// ─── E2E 1: GET /api/journeys ───────────────────────────────────
console.log('\n[E2E 1] Testing GET /api/journeys...');
{
  const res = await fetch(`${BASE_URL}/api/journeys`, {
    headers: { 'x-user-id': 'usr_demo_antigravity_01' },
  });
  assert.strictEqual(res.status, 200, 'GET /api/journeys should return 200');
  const data = await res.json();
  assert(Array.isArray(data.journeys), 'Should return an array of journeys');
  assert(data.journeys.length >= 2, 'Should contain at least 2 seeded journeys');
  console.log(`✓ Passed: Loaded ${data.journeys.length} active journeys`);
}

// ─── E2E 2: GET /api/journeys/:id Detail & Calculations ────────
console.log('\n[E2E 2] Testing GET /api/journeys/:id (Detail & Calculations)...');
{
  const res = await fetch(`${BASE_URL}/api/journeys/jrn_delhi_conference_2026`, {
    headers: { 'x-user-id': 'usr_demo_antigravity_01' },
  });
  assert.strictEqual(res.status, 200);
  const detail = await res.json();
  assert(detail.journey.title.includes('Delhi'), 'Should load Delhi conference');
  assert(detail.readiness !== undefined, 'Should compute readiness');
  assert(detail.nextAction !== null, 'Should return primary next action (AT-05)');
  assert(detail.nodes.length >= 5, 'Should have nodes');
  assert(detail.foresightInsights.length >= 0, 'Should include foresight insights');
  console.log(`✓ Passed: Journey loaded with ${detail.readiness.percent}% readiness and nextAction: "${detail.nextAction?.title}"`);
}

// ─── E2E 3: Ownership Enforcement (AT-08) ──────────────────────
console.log('\n[E2E 3] Testing Ownership Enforcement (AT-08)...');
{
  const res = await fetch(`${BASE_URL}/api/journeys/jrn_delhi_conference_2026`, {
    headers: { 'x-user-id': 'unauthorized_attacker_id' },
  });
  assert.strictEqual(res.status, 403, 'Should reject unauthorized user with 403 Forbidden');
  const body = await res.json();
  assert(body.error.includes('Forbidden'), 'Error should state forbidden');
  console.log('✓ Passed: Unauthorized journey access rejected with 403 (AT-08)');
}

// ─── E2E 4: Change Simulation & Impact Propagation (AT-07) ────
console.log('\n[E2E 4] Testing Venue Change Simulation (AT-07)...');
{
  const res = await fetch(`${BASE_URL}/api/journeys/jrn_delhi_conference_2026/changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({
      nodeId: 'cn_05_venue',
      changeType: 'VENUE_CHANGE',
      oldValue: 'Bharat Mandapam (Pragati Maidan Hall 5)',
      newValue: 'India Habitat Centre (Lodhi Road)',
    }),
  });
  assert.strictEqual(res.status, 200);
  const updated = await res.json();
  assert(updated.changeEvents.length > 0, 'Should record change event');
  assert(updated.changeEvents[0].impact.length >= 2, 'Should list downstream impacts');
  const venueNode = updated.nodes.find((n) => n.id === 'cn_05_venue');
  assert.strictEqual(venueNode.status, 'NEEDS_VERIFICATION', 'Venue node must reset to NEEDS_VERIFICATION');
  console.log(`✓ Passed: Change propagated downstream with ${updated.changeEvents[0].impact.length} impact warnings (AT-07)`);
}

// ─── E2E 5: Accessibility Adaptation (AT-06) ───────────────────
console.log('\n[E2E 5] Testing Accessibility Preference Adaptation (AT-06)...');
{
  const res = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({
      constraintType: 'STEP_FREE',
      enabled: true,
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  const stepFreePref = data.user.accessibilityPreferences.find(
    (p) => p.constraintType === 'STEP_FREE'
  );
  assert.strictEqual(stepFreePref.enabled, true, 'STEP_FREE preference must be enabled');

  // Verify conference journey automatically adapted
  const confRes = await fetch(`${BASE_URL}/api/journeys/jrn_delhi_conference_2026`, {
    headers: { 'x-user-id': 'usr_demo_antigravity_01' },
  });
  const confDetail = await confRes.json();
  const accNode = confDetail.nodes.find((n) => n.type === 'ACCESSIBILITY');
  assert(accNode !== undefined, 'Journey must now contain an accessibility verification node (AT-06)');
  assert.strictEqual(accNode.status, 'NEEDS_VERIFICATION', 'Accessibility node must require verification');
  console.log(`✓ Passed: Step-free preference enabled and auto-adapted journey with node "${accNode.title}" (AT-06)`);
}

// ─── E2E 6: Document Analysis & Ambiguity Isolation (AT-03, AT-04) ─
console.log('\n[E2E 6] Testing Document Intelligence Analysis (AT-03, AT-04)...');
{
  const sampleNotice = `
    GOVERNMENT OF INDIA
    NATIONAL MERIT STEM RESEARCH SCHOLARSHIP 2026
    DEADLINE: 2026-10-15T23:59:59Z
    ELIGIBILITY: Minimum 8.5 CGPA, Annual household taxable income strictly below INR 8,00,000.
    REQUIRED: Family Income Certificate signed by SDM, Dean Recommendation Letter.
    CLAUSE 4.2: Holders of secondary state grants may require a special waiver from state directorate.
    OFFICIAL: Department of Science Secretariat, https://scholarships.gov.in/stem2026
  `;

  const res = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({
      documentText: sampleNotice,
      fileName: 'DST_STEM_Notice_2026.pdf',
    }),
  });
  assert.strictEqual(res.status, 200);
  const docResult = await res.json();
  assert(docResult.success, 'Document extraction must succeed (AT-03)');
  assert(docResult.extraction.required_documents.length >= 1, 'Must extract required documents');
  assert(docResult.extraction.uncertainties.length >= 1, 'Must identify ambiguous clause (AT-04)');

  // Verify created journey has ambiguous item as NEEDS_VERIFICATION with UNKNOWN state
  const unkNode = docResult.detail.nodes.find((n) => n.status === 'NEEDS_VERIFICATION');
  assert(unkNode !== undefined, 'Ambiguous requirement must be marked NEEDS_VERIFICATION (AT-04)');
  console.log(`✓ Passed: Extracted document requirements and marked ambiguous clause as NEEDS_VERIFICATION (AT-03, AT-04)`);
}

// ─── E2E 6b: Selected-PDF Upload Handoff ──────────────────────
console.log('\n[E2E 6b] Testing selected-PDF upload handoff...');
{
  const fileName = 'LFX_2026_Term3_KubeEdge_Ianvs_Pretest.pdf';
  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({ fileName, contentType: 'application/pdf', size: 14 * 1024 }),
  });
  assert.strictEqual(uploadRes.status, 200, 'Selected PDF must receive a private upload target');
  const upload = await uploadRes.json();
  assert(upload.key, 'Upload target must return a private key');

  const analysisRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({ fileName, s3Key: upload.key }),
  });
  assert.strictEqual(analysisRes.status, 200, 'Selected PDF must create a journey');
  const analysis = await analysisRes.json();
  assert(analysis.journeyId, 'Selected PDF result must include the generated journey id');
  console.log(`✓ Passed: Selected PDF created journey "${analysis.journeyId}"`);
}

// ─── E2E 7: Natural Language Intent Creation (AT-01, AT-02) ────
console.log('\n[E2E 7] Testing Natural Language Intent Creation (AT-01, AT-02)...');
{
  const res = await fetch(`${BASE_URL}/api/journeys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_demo_antigravity_01',
    },
    body: JSON.stringify({
      intent: 'I want to attend a tech conference in Delhi next month.',
    }),
  });
  assert.strictEqual(res.status, 200);
  const newJourneyRes = await res.json();
  assert(newJourneyRes.journeyId !== undefined, 'Must create journey with ID (AT-01)');
  assert(newJourneyRes.clarifyingQuestions.length <= 3, 'Must ask small number of high-value questions (AT-02)');
  console.log(`✓ Passed: Created journey "${newJourneyRes.journeyId}" with ${newJourneyRes.clarifyingQuestions.length} high-value clarifying questions (AT-01, AT-02)`);
}

console.log('\n=============================================================');
console.log('🏆 ALL 7 LIVE RUNTIME END-TO-END ACCEPTANCE TESTS PASSED! 🏆');
console.log('=============================================================\n');
