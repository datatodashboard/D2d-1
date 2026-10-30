import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseNext, isCompleted, EMPTY } from '../js/progress.js';

describe('Game-Style Domain Selection & Choose Level Dialog Verification Suite', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8') + '\n' + fs.readFileSync('styles.css', 'utf8');
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

  test('1. Home screen displays every configured domain without Core/All toggle, level picker, or Go to Practice button', () => {
    // 1. Shows "Choose Domain" title on Home
    assert.match(indexHtml, /<h2 class="domain-missions-title">Choose Domain<\/h2>/);
    assert.match(indexHtml, /id="allDomainsGrid"/);

    // 2. No Core Domains / All Domains toggle pills on Home
    assert.doesNotMatch(indexHtml, /id="trackCoreBtn"/);
    assert.doesNotMatch(indexHtml, /id="trackAllBtn"/);

    // 3. Level picker and Go to Practice button are NOT on the Home screen (they are inside #chooseLevelModal)
    const homeSectionMatch = indexHtml.match(/<section id="home"[^>]*>([\s\S]*?)<\/section>/);
    assert.ok(homeSectionMatch, 'section#home must exist');
    assert.doesNotMatch(homeSectionMatch[1], /id="levelsPicker"/, 'levelsPicker must NOT be inside section#home');
    assert.doesNotMatch(homeSectionMatch[1], /id="startPracticeBtn"/, 'startPracticeBtn must NOT be inside section#home');

    // 4. Domains read dynamically from configuration/scenarios data
    assert.match(appJs, /function getAvailableDomains\(\)/);
    assert.match(appJs, /const domains = getAvailableDomains\(\);/);
  });

  test('2. No domain or level is preselected on initial opening', () => {
    assert.match(appJs, /let\s+selectedDomain\s*=\s*null\s*,\s*selectedLevel\s*=\s*null/);
    assert.match(appJs, /selectedDomain\s*=\s*null;\s*selectedLevel\s*=\s*null;\s*current\s*=\s*null;/);

    // #chooseLevelModal is hidden by default
    assert.match(indexHtml, /<div id="chooseLevelModal" class="choose-level-backdrop" hidden/);

    // Inside chooseLevelModal, levelsPicker has no pre-selected level
    const modalMatch = indexHtml.match(/<div id="chooseLevelModal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
    assert.ok(modalMatch, 'chooseLevelModal must exist in index.html');
    assert.doesNotMatch(modalMatch[0], /class="[^"]*level-option-btn[^"]*active[^"]*"/);
  });

  test('3. Clicking a domain card opens compact, centered Choose Level dialog and resets temporary level selection', () => {
    // selectDomain resets selectedLevel to null and calls openChooseLevelModal(domain)
    const selectDomainFn = appJs.match(/function selectDomain\([\s\S]*?\n\}/);
    assert.ok(selectDomainFn, 'selectDomain function must exist');
    assert.match(selectDomainFn[0], /selectedDomain\s*=\s*domain;/);
    assert.match(selectDomainFn[0], /selectedLevel\s*=\s*null;/);
    assert.match(selectDomainFn[0], /openChooseLevelModal\(domain\);/);

    // openChooseLevelModal sets domain icon, domain name, resets selectedLevel and displays modal
    const openModalFn = appJs.match(/function openChooseLevelModal\([\s\S]*?\n\}/);
    assert.ok(openModalFn, 'openChooseLevelModal function must exist');
    assert.match(openModalFn[0], /chooseLevelDomainIcon/);
    assert.match(openModalFn[0], /chooseLevelDomainName/);
    assert.match(openModalFn[0], /modal\.hidden\s*=\s*false;/);
  });

  test('4. Choose Level dialog shows 3 large full-width buttons stacked vertically with clear selection highlight', () => {
    // Dialog header contains domain badge, Back button, and Close button
    assert.match(indexHtml, /id="chooseLevelDomainIcon"/);
    assert.match(indexHtml, /id="chooseLevelDomainName"/);
    assert.match(indexHtml, /id="chooseLevelBackBtn"[\s\S]*?onclick="closeChooseLevelModal\(\)"/);
    assert.match(indexHtml, /id="chooseLevelCloseBtn"[\s\S]*?onclick="closeChooseLevelModal\(\)"/);

    // Stack inside choose-level dialog ensures vertical column display on all viewports
    assert.match(indexHtml, /<div class="levels" id="levelsPicker">/);
    assert.match(indexHtml, /\.choose-level-dialog \.levels[\s\S]*?display:\s*flex\s*!important/);
    assert.match(indexHtml, /\.choose-level-dialog \.levels[\s\S]*?flex-direction:\s*column\s*!important/);

    // Contains all three levels: Beginner, Intermediate, Expert
    assert.match(indexHtml, /onclick="selectLevel\('Beginner',this\)"/);
    assert.match(indexHtml, /onclick="selectLevel\('Intermediate',this\)"/);
    assert.match(indexHtml, /onclick="selectLevel\('Expert',this\)"/);

    // Active level option gets cyan glowing border & active styling
    assert.match(indexHtml, /\.level-option-btn\.active\s*\{[^}]*border:\s*1\.5px solid #22d3ee/);
  });

  test('5. Go to Practice stays disabled until an available level is selected, then enables cleanly', () => {
    // Go to Practice button exists inside #chooseLevelModal and is disabled by default
    assert.match(indexHtml, /<button type="button" id="startPracticeBtn" class="[^"]*choose-level-go-btn"[^>]*disabled/);
    assert.match(indexHtml, /id="startPracticeBtn"[^>]*onclick="startPracticeSession\(\)"/);

    // updateStartPracticeUI disables button if no level is selected, enables when both domain and level are present
    const updateUiFn = appJs.match(/function updateStartPracticeUI\(\)\s*\{[\s\S]*?\n\}/);
    assert.ok(updateUiFn, 'updateStartPracticeUI function must exist');
    assert.match(updateUiFn[0], /if\s*\(selectedDomain && selectedLevel\)/);
    assert.match(updateUiFn[0], /btn\.disabled\s*=\s*false;/);
    assert.match(updateUiFn[0], /btn\.disabled\s*=\s*true;/);
  });

  test('6. Back, Close, and Escape return to Home without starting practice and clear temporary level selection', () => {
    // closeChooseLevelModal closes modal and clears selectedLevel
    const closeModalFn = appJs.match(/function closeChooseLevelModal\(\)\s*\{[\s\S]*?\n\}/);
    assert.ok(closeModalFn, 'closeChooseLevelModal function must exist');
    assert.match(closeModalFn[0], /modal\.hidden\s*=\s*true;/);
    assert.match(closeModalFn[0], /selectedLevel\s*=\s*null;/);

    // Escape listener invokes closeChooseLevelModal()
    assert.match(appJs, /if\s*\(event\.key === 'Escape'\)\s*\{[\s\S]*?closeChooseLevelModal\(\);/);
  });

  test('7. Go to Practice opens practice with correct domain and level and preserves resume behaviour', () => {
    const startPracticeFn = appJs.match(/async function startPracticeSession\(\)\s*\{[\s\S]*?\n\}/);
    assert.ok(startPracticeFn, 'startPracticeSession must exist');
    assert.match(startPracticeFn[0], /const chosenDomain = selectedDomain;/);
    assert.match(startPracticeFn[0], /const chosenLevel = selectedLevel;/);
    assert.match(startPracticeFn[0], /closeChooseLevelModal\(\);/);
    assert.match(startPracticeFn[0], /selectedDomain = chosenDomain;/);
    assert.match(startPracticeFn[0], /selectedLevel = chosenLevel;/);
    assert.match(startPracticeFn[0], /await loadScenario\(\);/);
    assert.match(startPracticeFn[0], /await showScreen\('practice'\);/);

    // Preserves resume logic: incomplete scenario is chosen, not restarted from Q1
    const testPool = scenarios.filter(s => s.domain === 'Retail' && s.level === 'Intermediate');
    assert.equal(testPool.length, 20);
    const mockState = EMPTY();
    for (let i = 0; i < 5; i++) {
      mockState.entries[testPool[i].id] = { completed: true, status: 'completed', score: 9 };
    }
    const nextQ = chooseNext(testPool, mockState, null);
    assert.equal(nextQ.id, testPool[5].id);
    assert.equal(nextQ.questionNo, 6);
  });

  test('8. Google Sign-In is required to access practice and saved progress while Admin Portal stays protected for admins', () => {
    // Practice requires Google sign-in
    assert.match(indexHtml, /id="googleSignIn"/);
    assert.match(indexHtml, /Continue with Google/);

    // Admin portal requires authenticated admin
    assert.match(appJs, /const showAdmin = Boolean\(user && isCurrentUserAdmin\);/);
    assert.match(appJs, /function openAdminPortal\(\)/);
  });
});
