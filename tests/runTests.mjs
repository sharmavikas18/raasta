// RAASTA Automated Unit Test Suite — PRD §34, §39
// Covers pure logic: readiness, next action, change propagation, accessibility adaptation, schema validation.

import assert from 'node:assert';

// ─── Test 1: Readiness Engine ─────────────────────────────────
console.log('Running Test 1: Deterministic Readiness Engine...');
{
  const { calculateReadiness } = await import('../lib/readiness/engine.ts');

  // Case A: Insufficient data (< 2 required nodes) -> returns null percent & qualitative state
  const sparseNodes = [
    {
      id: 'n1',
      journeyId: 'j1',
      title: 'Only one task',
      description: '',
      type: 'TASK',
      status: 'NOT_STARTED',
      priority: 'HIGH',
      dueAt: null,
      blockedReason: null,
      nextAction: null,
      isRequired: true,
      weight: 5,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const resSparse = calculateReadiness(sparseNodes, []);
  assert.strictEqual(resSparse.percent, null, 'Should return null percent when < 2 required nodes');
  assert.strictEqual(resSparse.qualitativeState, 'Needs preparation');

  // Case B: 3 required nodes, 2 completed, 1 blocked
  const nodes = [
    {
      id: 'n1',
      journeyId: 'j1',
      title: 'Task 1',
      description: '',
      type: 'TASK',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueAt: null,
      blockedReason: null,
      nextAction: null,
      isRequired: true,
      weight: 10,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'n2',
      journeyId: 'j1',
      title: 'Task 2',
      description: '',
      type: 'TASK',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueAt: null,
      blockedReason: null,
      nextAction: null,
      isRequired: true,
      weight: 10,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'n3',
      journeyId: 'j1',
      title: 'Task 3',
      description: '',
      type: 'TASK',
      status: 'BLOCKED',
      priority: 'CRITICAL',
      dueAt: null,
      blockedReason: 'Waiting on approval',
      nextAction: null,
      isRequired: true,
      weight: 10,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const res = calculateReadiness(nodes, []);
  assert(res.percent !== null, 'Percent should be calculated');
  assert(res.percent > 0 && res.percent < 100, 'Percent should reflect partial completion with blocker penalty');
  assert.strictEqual(res.blockerCount, 1, 'Should detect 1 blocker');
  assert.strictEqual(res.completedRequired, 2, 'Should detect 2 completed required');
  console.log('✓ Test 1 Passed: Readiness Engine behaves deterministically');
}

// ─── Test 2: Next Best Action Engine ─────────────────────────
console.log('Running Test 2: Next Best Action Engine (AT-05)...');
{
  const { selectNextAction } = await import('../lib/readiness/nextAction.ts');

  const nodes = [
    {
      id: 'n_doc',
      journeyId: 'j1',
      title: 'Get Income Certificate',
      description: '',
      type: 'DOCUMENT',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueAt: '2026-09-25T18:00:00Z',
      blockedReason: null,
      nextAction: 'Visit Tehsil office',
      isRequired: true,
      weight: 9,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'n_portal',
      journeyId: 'j1',
      title: 'Portal Registration',
      description: '',
      type: 'REGISTRATION',
      status: 'BLOCKED',
      priority: 'HIGH',
      dueAt: '2026-10-01T18:00:00Z',
      blockedReason: 'Needs Income Certificate',
      nextAction: 'Upload serial number',
      isRequired: true,
      weight: 8,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const dependencies = [
    {
      id: 'dep_1',
      journeyId: 'j1',
      fromNodeId: 'n_doc',
      toNodeId: 'n_portal',
      relationship: 'PREREQUISITE',
      isBlocking: true,
    },
  ];

  const action = selectNextAction(nodes, dependencies, new Date('2026-09-20T00:00:00Z'));
  assert(action !== null, 'Should return a next action');
  assert.strictEqual(action.nodeId, 'n_doc', 'Income Certificate should be selected as top next action');
  assert.strictEqual(action.blocksCount, 1, 'Should reflect blocking 1 downstream task');
  console.log('✓ Test 2 Passed: Selected primary next action is the blocker prerequisite (AT-05)');
}

// ─── Test 3: Accessibility Adaptation (AT-06) ────────────────
console.log('Running Test 3: Accessibility Adaptation Engine (AT-06)...');
{
  const { adaptJourneyForAccessibility } = await import('../lib/accessibility/adapter.ts');

  const baseNodes = [
    {
      id: 'venue_node',
      journeyId: 'j1',
      title: 'Review Venue & Reach Gate 7',
      description: 'Arrive at Bharat Mandapam',
      type: 'PREPARATION',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      dueAt: null,
      blockedReason: null,
      nextAction: 'Check route',
      isRequired: true,
      weight: 5,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const baseEvidence = [];

  const prefs = [
    {
      constraintType: 'STEP_FREE',
      enabled: true,
      source: 'VERIFIED_USER',
      updatedAt: '',
    },
  ];

  const result = adaptJourneyForAccessibility(
    'j1',
    baseNodes,
    [],
    baseEvidence,
    prefs
  );

  const accNode = result.updatedNodes.find((n) => n.type === 'ACCESSIBILITY');
  assert(accNode !== undefined, 'Should inject accessibility verification node');
  assert.strictEqual(accNode.status, 'NEEDS_VERIFICATION', 'Accessibility node must be NEEDS_VERIFICATION');

  const accEv = result.updatedEvidence.find((e) => e.nodeId === accNode.id);
  assert(accEv !== undefined, 'Must create evidence entry for accessibility');
  assert.strictEqual(accEv.verificationState, 'UNKNOWN', 'Must NOT fabricate certainty; must be UNKNOWN');
  console.log('✓ Test 3 Passed: Step-free preference creates UNKNOWN verification task without fabrication (AT-06)');
}

// ─── Test 4: Change Propagation Engine (AT-07) ───────────────
console.log('Running Test 4: Change Propagation Engine (AT-07)...');
{
  const { applyJourneyChange } = await import('../lib/domain/changeEngine.ts');

  const nodes = [
    {
      id: 'venue_1',
      journeyId: 'j1',
      title: 'Venue Arrival',
      description: 'Pragati Maidan Hall 5',
      type: 'PREPARATION',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueAt: null,
      blockedReason: null,
      nextAction: null,
      isRequired: true,
      weight: 6,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'transit_1',
      journeyId: 'j1',
      title: 'Local Transit Route to Pragati Maidan',
      description: 'Blue line metro route',
      type: 'PREPARATION',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueAt: null,
      blockedReason: null,
      nextAction: null,
      isRequired: false,
      weight: 4,
      createdAt: '',
      updatedAt: '',
    },
  ];

  const deps = [
    {
      id: 'dep_v_t',
      journeyId: 'j1',
      fromNodeId: 'venue_1',
      toNodeId: 'transit_1',
      relationship: 'LOCATION_DEPENDENCY',
      isBlocking: false,
    },
  ];

  const changeResult = applyJourneyChange(
    'j1',
    'venue_1',
    'VENUE_CHANGE',
    'Pragati Maidan',
    'India Habitat Centre',
    nodes,
    deps
  );

  assert(changeResult.affectedNodeIds.includes('venue_1'), 'Venue node must be in affected IDs');
  assert(changeResult.affectedNodeIds.includes('transit_1'), 'Downstream transit node must be in affected IDs');

  const changedVenue = changeResult.updatedNodes.find((n) => n.id === 'venue_1');
  const changedTransit = changeResult.updatedNodes.find((n) => n.id === 'transit_1');

  assert.strictEqual(changedVenue.status, 'NEEDS_VERIFICATION', 'Target node must reset to NEEDS_VERIFICATION');
  assert.strictEqual(changedTransit.status, 'NEEDS_VERIFICATION', 'Downstream transit must reset to NEEDS_VERIFICATION');
  assert(changeResult.impactMessages.length > 0, 'Must provide concrete impact messages');
  console.log('✓ Test 4 Passed: Venue change resets downstream nodes and generates impact warnings (AT-07)');
}

// ─── Test 5: Schema Validation & AT-09 Guard ─────────────────
console.log('Running Test 5: AI Schema Validation (AT-09)...');
{
  const { validateDocumentExtraction } = await import('../lib/api/validation.ts');

  // Case A: Valid Extraction
  const valid = {
    title: 'Scholarship Notice 2026',
    deadline: '2026-10-15T23:59:59Z',
    eligibility: ['Min 8.5 GPA'],
    required_documents: ['Income Cert'],
    steps: [{ stepNumber: 1, title: 'Step 1', description: 'Desc', prerequisiteStepNumbers: [] }],
    official_sources: [{ name: 'Secretariat', contactOrUrl: 'https://gov.in' }],
    uncertainties: ['Clause 4.2 needs clarification'],
    notes: [],
  };
  const valResult = validateDocumentExtraction(valid);
  assert.strictEqual(valResult.isValid, true, 'Valid schema must pass');

  // Case B: Invalid / Missing Title
  const invalid = {
    title: '',
    deadline: 'invalid-date-format',
  };
  const invalidResult = validateDocumentExtraction(invalid);
  assert.strictEqual(invalidResult.isValid, false, 'Invalid schema must be rejected');
  assert(invalidResult.errors.length > 0, 'Must describe schema validation errors');
console.log('✓ Test 5 Passed: AI response validation catches malformed outputs (AT-09)');
}

// ─── Test 6: Graph Invariants & Dependency-aware Actions ─────
console.log('Running Test 6: Graph invariants & dependency-aware actions...');
{
  const { assertValidJourneyGraph } = await import('../lib/domain/graph.ts');
  const { selectNextAction } = await import('../lib/readiness/nextAction.ts');

  const journey = {
    id: 'j_graph', userId: 'u_graph', title: 'Graph test', originalIntent: '',
    category: 'OTHER', status: 'ACTIVE', readinessPercent: null, deadline: null,
    priority: 'HIGH', createdAt: '', updatedAt: '',
  };
  const node = (id, status, priority = 'HIGH') => ({
    id, journeyId: 'j_graph', title: id, description: '', type: 'TASK', status,
    priority, dueAt: null, blockedReason: null, nextAction: id,
    isRequired: true, weight: 5, createdAt: '', updatedAt: '',
  });
  const upstream = node('upstream', 'IN_PROGRESS');
  const downstream = { ...node('downstream', 'NOT_STARTED', 'CRITICAL'), dueAt: '2026-09-21T00:00:00Z' };
  const dependencies = [{
    id: 'dep_upstream_downstream', journeyId: 'j_graph', fromNodeId: 'upstream',
    toNodeId: 'downstream', relationship: 'PREREQUISITE', isBlocking: true,
  }];

  assert.strictEqual(
    selectNextAction([upstream, downstream], dependencies, new Date('2026-09-20T00:00:00Z'))?.nodeId,
    'upstream',
    'The engine must not recommend a high-priority task before its prerequisite'
  );

  assert.throws(
    () => assertValidJourneyGraph(journey, [upstream, downstream], [
      ...dependencies,
      { id: 'dep_cycle', journeyId: 'j_graph', fromNodeId: 'downstream', toNodeId: 'upstream', relationship: 'LOOP', isBlocking: true },
    ]),
    /cycle/i,
    'The engine must reject cyclic dependency graphs'
  );
  console.log('✓ Test 6 Passed: Invalid graphs are rejected and actions respect prerequisites');
}

// ─── Test 7: Model output boundary rejects invalid dependency graph ─
console.log('Running Test 7: Model output graph validation...');
{
  const { validateIntentExtraction } = await import('../lib/api/validation.ts');
  const invalidCycle = validateIntentExtraction({
    normalizedGoal: 'Cycle test', category: 'OTHER', estimatedDeadline: null,
    keyEntities: [], constraints: [], missingHighValueQuestions: [],
    candidateNodes: [
      { tempId: 'a', title: 'A', description: '', type: 'TASK', priority: 'HIGH', isRequired: true, estimatedDaysBeforeDeadline: null },
      { tempId: 'b', title: 'B', description: '', type: 'TASK', priority: 'HIGH', isRequired: true, estimatedDaysBeforeDeadline: null },
    ],
    candidateDependencies: [
      { fromTempId: 'a', toTempId: 'b', relationship: 'PREREQUISITE', isBlocking: true },
      { fromTempId: 'b', toTempId: 'a', relationship: 'PREREQUISITE', isBlocking: true },
    ],
  });
  assert.strictEqual(invalidCycle.isValid, false, 'A model-generated dependency cycle must be rejected');
  assert(invalidCycle.errors.some((error) => /cycle/i.test(error)), 'The cycle must be explained');
  console.log('✓ Test 7 Passed: Invalid model graph cannot enter the engine');
}

console.log('\n========================================');
console.log('🎉 ALL 7 CRITICAL TEST SUITES PASSED! 🎉');
console.log('========================================\n');
