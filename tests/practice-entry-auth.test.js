import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EMPTY, readProgress, saveProgress, chooseNext, isCompleted } from '../js/progress.js';

describe('Crack SQL – Move Google Login to Practice Entry Verification Suite', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const appJs = fs.readFileSync('js/app.js', 'utf8');
  const rawScenarios = JSON.parse(fs.readFileSync('data/Crack_SQL_420_Simple.json', 'utf8'));
  const scenarios = rawScenarios.map(s => ({
    ...s,
    questionNo: typeof s.questionNo === 'number' ? s.questionNo : parseInt(String(s.id).slice(-3) || '1', 10),
    question: s.business_scenario,
    schemaText: s.schema,
    pseudo: s.solution_approach,
    sql: s.answer_sql
  }));
  const ids = new Set(scenarios.map(s => s.id));

  test('1. New visitor → Explore opens without login and shows all 7 Domains and 3 Difficulty Levels', () => {
    // Login popup is hidden by default on initial HTML load
    assert.match(indexHtml, /<section id="loginScreen"[^>]*hidden/);
    // Explore (#home) and main app shell (#appMain, #bottomNav) are visible by default
    assert.doesNotMatch(indexHtml, /<main class="wrap" id="appMain"[^>]*hidden/);
    assert.doesNotMatch(indexHtml, /<nav class="bottom-nav" id="bottomNav"[^>]*hidden/);
    assert.match(indexHtml, /<section id="home" class="screen active">/);

    // Extra domains wrapper is unhidden by default so all 7 domains are visible
    assert.doesNotMatch(indexHtml, /<div id="extraDomainsWrapper"[^>]*hidden/);

    // Verify all 7 domains exist in the scenario dataset and UI metadata
    const distinctDomains = [...new Set(scenarios.map(s => s.domain))];
    assert.equal(distinctDomains.length, 7);
    for (const domain of ['Banking', 'Healthcare', 'Insurance', 'Retail', 'Capital Markets', 'Semiconductor', 'Education']) {
      assert.ok(distinctDomains.includes(domain), `Domain ${domain} must be present`);
      assert.ok(appJs.includes(`'${domain}'`), `Domain ${domain} must be configured in app.js`);
    }

    // Verify all 3 difficulty levels exist
    const distinctLevels = [...new Set(scenarios.map(s => s.level))];
    assert.deepEqual(distinctLevels.sort(), ['Beginner', 'Expert', 'Intermediate']);
  });

  test('2. No Domain or Level is preselected on initial opening', () => {
    assert.match(appJs, /let\s+selectedDomain\s*=\s*null\s*,\s*selectedLevel\s*=\s*null/);
    assert.match(appJs, /selectedDomain\s*=\s*null;\s*selectedLevel\s*=\s*null;\s*current\s*=\s*null;/);
    // Static HTML domain cards and level cards do not have pre-applied .active class
    const levelsPickerMatch = indexHtml.match(/<div class="levels" id="levelsPicker">([\s\S]*?)<\/div>/);
    assert.ok(levelsPickerMatch, 'levelsPicker container must exist');
    assert.doesNotMatch(levelsPickerMatch[1], /class="level active"/);
  });

  test('3. Select Banking + Beginner → Start Practice → Google Login popup appears with required message', () => {
    // Verify exact required message in index.html and app.js
    const expectedMsg = 'Sign in with Google to save your Thinking Scores and learning progress.';
    assert.ok(indexHtml.includes(expectedMsg), 'index.html must include the exact login explanation');
    assert.ok(appJs.includes(expectedMsg), 'app.js must include the exact login explanation');

    // Verify Start Practice button exists and invokes startPracticeSession()
    assert.match(indexHtml, /id="startPracticeBtn"[^>]*onclick="startPracticeSession\(\)"/);

    // Verify selecting Domain and Level updates selection without opening login until Start Practice is clicked
    assert.match(appJs, /async function startPracticeSession\(\)/);
    assert.match(appJs, /if\s*\(!user\)\s*\{\s*requestGoogleLogin\(\{\s*destination:\s*'practice',\s*domain:\s*selectedDomain,\s*level:\s*selectedLevel\s*\}\);\s*return;\s*\}/);
  });

  test('4 & 5. Complete login → Saved Supabase progress loaded first → Banking Beginner Practice opens at pending question', () => {
    // Simulate existing learner who already completed Questions 1, 2, and 3 in Banking Beginner
    const bankingBeginnerPool = scenarios.filter(s => s.domain === 'Banking' && s.level === 'Beginner');
    assert.equal(bankingBeginnerPool.length, 20);

    const restoredState = EMPTY();
    for (let i = 0; i < 3; i++) {
      const q = bankingBeginnerPool[i];
      restoredState.entries[q.id] = {
        completed: true,
        status: 'completed',
        score: 9,
        thinkingScore: 9,
        thinking: { response: 'Completed before' },
        updatedAt: Date.now() - (3 - i) * 1000
      };
    }

    // Verify chooseNext selects Question 4 (BAN_BEG_004) and does NOT restart from Question 1
    const nextPending = chooseNext(bankingBeginnerPool, restoredState, null);
    assert.ok(nextPending);
    assert.equal(nextPending.id, 'BAN_BEG_004');
    assert.equal(nextPending.questionNo, 4);

    // Verify setSession loads user progress (Step 2) and checks profile (Step 3) BEFORE resuming pending auth intent (Step 6)
    const step2Idx = appJs.indexOf('await loadAndRestoreUserProgress(user.id, prefetchedLp, prefetchedFb);');
    const step3Idx = appJs.indexOf('await checkAndEnforceUsername(user.id, user.email, profile, profErr);');
    const step6Idx = appJs.indexOf('await resumePendingAuthIntent();');
    assert.ok(step2Idx > 0 && step3Idx > step2Idx && step6Idx > step3Idx, 'Progress and profile check must complete before resumePendingAuthIntent');
  });

  test('6. One-Time Mobile Number Collection: User with saved mobile number never sees mobile popup; missing mobile shows popup and continues to Practice after save', () => {
    // Verify checkAndEnforceUsername skips popup when dbMobile is present
    assert.match(appJs, /if\s*\(dbMobile\)\s*\{\s*closeProfileSetupModal\(\);\s*return\s+dbUsername;\s*\}/);

    // Verify saveProfileContactDetails calls await resumePendingAuthIntent() after saving profile to Supabase
    const saveFnMatch = appJs.match(/async function saveProfileContactDetails\(\)\s*\{([\s\S]*?)\nasync function saveFirstTimeUsername/);
    assert.ok(saveFnMatch, 'saveProfileContactDetails must exist');
    assert.ok(saveFnMatch[1].includes('closeProfileSetupModal();'));
    assert.ok(saveFnMatch[1].includes('await resumePendingAuthIntent();'), 'Saving profile details must automatically continue to the selected Practice Session');

    // Verify setSession waits for profileSetupModal if it is open (missing mobile number) before calling resumePendingAuthIntent
    assert.ok(appJs.includes('const isProfilePopupVisible = Boolean(profileModal && !profileModal.hidden);'));
    assert.ok(appJs.includes('if (!isProfilePopupVisible) {\n          await resumePendingAuthIntent();\n        }'));
  });

  test('7. Login cancellation returns safely to Explore without losing current Domain and Level selection', () => {
    // Verify cancelGoogleLoginPopup preserves selectedDomain and selectedLevel, closes modal, and keeps #home active
    const cancelMatch = appJs.match(/function cancelGoogleLoginPopup\(\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(cancelMatch, 'cancelGoogleLoginPopup must exist');
    const body = cancelMatch[1];
    assert.ok(body.includes('if (intent.domain && !selectedDomain) selectedDomain = intent.domain;'));
    assert.ok(body.includes('if (intent.level && !selectedLevel) selectedLevel = intent.level;'));
    assert.ok(body.includes('closeLoginModal();'));
    assert.ok(body.includes("if ($('home')) $('home').classList.add('active');"));
    assert.ok(body.includes("if ($('practice')) $('practice').classList.remove('active');"));
  });

  test('8 & 9. Unauthenticated users cannot submit Thinking answers or save guest progress; existing learner data, scores, certificates, and payments are protected', () => {
    // 1. persist() and changeEntry() block unauthenticated writes
    assert.match(appJs, /function persist\([^)]*\)\s*\{[\s\S]*?if\s*\(!user\s*\|\|\s*!user\.id\)\s*\{\s*updateProgress\(\);\s*return;\s*\}/);
    assert.match(appJs, /function changeEntry\([^)]*\)\s*\{[\s\S]*?if\s*\(!current\s*\|\|\s*!user\s*\|\|\s*!user\.id\)\s*return;/);

    // 2. evaluatePlan() and evaluateSql() require authenticated user
    const evalPlanMatch = appJs.match(/function evaluatePlan\(\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(evalPlanMatch);
    assert.ok(evalPlanMatch[1].includes('if (!user || !user.id)'));
    assert.ok(evalPlanMatch[1].includes('requestGoogleLogin'));

    // 3. Protected features (Progress, Profile, Certificates, Paywall) require login and record destination intent
    assert.ok(appJs.includes("destination: isProgress ? 'progressScreen' : 'practice'"));
    assert.ok(appJs.includes("destination: 'profile'"));
    assert.ok(appJs.includes("destination: 'certificates'"));
    assert.ok(appJs.includes("destination: 'certificate'"));
    assert.ok(appJs.includes("destination: 'paywall'"));

    // 4. Refresh and relogin preserve user progress in storage keyed by user.id
    const mem = new Map();
    const mockStorage = {
      getItem: k => mem.get(k) || null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: k => mem.delete(k)
    };
    const userId = 'existing-learner-uuid-999';
    const savedState = EMPTY();
    savedState.entries['BAN_BEG_001'] = {
      completed: true,
      status: 'completed',
      score: 10,
      thinkingScore: 10,
      thinking: { response: 'Join accounts and customers to sum balances' },
      updatedAt: 1700000000000
    };
    saveProgress(mockStorage, userId, savedState);

    const afterRelogin = readProgress(mockStorage, userId, ids);
    assert.equal(isCompleted(scenarios[0], afterRelogin.entries['BAN_BEG_001']), true);
    assert.equal(afterRelogin.entries['BAN_BEG_001'].score, 10);
  });
});
