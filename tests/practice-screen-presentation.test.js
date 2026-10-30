import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  parseSchema,
  parseDdlMetadata,
  parseSampleRecords,
  renderSchemaCards,
  DOMAIN_SCHEMA_ASSETS
} from '../js/schema.js';
import { evaluateThinking } from '../js/thinking.js';

const scenariosSimple = JSON.parse(
  fs.readFileSync(new URL('../data/Crack_SQL_420_Simple.json', import.meta.url), 'utf8')
);

test('Practice screen HTML has required visual mission flow, thinking prompt, and gated Generate SQL', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const practiceStart = html.indexOf('<section id="practice"');
  const practiceEnd = html.indexOf('</section>', html.indexOf('<div class="footer">', practiceStart));
  const practiceHtml = html.slice(practiceStart, practiceEnd);

  // 1. Visual Business Question elements
  assert.ok(practiceHtml.includes('id="missionDomainBadge"'), 'must display domain badge');
  assert.ok(practiceHtml.includes('id="missionLevelBadge"'), 'must display level badge');
  assert.ok(practiceHtml.includes('id="scenarioId"'), 'must display scenario ID');
  assert.ok(practiceHtml.includes('id="title"'), 'must display mission title');
  assert.ok(practiceHtml.includes('id="missionSceneArtwork"'), 'must include domain artwork container');
  assert.ok(practiceHtml.includes('id="conversationManagerAvatar"'), 'must include stakeholder character avatar');
  assert.ok(practiceHtml.includes('id="question"'), 'must include #question element');
  assert.ok(practiceHtml.includes('id="thinkingInstructionCard"'), 'must include separated learner instruction card');

  // 2. Thinking prompt & helper text
  assert.ok(
    practiceHtml.includes('How would you prepare this information?'),
    'must use "How would you prepare this information?" label'
  );
  assert.ok(
    practiceHtml.includes('Explain in your own words. No SQL needed yet.'),
    'must use "Explain in your own words. No SQL needed yet." helper text'
  );
  assert.ok(
    practiceHtml.includes('id="checkThinkingBtn" onclick="evaluatePlan()">Check my thinking</button>'),
    'must wire Check my thinking button to evaluatePlan()'
  );

  // 3. Single thinking textarea & DB Fiddle export button (no extra Generate SQL button beside it)
  assert.equal((practiceHtml.match(/<textarea\b/g) || []).length, 1, 'must have only one textarea in #practice');
  assert.ok(!practiceHtml.includes('id="generateSqlBtn"'), 'must remove extra Generate SQL button beside DB Fiddle button');
  assert.ok(practiceHtml.includes('id="copyFiddleBtn"'), 'must include Copy Schema & Open DB Fiddle button');
  assert.ok(practiceHtml.includes('id="generatedSqlPanel" hidden'), 'generated SQL panel must be hidden initially');

  // 4. Required flow order
  const qIdx = practiceHtml.indexOf('id="question"');
  const schemaIdx = practiceHtml.indexOf('id="schema"');
  const thinkingIdx = practiceHtml.indexOf('id="thinking"');
  const checkBtnIdx = practiceHtml.indexOf('id="checkThinkingBtn"');
  const feedbackIdx = practiceHtml.indexOf('id="feedback"');
  const fiddleBtnIdx = practiceHtml.indexOf('id="copyFiddleBtn"');

  assert.ok(qIdx < schemaIdx, 'Business question must precede schema cards');
  assert.ok(schemaIdx < thinkingIdx, 'Schema cards must precede thinking textbox');
  assert.ok(thinkingIdx < checkBtnIdx, 'Thinking textbox must precede Check my thinking button');
  assert.ok(checkBtnIdx < feedbackIdx, 'Check my thinking button must precede evaluation feedback');
  assert.ok(feedbackIdx < fiddleBtnIdx, 'Evaluation feedback must precede DB Fiddle export section');
});

test('renderSchemaCards renders authoritative tables across domains without hardcoding Banking or inventing metadata', () => {
  const container = { innerHTML: '' };
  global.document = {
    getElementById: id => (id === 'schema' ? container : null)
  };

  try {
    // 1. Banking scenario
    const bankingScenario = scenariosSimple.find(s => s.id === 'BAN_BEG_001');
    renderSchemaCards(bankingScenario.schema, { domain: 'Banking', asset: DOMAIN_SCHEMA_ASSETS.Banking });

    assert.ok(container.innerHTML.includes('data-table="customers"'));
    assert.ok(container.innerHTML.includes('data-table="accounts"'));
    assert.ok(container.innerHTML.includes('data-table="transactions"'));
    assert.ok(container.innerHTML.includes('badge-pk'), 'must show declared PK badge');
    assert.ok(container.innerHTML.includes('badge-fk'), 'must show declared FK badge');
    assert.ok(container.innerHTML.includes('NUMERIC(14,2)'), 'must show DDL data types when available');
    assert.ok(container.innerHTML.includes('View sample records'), 'must include View sample records toggle');
    assert.ok(!container.innerHTML.includes('+ Insert'), 'must not include old click-to-insert pills');
    assert.ok(!container.innerHTML.includes('+ Use Table'), 'must not include old + Use Table buttons');

    // Verify accounts card does NOT include customer_name in its sample table headers
    const accountsCardSplit = container.innerHTML.split('data-table="accounts"')[1].split('</article>')[0];
    const accountsThead = accountsCardSplit.split('<thead>')[1].split('</thead>')[0];
    assert.ok(accountsThead.includes('<th>account_id</th>'));
    assert.ok(accountsThead.includes('<th>customer_id</th>'));
    assert.ok(accountsThead.includes('<th>balance</th>'));
    assert.ok(!accountsThead.includes('customer_name'), 'accounts sample records must not include joined customer_name');

    // Verify sample panel is collapsed initially
    assert.ok(accountsCardSplit.includes('aria-expanded="false"'));
    assert.ok(accountsCardSplit.includes('class="schema-sample-panel" id="schema-sample-panel-accounts" hidden'));

    // 2. Healthcare scenario (must not hardcode Banking tables)
    const healthcareScenario = scenariosSimple.find(s => s.domain === 'Healthcare');
    renderSchemaCards(healthcareScenario.schema, { domain: 'Healthcare', asset: DOMAIN_SCHEMA_ASSETS.Healthcare });
    assert.ok(container.innerHTML.includes('data-table="patients"'));
    assert.ok(container.innerHTML.includes('data-table="doctors"'));
    assert.ok(container.innerHTML.includes('data-table="appointments"'));
    assert.ok(container.innerHTML.includes('data-table="visits"'));
    assert.ok(!container.innerHTML.includes('data-table="accounts"'), 'Healthcare must not show Banking tables');

    // 3. Custom schema without PK/FK, types, or sample data: must not invent anything and must show empty state
    renderSchemaCards('audit_logs(log_entry, recorded_by)', { asset: null, sampleData: {}, ddlSql: '' });
    assert.ok(container.innerHTML.includes('data-table="audit_logs"'));
    assert.ok(container.innerHTML.includes('log_entry'));
    assert.ok(container.innerHTML.includes('recorded_by'));
    assert.ok(!container.innerHTML.includes('badge-pk'), 'must not invent PK badge when undeclared');
    assert.ok(!container.innerHTML.includes('badge-fk'), 'must not invent FK badge when undeclared');
    assert.ok(!container.innerHTML.includes('schema-col-type'), 'must not invent data types when unavailable');
    assert.ok(
      container.innerHTML.includes('No sample records available for this table.'),
      'must show clear empty state when sample data is unavailable'
    );
  } finally {
    delete global.document;
  }
});

test('parseSampleRecords preserves NULLs, dates, numbers, and strings accurately', () => {
  const sampleSql = `
    INSERT INTO accounts (account_id, customer_id, open_date, status, balance) VALUES
    (1001, 1, '2025-01-10', 'Active', 12000.50),
    (1002, NULL, '2025-02-14', NULL, 0);
  `;
  const parsed = parseSampleRecords(sampleSql);
  assert.ok(parsed.accounts);
  assert.deepEqual(parsed.accounts.cols, ['account_id', 'customer_id', 'open_date', 'status', 'balance']);
  assert.deepEqual(parsed.accounts.rows[0], ['1001', '1', '2025-01-10', 'Active', '12000.50']);
  assert.deepEqual(parsed.accounts.rows[1], ['1002', null, '2025-02-14', null, '0']);

  const container = { innerHTML: '' };
  global.document = {
    getElementById: id => (id === 'schema' ? container : null)
  };
  try {
    renderSchemaCards('accounts(account_id PK, customer_id FK, open_date, status, balance)', {
      sampleSql,
      ddlSql: ''
    });
    assert.ok(container.innerHTML.includes('sample-null-badge">NULL</span>'), 'must render NULL values explicitly');
    assert.ok(container.innerHTML.includes('2025-01-10'), 'must preserve date strings');
    assert.ok(container.innerHTML.includes('12000.50'), 'must preserve numeric values');
  } finally {
    delete global.document;
  }
});

test('production thinking evaluator enforces rubric and does not pass arbitrary non-empty text', () => {
  const bankingScenario = scenariosSimple.find(s => s.id === 'BAN_BEG_001');
  const scenario = {
    id: 'BAN_BEG_001',
    domain: 'Banking',
    level: 'Beginner',
    question: bankingScenario.business_scenario,
    pseudo: bankingScenario.solution_approach,
    sql: bankingScenario.answer_sql,
    schemaText: bankingScenario.schema,
    tables: ['accounts'],
    requiredTables: ['accounts'],
    relevantColumns: ['accounts', 'status', 'Active']
  };

  const weakEval = evaluateThinking(scenario, { response: 'hello world random text' });
  assert.equal(weakEval.ready, false, 'arbitrary non-empty text must not unlock SQL');
  assert.ok(weakEval.score < 7, 'arbitrary text must score below threshold 7');

  const strongEval = evaluateThinking(scenario, {
    response: 'Use the accounts table, filter rows where status is Active, and return all matching account details.'
  });
  assert.equal(strongEval.ready, true, 'valid thinking plan must pass threshold');
  assert.ok(strongEval.score >= 7, 'valid thinking plan must score >= 7');
});

test('Practice results stay hidden until a real result exists (including 0/10) and clear across scenarios', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 1. Markup & aria-live preservation
  assert.ok(
    html.includes('id="feedback" class="feedback" role="status" aria-live="polite" data-has-result="false"'),
    'feedback container must stay aria-live="polite" and default to data-has-result="false"'
  );
  assert.ok(
    html.includes('<div id="howToThinkBox" hidden></div>'),
    'howToThinkBox must be hidden by default after #feedback'
  );

  // 2. CSS collapses hidden feedback & howToThinkBox with zero reserved space and 220ms ease-out opacity/transform reveal
  assert.ok(
    css.includes('#practice .feedback:not(.active)') &&
      css.includes('display: none !important;') &&
      css.includes('min-height: 0 !important;'),
    'hidden feedback must reserve zero space, borders, or margins'
  );
  assert.ok(
    css.includes('#practice #howToThinkBox[hidden]') &&
      css.includes('#practice #score:empty'),
    'hidden howToThinkBox and empty score/message must collapse completely'
  );
  assert.ok(
    css.includes('opacity 220ms cubic-bezier(0.22, 1, 0.36, 1) 0s') &&
      css.includes('transform 220ms cubic-bezier(0.22, 1, 0.36, 1) 0s'),
    'result reveal must use a 220ms ease-out transition on opacity and transform only'
  );

  // 3. JS checks typeof result.score === 'number' (so 0/10 is valid) and clears stale text when null
  assert.ok(
    appJs.includes("const hasResult = Boolean(result && typeof result === 'object' && typeof result.score === 'number');"),
    'renderAssessment must treat score === 0 as a valid result without inferring completion from score > 0'
  );
  assert.ok(
    appJs.includes("if (scoreEl) scoreEl.textContent = '';") &&
      appJs.includes("if (msgEl) msgEl.textContent = '';"),
    'renderAssessment(null) must clear stale score and assessment message text'
  );
});

test('Practice tabbed window collapses inactive panel height and releases temporary transition height after switching', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 1. Shared grid layout removed so taller panel no longer forces height on shorter panel
  const stackBlock = css.slice(
    css.indexOf('#practice .practice-tab-panels-stack'),
    css.indexOf('#practice #practicePanelBusiness > .question-panel')
  );
  assert.ok(!stackBlock.includes('grid-area: 1 / 1'), 'must remove shared grid-area: 1 / 1 stacking');
  assert.ok(
    stackBlock.includes('#practice .practice-tab-panel[hidden]') &&
      stackBlock.includes('display: none !important;'),
    'settled inactive panel must occupy zero layout space'
  );
  assert.ok(
    stackBlock.includes('#practice .practice-tabbed-window.is-animating .practice-tab-panel[hidden]') &&
      stackBlock.includes('position: absolute !important;'),
    'animating outgoing panel must be absolutely positioned so it does not stretch container height'
  );
  assert.ok(
    !stackBlock.includes('transition: all'),
    'tabbed window and panels must never use transition: all'
  );

  // 2. Execute the inline tab controller against a lightweight DOM stub to verify rapid switches, height release, and scroll preservation
  const scriptStart = html.indexOf('<script>', html.indexOf('id="practiceTabbedWindow"'));
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const inlineScript = html.slice(scriptStart + '<script>'.length, scriptEnd);

  function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
      add: (...tokens) => tokens.forEach(t => set.add(t)),
      remove: (...tokens) => tokens.forEach(t => set.delete(t)),
      toggle: (token, force) => {
        const shouldHave = force === undefined ? !set.has(token) : Boolean(force);
        if (shouldHave) set.add(token);
        else set.delete(token);
        return shouldHave;
      },
      contains: token => set.has(token)
    };
  }

  function makeEl(id, initialAttrs = {}, initialClasses = []) {
    const attrs = new Map(Object.entries(initialAttrs));
    const listeners = new Map();
    return {
      id,
      hidden: Boolean(initialAttrs.hidden),
      tabIndex: initialAttrs.tabIndex ?? 0,
      scrollTop: 0,
      scrollLeft: 0,
      offsetHeight: id === 'practicePanelBusiness' ? 320 : id === 'practicePanelSchema' ? 980 : 0,
      style: { height: '', overflow: '' },
      classList: makeClassList(initialClasses),
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
      hasAttribute(k) { return attrs.has(k); },
      toggleAttribute(k, force) {
        const shouldHave = force === undefined ? !attrs.has(k) : Boolean(force);
        if (shouldHave) attrs.set(k, '');
        else attrs.delete(k);
        return shouldHave;
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) {
        listeners.get(type)?.delete(fn);
      },
      dispatchEvent(ev) {
        listeners.get(ev.type)?.forEach(fn => fn(ev));
      },
      getBoundingClientRect() {
        const activePanel = elements.practicePanelBusiness.hidden
          ? elements.practicePanelSchema
          : elements.practicePanelBusiness;
        return { height: activePanel.offsetHeight };
      },
      querySelectorAll(sel) {
        if (sel === '.table-scroll' && id === 'practicePanelSchema') return [tableScrollEl];
        return [];
      },
      focus() {}
    };
  }

  const tableScrollEl = { scrollLeft: 145 };
  const elements = {
    practiceTabBusiness: makeEl('practiceTabBusiness', { 'aria-selected': 'true', tabIndex: 0 }, ['active']),
    practiceTabSchema: makeEl('practiceTabSchema', { 'aria-selected': 'false', tabIndex: -1 }),
    practicePanelBusiness: makeEl('practicePanelBusiness', { 'aria-hidden': 'false', 'data-panel-active': 'true' }),
    practicePanelSchema: makeEl('practicePanelSchema', { hidden: true, 'aria-hidden': 'true', 'data-panel-active': 'false', inert: '' }),
    practiceTabbedWindow: makeEl('practiceTabbedWindow', { 'data-active-tab': 'business' }),
    practiceTabPanelsStack: makeEl('practiceTabPanelsStack'),
    scenarioId: null,
    schema: null
  };

  const sandboxWindow = {
    matchMedia: () => ({ matches: false })
  };
  const sandboxDocument = {
    getElementById: id => elements[id] || null
  };

  const runner = new Function('window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', inlineScript);
  runner(
    sandboxWindow,
    sandboxDocument,
    cb => { cb(); return 1; },
    () => {}
  );

  // Rapid repeated tab switches: business -> schema -> business -> schema
  sandboxWindow.setPracticeWorkspaceTab('schema', false);
  sandboxWindow.setPracticeWorkspaceTab('business', false);
  sandboxWindow.setPracticeWorkspaceTab('schema', false);

  assert.equal(elements.practicePanelSchema.hidden, false, 'Schema panel must be visible when active');
  assert.equal(elements.practicePanelBusiness.hidden, true, 'Business panel must be hidden when inactive');
  assert.equal(elements.practicePanelBusiness.hasAttribute('inert'), true, 'Inactive Business panel must be inert');
  assert.equal(elements.practiceTabPanelsStack.style.height, '980px', 'Stack height must animate toward active panel height');

  // Simulate transitionend releasing the temporary height
  elements.practiceTabPanelsStack.dispatchEvent({
    type: 'transitionend',
    target: elements.practiceTabPanelsStack,
    propertyName: 'height'
  });

  assert.equal(elements.practiceTabPanelsStack.style.height, '', 'Temporary inline height must be released after transition completes');
  assert.equal(elements.practiceTabPanelsStack.style.overflow, '', 'Temporary overflow must be released after transition completes');
  assert.equal(elements.practiceTabbedWindow.classList.contains('is-animating'), false, 'is-animating class must be removed after transition');

  // Verify table horizontal scroll position preserved across tab switch back and forth
  tableScrollEl.scrollLeft = 210;
  sandboxWindow.setPracticeWorkspaceTab('business', false);
  tableScrollEl.scrollLeft = 0;
  sandboxWindow.setPracticeWorkspaceTab('schema', false);
  assert.equal(tableScrollEl.scrollLeft, 210, 'Schema table horizontal scroll position must be restored on tab switch');
});

test('Check My Thinking shows empty-answer warning pop-up for empty or whitespace-only input and stops before scoring', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

  // 1. Markup & Accessibility verification
  assert.ok(
    html.includes('id="emptyThinkingModal" class="modal-backdrop empty-thinking-modal-backdrop" hidden'),
    'must include hidden #emptyThinkingModal backdrop in #practice'
  );
  assert.ok(
    html.includes('id="emptyThinkingDialog" class="modal-dialog empty-thinking-modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="emptyThinkingModalTitle" aria-describedby="emptyThinkingModalMessage"'),
    'dialog must have role="alertdialog", aria-modal="true", aria-labelledby, and aria-describedby'
  );
  assert.ok(
    html.includes('<p id="emptyThinkingModalMessage" class="empty-thinking-modal-message">Please enter your thinking before checking your score.</p>'),
    'must display exact warning message'
  );
  assert.ok(
    html.includes('id="emptyThinkingOkBtn" onclick="closeEmptyThinkingModal()">OK</button>'),
    'must include single OK button wired to closeEmptyThinkingModal()'
  );

  // 2. CSS animation, reduced-motion, scroll lock, and 320px mobile fit verification
  const modalCssStart = css.indexOf('EMPTY THINKING WARNING DIALOG');
  assert.ok(modalCssStart > -1, 'styles.css must include Empty Thinking Warning Dialog section');
  const modalCss = css.slice(modalCssStart);
  assert.ok(
    modalCss.includes('body.empty-thinking-modal-open') && modalCss.includes('overflow: hidden !important;'),
    'background must not be scrollable while warning dialog is open'
  );
  assert.ok(
    modalCss.includes('opacity 180ms cubic-bezier(0.22, 1, 0.36, 1) 0s') &&
      modalCss.includes('transform 180ms cubic-bezier(0.22, 1, 0.36, 1) 0s') &&
      !modalCss.includes('transition: all'),
    'dialog must animate opacity and transform only (150-200ms ease-out) without transition: all'
  );
  assert.ok(
    modalCss.includes('min-height: 44px !important;') && modalCss.includes('@media (max-width: 360px)'),
    'OK button must be at least 44px tall and dialog must fit cleanly at 320px mobile width'
  );
  assert.ok(
    modalCss.includes('@media (prefers-reduced-motion: reduce)'),
    'must respect prefers-reduced-motion'
  );

  // 3. Behavioral simulation of evaluatePlan, open/close, focus return, focus trap, and Ctrl/Cmd+Enter
  let focusedId = null;
  let evaluateThinkingCalls = 0;
  let changeEntryCalls = 0;
  let completedCalls = 0;
  let loginCalls = 0;

  function makeClassList() {
    const set = new Set();
    return {
      add: (...t) => t.forEach(x => set.add(x)),
      remove: (...t) => t.forEach(x => set.delete(x)),
      contains: t => set.has(t)
    };
  }

  const els = {
    thinking: {
      id: 'thinking',
      value: '',
      focus() { focusedId = 'thinking'; }
    },
    emptyThinkingModal: {
      id: 'emptyThinkingModal',
      hidden: true,
      offsetHeight: 200,
      classList: makeClassList()
    },
    emptyThinkingDialog: {
      id: 'emptyThinkingDialog',
      focus() { focusedId = 'emptyThinkingDialog'; }
    },
    emptyThinkingModalMessage: {
      id: 'emptyThinkingModalMessage',
      textContent: ''
    },
    emptyThinkingOkBtn: {
      id: 'emptyThinkingOkBtn',
      focus() { focusedId = 'emptyThinkingOkBtn'; }
    },
    howToThinkBox: {
      id: 'howToThinkBox',
      hidden: true,
      innerHTML: ''
    },
    feedback: {
      id: 'feedback',
      getAttribute: () => 'false'
    }
  };

  const bodyClassList = makeClassList();
  const fnBlockStart = appJs.indexOf('const EMPTY_THINKING_WARNING_MESSAGE =');
  const fnBlockEnd = appJs.indexOf('const MOTIVATION_STATES =', fnBlockStart);
  const fnBlockCode = appJs.slice(fnBlockStart, fnBlockEnd);

  const harness = new Function(
    '$',
    'window',
    'document',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'user',
    'current',
    'selectedDomain',
    'selectedLevel',
    'state',
    'getEffectiveScenario',
    'readThinking',
    'evaluateThinking',
    'entry',
    'changeEntry',
    'renderAssessment',
    'updateGates',
    'handleScenarioCompleted',
    'openMotivationPopup',
    'requestGoogleLogin',
    `${fnBlockCode}\nreturn { evaluatePlan, openEmptyThinkingModal, closeEmptyThinkingModal, isEmptyThinkingModalOpen };`
  );

  const api = harness(
    id => els[id] || null,
    { matchMedia: () => ({ matches: false }) },
    { body: { classList: bodyClassList } },
    cb => { cb(); return 1; },
    () => {},
    { id: 'learner-1' },
    { id: 'BAN_BEG_001', domain: 'Banking', level: 'Beginner', skill: 'Filtering' },
    'Banking',
    'Beginner',
    { entries: {} },
    s => s,
    () => ({ response: els.thinking.value }),
    () => {
      evaluateThinkingCalls++;
      return { score: 8, ready: true, message: 'Good job' };
    },
    () => ({ attempts: 0 }),
    () => { changeEntryCalls++; },
    () => { els.howToThinkBox.hidden = false; },
    () => {},
    () => { completedCalls++; },
    () => {},
    () => { loginCalls++; }
  );

  // Case A: Empty string ""
  els.thinking.value = '';
  api.evaluatePlan();
  assert.equal(els.emptyThinkingModal.hidden, false, 'Empty box must open warning pop-up');
  assert.equal(
    els.emptyThinkingModalMessage.textContent,
    'Please enter your thinking before checking your score.',
    'Pop-up must show exact message'
  );
  assert.equal(focusedId, 'emptyThinkingOkBtn', 'Focus must move to OK button when pop-up opens');
  assert.equal(bodyClassList.contains('empty-thinking-modal-open'), true, 'Body scroll must be locked while open');
  assert.equal(evaluateThinkingCalls, 0, 'Must not call thinking engine on empty answer');
  assert.equal(changeEntryCalls, 0, 'Must not save or count an attempt on empty answer');
  assert.equal(completedCalls, 0, 'Must not use up a free challenge or record completion on empty answer');
  assert.equal(els.howToThinkBox.hidden, true, 'Must not show How to Think card on empty answer');

  // Repeated click while open must not stack or break state
  api.evaluatePlan();
  assert.equal(els.emptyThinkingModal.hidden, false, 'Repeated click keeps single dialog open');
  assert.equal(focusedId, 'emptyThinkingOkBtn', 'Focus remains on OK button');

  // Close via OK button and verify focus returns to #thinking
  api.closeEmptyThinkingModal();
  assert.equal(els.emptyThinkingModal.hidden, true, 'Dialog must close on OK');
  assert.equal(bodyClassList.contains('empty-thinking-modal-open'), false, 'Body scroll lock must be removed on close');
  assert.equal(focusedId, 'thinking', 'Focus must return to #thinking textarea after closing');

  // Case B: Spaces and line breaks only
  els.thinking.value = '   \n\t\r\n   ';
  api.evaluatePlan();
  assert.equal(els.emptyThinkingModal.hidden, false, 'Whitespace-only box must open warning pop-up');
  assert.equal(evaluateThinkingCalls, 0, 'Must not call thinking engine on whitespace-only answer');
  assert.equal(changeEntryCalls, 0, 'Must not save or count an attempt on whitespace-only answer');
  assert.equal(els.howToThinkBox.hidden, true, 'Must not show How to Think card on whitespace-only answer');
  api.closeEmptyThinkingModal();
  assert.equal(focusedId, 'thinking', 'Focus returns to #thinking after closing whitespace warning');

  // Case C: Valid text runs the existing flow unchanged
  els.thinking.value = 'Use the accounts table and filter where status is Active.';
  api.evaluatePlan();
  assert.equal(els.emptyThinkingModal.hidden, true, 'Valid text must not open warning pop-up');
  assert.equal(evaluateThinkingCalls, 1, 'Valid text must invoke thinking engine');
  assert.equal(changeEntryCalls, 1, 'Valid text must record attempt and score');
  assert.equal(completedCalls, 1, 'Valid passing text must run completion flow');
  assert.equal(els.howToThinkBox.hidden, false, 'Valid text must reveal How to Think card after scoring');
});


