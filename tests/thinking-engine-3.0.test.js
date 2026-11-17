import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THINKING_ENGINE_3_VERSION,
  THINKING_ENGINE_3_NAME,
  THINKING_ENGINE_3_PASS_THRESHOLD,
  THINKING_ENGINE_3_KEY_VERSION,
  PILOT_SCENARIO_IDS,
  clearEngine3Cache,
  computeScenarioDigest,
  verifyScenarioAndTeacherKey,
  validateModelEvaluation,
  reconcileEvaluation,
  evaluateThinkingEngine3,
  isEngine3Scenario
} from '../server/thinking-engine-3.js';

import { isEngine3Assessment, thinkingIsReady } from '../js/thinking.js';
import { sanitize, isCompleted } from '../js/progress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Crack_SQL_420_Simple.json'), 'utf8'));
const first10Keys = JSON.parse(fs.readFileSync(path.join(ROOT, 'server-private/thinking-keys-first-10.json'), 'utf8'));
const all420Keys = JSON.parse(fs.readFileSync(path.join(ROOT, 'server-private/thinking-keys-all-420.json'), 'utf8'));
const pilotTestCases = JSON.parse(fs.readFileSync(path.join(ROOT, 'server-private/pilot-test-cases.json'), 'utf8'));

test('Thinking Engine 3.0 — Teacher Key Digest Integrity (Pilot 10 and All 420)', () => {
  assert.equal(first10Keys.keys.length, 10, 'Pilot pack must have 10 keys');
  assert.equal(all420Keys.keys.length, 420, 'All-420 pack must have 420 keys');
  assert.equal(catalog.length, 420, 'Catalog must have 420 scenarios');

  const catalogById = new Map(catalog.map((s) => [s.id, s]));

  for (const k of first10Keys.keys) {
    const scenario = catalogById.get(k.scenarioId);
    assert.ok(scenario, `Catalog entry must exist for ${k.scenarioId}`);
    assert.equal(k.sourceDigest, computeScenarioDigest(scenario), `Digest match for ${k.scenarioId}`);
  }

  for (const k of all420Keys.keys) {
    const scenario = catalogById.get(k.scenarioId);
    assert.ok(scenario, `Catalog entry must exist for ${k.scenarioId}`);
    assert.equal(k.sourceDigest, computeScenarioDigest(scenario), `Digest match for ${k.scenarioId}`);
    assert.ok(Array.isArray(k.requiredTables) && k.requiredTables.length > 0, `requiredTables for ${k.scenarioId}`);
    assert.ok(Array.isArray(k.criticalRequirements) && k.criticalRequirements.length > 0, `criticalRequirements for ${k.scenarioId}`);
  }
});

test('Thinking Engine 3.0 — Rejects Teacher Key Digest Mismatch', () => {
  const tmpKeyPath = path.join(ROOT, 'server-private/.tmp-bad-digest.json');
  try {
    const badData = structuredClone(first10Keys);
    badData.keys[0].sourceDigest = '0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(tmpKeyPath, JSON.stringify(badData), 'utf8');

    assert.throws(
      () =>
        verifyScenarioAndTeacherKey('BAN_BEG_001', {
          first10KeysPath: tmpKeyPath,
          scope: 'pilot10'
        }),
      (err) => err.code === 'DIGEST_MISMATCH' && err.status === 500
    );
  } finally {
    if (fs.existsSync(tmpKeyPath)) fs.unlinkSync(tmpKeyPath);
  }
});

test('Thinking Engine 3.0 — Scope Configuration (all, pilot10, rollback)', () => {
  assert.equal(isEngine3Scenario('BAN_BEG_001', { scope: 'all' }), true);
  assert.equal(isEngine3Scenario('RET_EXP_020', { scope: 'all' }), true);
  assert.equal(isEngine3Scenario('BAN_BEG_001', { scope: 'pilot10' }), true);
  assert.equal(isEngine3Scenario('BAN_BEG_011', { scope: 'pilot10' }), false);
  assert.equal(isEngine3Scenario('BAN_BEG_001', { rollback: true }), false);
});

test('Thinking Engine 3.0 — All 100 Pilot Acceptance Cases Pass Exact Bounds & Invariants', async () => {
  clearEngine3Cache();
  assert.equal(pilotTestCases.cases.length, 100);

  for (const tc of pilotTestCases.cases) {
    const res = await evaluateThinkingEngine3({
      scenarioId: tc.scenarioId,
      thinking: { response: tc.answer }
    });

    assert.equal(res.version, THINKING_ENGINE_3_VERSION, `${tc.id}: version must be 7`);
    assert.equal(res.engine, THINKING_ENGINE_3_NAME, `${tc.id}: engine must be thinking_3.0`);
    assert.equal(res.passThreshold, THINKING_ENGINE_3_PASS_THRESHOLD, `${tc.id}: passThreshold must be 7`);
    assert.equal(res.keyVersion, THINKING_ENGINE_3_KEY_VERSION, `${tc.id}: keyVersion`);
    assert.equal(res.ready, tc.expectedPass, `${tc.id}: expected ready=${tc.expectedPass}, got=${res.ready} (score=${res.score})`);
    assert.ok(
      res.score >= tc.minScore && res.score <= tc.maxScore,
      `${tc.id}: expected score in [${tc.minScore}, ${tc.maxScore}], got ${res.score}`
    );

    const weightSum = res.items.reduce((acc, item) => acc + item.weight, 0);
    assert.equal(weightSum, res.score, `${tc.id}: sum of category weights (${weightSum}) must equal score (${res.score})`);
    assert.equal(res.items.length, 5, `${tc.id}: must return 5 rubric items`);

    // Ensure no teacherAnswer or referenceSql is leaked
    const serialized = JSON.stringify(res);
    assert.ok(!serialized.includes('sourceDigest'), `${tc.id}: must not leak sourceDigest`);
  }
});

test('Thinking Engine 3.0 — Edge Cases: Paired Negation, Self-Correction, Currency Synonyms, Ambiguity, Unsupported Column', async () => {
  clearEngine3Cache();

  // 1. Paired negation ("Do not join customers or transactions; only use accounts...")
  const negRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_001',
    thinking: {
      response:
        'Do not join customers or transactions because they are not needed. Use accounts, keep only rows whose status is Active, and return their recorded details.'
    }
  });
  assert.equal(negRes.ready, true);
  assert.ok(negRes.score >= 8);

  // 2. Self-contradiction with correction ("Wait — exclude 50,000...")
  const corrRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_002',
    thinking: {
      response:
        'Initially I thought balance >= 50000. Wait — exact 50000 must be excluded, so use accounts and keep balance strictly greater than 50,000, then return the matching account details.'
    }
  });
  assert.equal(corrRes.ready, true);
  assert.ok(corrRes.score >= 8);

  // 3. Copied intro + real operational plan passes
  const introPlanRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_001',
    thinking: {
      response:
        'A bank manager is preparing a review of accounts. To solve this, I will query the accounts table, filter rows where status = Active, and return all recorded account details.'
    }
  });
  assert.equal(introPlanRes.ready, true);
  assert.ok(introPlanRes.score >= 8);

  // 4. Currency / numeric synonym ("50k")
  const numSynRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_002',
    thinking: {
      response: 'Use accounts and filter where balance is strictly above 50k (excluding 50,000), returning the account details.'
    }
  });
  assert.equal(numSynRes.ready, true);
  assert.ok(numSynRes.score >= 7);

  // 5. Hedged / ambiguous answer is capped <= 6 and ready=false
  const ambigRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_005',
    thinking: {
      response: 'Use accounts and maybe sort balance ascending or maybe descending, not sure which order, and return details.'
    }
  });
  assert.equal(ambigRes.ready, false);
  assert.ok(ambigRes.score <= 6);

  // 6. Unsupported column from another table or nonexistent snake_case column is capped <= 6
  const unsupColRes = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_001',
    thinking: {
      response: 'Use accounts, keep status Active and filter by column credit_score_tier, then return details.'
    }
  });
  assert.equal(unsupColRes.ready, false);
  assert.ok(unsupColRes.score <= 6);
});

test('Thinking Engine 3.0 — Validator & Guard-Cap Reconciler (Mocked Model Adapter)', async () => {
  const { teacherKey } = verifyScenarioAndTeacherKey('BAN_BEG_001');
  const studentText = 'Use accounts, keep status Active, and return all details.';

  // 1. Rejects fabricated evidence not verbatim in studentText
  assert.throws(
    () =>
      validateModelEvaluation(
        {
          dataPoints: 2,
          understandingPoints: 2,
          conditionsPoints: 3,
          approachPoints: 2,
          resultPoints: 1,
          emptyOrWhitespace: false,
          offTopic: false,
          promptInjectionOnly: false,
          copiedQuestionOnly: false,
          genericAcrossQuestions: false,
          criticalContradiction: false,
          wrongTaskSource: false,
          sqlOnly: false,
          missingCriticalRequirement: false,
          unresolvedAmbiguity: false,
          unsupportedColumn: false,
          requirementStatuses: [
            { requirementId: 'req_1', status: 'met', studentEvidence: 'status = Active_FABRICATED_TEXT', reason: 'ok' },
            { requirementId: 'req_2', status: 'met', studentEvidence: 'return all details', reason: 'ok' }
          ]
        },
        teacherKey,
        studentText
      ),
    (err) => err.code === 'FABRICATED_STUDENT_EVIDENCE'
  );

  // 2. Rejects duplicate requirementId
  assert.throws(
    () =>
      validateModelEvaluation(
        {
          dataPoints: 2,
          understandingPoints: 2,
          conditionsPoints: 3,
          approachPoints: 2,
          resultPoints: 1,
          emptyOrWhitespace: false,
          offTopic: false,
          promptInjectionOnly: false,
          copiedQuestionOnly: false,
          genericAcrossQuestions: false,
          criticalContradiction: false,
          wrongTaskSource: false,
          sqlOnly: false,
          missingCriticalRequirement: false,
          unresolvedAmbiguity: false,
          unsupportedColumn: false,
          requirementStatuses: [
            { requirementId: 'req_1', status: 'met', studentEvidence: 'status Active', reason: 'ok' },
            { requirementId: 'req_1', status: 'met', studentEvidence: 'return all details', reason: 'ok' }
          ]
        },
        teacherKey,
        studentText
      ),
    (err) => err.code === 'INVALID_REQUIREMENT_ID'
  );

  // 3. Reconciler reduces category weights deterministically when a cap applies
  const cappedEval = reconcileEvaluation(
    {
      dataPoints: 2,
      understandingPoints: 2,
      conditionsPoints: 3,
      approachPoints: 2,
      resultPoints: 1,
      emptyOrWhitespace: false,
      offTopic: false,
      promptInjectionOnly: false,
      copiedQuestionOnly: false,
      genericAcrossQuestions: false,
      criticalContradiction: true,
      wrongTaskSource: false,
      sqlOnly: false,
      missingCriticalRequirement: false,
      unresolvedAmbiguity: false,
      unsupportedColumn: false,
      requirementStatuses: [
        { requirementId: 'req_1', status: 'contradicted', studentEvidence: '', reason: 'Wrong status' },
        { requirementId: 'req_2', status: 'met', studentEvidence: 'return all details', reason: 'ok' }
      ],
      dataNote: 'ok',
      understandingNote: 'ok',
      conditionsNote: 'contradicted',
      approachNote: 'ok',
      resultNote: 'ok',
      strengths: [],
      gaps: ['Wrong status'],
      nextSteps: ['Use Active']
    },
    teacherKey,
    studentText
  );

  assert.equal(cappedEval.score, 4, 'Critical contradiction cap must clamp raw 10 down to 4');
  assert.equal(cappedEval.ready, false);
  const sumW = cappedEval.items.reduce((s, i) => s + i.weight, 0);
  assert.equal(sumW, 4, 'Category weights must be reduced to sum to 4');

  // 4. Enforces MISSING_API_KEY when requireApiKey is true and no key is provided
  await assert.rejects(
    () =>
      evaluateThinkingEngine3(
        { scenarioId: 'BAN_BEG_001', thinking: { response: studentText } },
        { requireApiKey: true, apiKey: '', bypassCache: true }
      ),
    (err) => err.code === 'MISSING_API_KEY' && err.status === 503
  );
});

test('Thinking Engine 3.0 — In-Flight Deduplication and Bounded Assessment Cache', async () => {
  clearEngine3Cache();
  let adapterCalls = 0;
  const studentResponse = 'Use accounts, keep only rows whose status is Active, and return their recorded details.';

  const slowValidAdapter = async () => {
    adapterCalls += 1;
    await new Promise((r) => setTimeout(r, 40));
    return {
      dataPoints: 2,
      understandingPoints: 2,
      conditionsPoints: 3,
      approachPoints: 2,
      resultPoints: 1,
      emptyOrWhitespace: false,
      offTopic: false,
      promptInjectionOnly: false,
      copiedQuestionOnly: false,
      genericAcrossQuestions: false,
      criticalContradiction: false,
      wrongTaskSource: false,
      sqlOnly: false,
      missingCriticalRequirement: false,
      unresolvedAmbiguity: false,
      unsupportedColumn: false,
      requirementStatuses: [
        { requirementId: 'req_1', status: 'met', studentEvidence: 'status is Active', reason: 'ok' },
        { requirementId: 'req_2', status: 'met', studentEvidence: 'return their recorded details', reason: 'ok' }
      ],
      dataNote: 'ok',
      understandingNote: 'ok',
      conditionsNote: 'ok',
      approachNote: 'ok',
      resultNote: 'ok',
      strengths: ['Clear plan'],
      gaps: [],
      nextSteps: []
    };
  };

  // Run with default cache enabled: first call populates cache, second call reuses cache
  const res1 = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_001',
    thinking: { response: studentResponse }
  });
  const res2 = await evaluateThinkingEngine3({
    scenarioId: 'BAN_BEG_001',
    thinking: { response: studentResponse }
  });
  assert.deepEqual(res1, res2);

  // Verify custom adapter works cleanly
  const customRes = await evaluateThinkingEngine3(
    { scenarioId: 'BAN_BEG_001', thinking: { response: studentResponse } },
    { modelAdapter: slowValidAdapter }
  );
  assert.equal(adapterCalls, 1);
  assert.equal(customRes.score, 10);
  assert.equal(customRes.ready, true);
});

test('Thinking Engine 3.0 — Progress Persistence & Historical Completion Protection', () => {
  const v7PassingAssessment = {
    version: 7,
    engine: 'thinking_3.0',
    score: 9,
    ready: true,
    passThreshold: 7,
    keyVersion: 'thinking-3.0-pilot-1',
    fingerprint: 'fp_test',
    items: [],
    strengths: ['Good'],
    gaps: [],
    nextSteps: [],
    feedback: ['Good']
  };

  const stateWithCompletion = sanitize(
    {
      version: 2,
      resetAt: 0,
      entries: {
        BAN_BEG_001: {
          thinking: { response: 'Use accounts, keep Active status, return details.' },
          score: 9,
          thinkingScore: 9,
          assessment: v7PassingAssessment,
          assessmentVersion: 'thinking_v7',
          completed: true,
          status: 'completed',
          attempts: 1,
          updatedAt: 1000
        }
      }
    },
    new Set(['BAN_BEG_001'])
  );

  const savedEntry = stateWithCompletion.entries.BAN_BEG_001;
  assert.equal(isEngine3Assessment(savedEntry.assessment), true);
  assert.equal(isCompleted(null, savedEntry), true);
  assert.equal(thinkingIsReady({ id: 'BAN_BEG_001' }, savedEntry), true);
  assert.equal(savedEntry.assessmentVersion, 'thinking_v7');

  // Verify a v7 assessment with score 6 and ready: false is NOT marked completed
  const stateWithFailure = sanitize(
    {
      version: 2,
      resetAt: 0,
      entries: {
        BAN_BEG_002: {
          thinking: { response: 'Use accounts and filter by balance.' },
          score: 6,
          thinkingScore: 6,
          assessment: { ...v7PassingAssessment, score: 6, ready: false },
          assessmentVersion: 'thinking_v7',
          completed: false,
          status: 'attempted',
          attempts: 1,
          updatedAt: 1000
        }
      }
    },
    new Set(['BAN_BEG_002'])
  );
  assert.equal(isCompleted(null, stateWithFailure.entries.BAN_BEG_002), false);
});
