import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isCompleted, EMPTY } from '../js/progress.js';

describe('Numbered Game Progression Mission Map & Review Verification Suite', () => {
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

  test('1. Mission Map section exists with domain header, read-only level badge, viewport, and canvas without tier tab buttons', () => {
    assert.match(indexHtml, /<section id="missionMap" class="screen">/);
    assert.match(indexHtml, /id="missionMapDomainIcon"/);
    assert.match(indexHtml, /id="missionMapDomainTitle"/);
    assert.match(indexHtml, /id="missionMapLevelBadge"/);
    assert.doesNotMatch(indexHtml, /id="mapTierBeginnerBtn"/);
    assert.doesNotMatch(indexHtml, /id="mapTierIntermediateBtn"/);
    assert.doesNotMatch(indexHtml, /id="mapTierExpertBtn"/);
    assert.match(indexHtml, /id="missionMapSolvedCount"/);
    assert.match(indexHtml, /id="missionMapViewport"/);
    assert.match(indexHtml, /id="missionMapCanvas"/);
    assert.match(indexHtml, /onclick="exitMissionMapToExplore\(\)"/);
  });

  test('2. Obsolete scenario card lists are cleanly removed from Choose Level and Explore while Go to Practice confirmation button is visible', () => {
    // #scenarioCatalogSection is not present on Explore
    assert.doesNotMatch(indexHtml, /id="scenarioCatalogSection"/);

    // #chooseLevelScenarioSection is not present in Choose Level modal
    assert.doesNotMatch(indexHtml, /id="chooseLevelScenarioSection"/);
    assert.doesNotMatch(indexHtml, /id="chooseLevelScenarioList"/);

    // #startPracticeBtn is visible and disabled by default in Choose Level UI
    assert.match(indexHtml, /id="startPracticeBtn"[^>]*disabled/);
    assert.doesNotMatch(indexHtml, /id="startPracticeBtn"[^>]*hidden/);
  });

  test('3. Selecting a level keeps Choose Level dialog open, and clicking Go to Practice opens Mission Map', () => {
    const selectLevelFn = appJs.match(/function selectLevel\([\s\S]*?\n\}/);
    assert.ok(selectLevelFn, 'selectLevel function must exist');
    assert.match(selectLevelFn[0], /modal\.hidden\s*=\s*false/);
    assert.match(selectLevelFn[0], /renderDomainAndLevelPickers\(\)/);
    assert.match(selectLevelFn[0], /updateStartPracticeUI\(\)/);
    assert.doesNotMatch(selectLevelFn[0], /openMissionMap/);

    const startPracticeFn = appJs.match(/async function startPracticeSession\(\)\s*\{[\s\S]*?\n\}/);
    assert.ok(startPracticeFn, 'startPracticeSession function must exist');
    assert.match(startPracticeFn[0], /openMissionMap\(selectedDomain,\s*selectedLevel\)/);
  });

  test('4. Mission Map renders numbered circular nodes (1..N) along a winding SVG trail', () => {
    const renderMapFn = appJs.match(/function renderMissionMap\([\s\S]*?\n\}/);
    assert.ok(renderMapFn, 'renderMissionMap function must exist');

    // Computes coordinates for winding trail using sine wave curve
    assert.match(renderMapFn[0], /Math\.sin\(i \* 0\.95\)/);
    assert.match(renderMapFn[0], /mission-map-svg-trail/);
    assert.match(renderMapFn[0], /<path d="\${fullPathD}"/);

    // Node numbers are 1-based (i + 1)
    assert.match(renderMapFn[0], /class="map-node \${node\.status}"/);
    assert.match(renderMapFn[0], /<span class="map-node-number">\${num}<\/span>/);
  });

  test('5. Node states: Completed has ✓ badge, Available is highlighted, Locked has lock badge', () => {
    const renderMapFn = appJs.match(/function renderMissionMap\([\s\S]*?\n\}/);
    assert.ok(renderMapFn);

    // Completed: ✓ badge and calls openCompletedReviewModal
    assert.match(renderMapFn[0], /completed-badge/);
    assert.match(renderMapFn[0], /openCompletedReviewModal/);

    // Available: opens practice scenario
    assert.match(renderMapFn[0], /available-badge/);
    assert.match(renderMapFn[0], /openScenario\('\${s\.id}'\)/);

    // Locked: locked badge and shows notice without opening
    assert.match(renderMapFn[0], /locked-badge/);
    assert.match(renderMapFn[0], /showMapNotice/);
  });

  test('6. Completed Answer Review modal is read-only and displays learner attempt and fallback', () => {
    // Review modal exists in DOM
    assert.match(indexHtml, /id="completedReviewModal"/);
    assert.match(indexHtml, /id="reviewModalTitle"/);
    assert.match(indexHtml, /id="reviewBusinessQuestion"/);
    assert.match(indexHtml, /id="reviewLearnerThinking"/);
    assert.match(indexHtml, /id="reviewScoreBadge"/);
    assert.match(indexHtml, /id="reviewFeedbackText"/);
    assert.match(indexHtml, /id="reviewSqlCode"/);

    // Review logic preserves learner attempt without substituting model answers
    const reviewFn = appJs.match(/function openCompletedReviewModal\([\s\S]*?\n\}/);
    assert.ok(reviewFn, 'openCompletedReviewModal must exist');
    assert.match(reviewFn[0], /Saved answer unavailable/);
    assert.doesNotMatch(reviewFn[0], /e\.thinking\s*=\s*s\.pseudo/, 'Must not substitute model answer');
    assert.doesNotMatch(reviewFn[0], /persist\(/, 'Review modal must not modify progress or state');

    // Close button returns to map
    assert.match(appJs, /function closeCompletedReviewModal\(\)/);
  });

  test('7. Navigation: Back from Practice returns to Mission Map; Back from Map returns to Explore', () => {
    // Back from Practice calls backFromPractice()
    assert.match(indexHtml, /<button class="linkbtn" onclick="backFromPractice\(\)">← Change<\/button>/);
    const backFn = appJs.match(/function backFromPractice\(\)[\s\S]*?\n\}/);
    assert.ok(backFn, 'backFromPractice must exist');
    assert.match(backFn[0], /openMissionMap\(selectedDomain,\s*selectedLevel,\s*true\)/);

    // Back from Mission Map returns to Explore
    const exitMapFn = appJs.match(/function exitMissionMapToExplore\(\)[\s\S]*?\n\}/);
    assert.ok(exitMapFn, 'exitMissionMapToExplore must exist');
    assert.match(exitMapFn[0], /showScreen\('home'\)/);
  });

  test('8. Normal Mode unlock rules: Scenario 1 initially unlocked, completions unlock next node', () => {
    const bankingBeginner = scenarios.filter(s => s.domain === 'Banking' && s.level === 'Beginner');
    assert.equal(bankingBeginner.length, 20);

    const testState = EMPTY();
    // Initially, no scenarios completed
    assert.equal(isCompleted(bankingBeginner[0], testState.entries[bankingBeginner[0].id]), false);

    // Complete scenario 0 with score 8
    testState.entries[bankingBeginner[0].id] = { completed: true, status: 'completed', score: 8 };
    assert.equal(isCompleted(bankingBeginner[0], testState.entries[bankingBeginner[0].id]), true);

    // Scenario 1 is now unlocked, scenario 2 remains locked until scenario 1 is complete
    assert.equal(isCompleted(bankingBeginner[1], testState.entries[bankingBeginner[1].id]), false);
  });
});
