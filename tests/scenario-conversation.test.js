import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { getEffectiveScenario, CANONICAL_DOMAINS, CANONICAL_LEVELS } from '../js/curriculum.js';
import { getLearnerDisplayName } from '../js/certificate.js';

function loadConversationHarness(overrides = {}) {
  const source = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const renderSource = source.slice(
    source.indexOf('function getPracticeQuestionPresentation('),
    source.indexOf('\nlet authoritativeCompletedCount')
  );

  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        value: '',
        hidden: false,
        classList: { add() {}, remove() {}, toggle() {} }
      });
    }
    return elements.get(id);
  };

  let renderSchemaCalls = 0;
  let setSchemaTabCalls = 0;

  const context = vm.createContext({
    $,
    current: overrides.current || {
      id: 'BAN_BEG_002',
      domain: 'Banking',
      level: 'Beginner',
      questionNo: 2,
      skill: 'Numeric filtering',
      question: 'Bank management wants to identify accounts with a balance greater than ₹50,000 for high-value monitoring.',
      learner_question: 'If an account has exactly ₹50,000, should I leave it out?',
      manager_reply: 'Yes. Include only accounts with a balance above ₹50,000.',
      schemaText: 'accounts(account_id)'
    },
    user: overrides.user !== undefined ? overrides.user : null,
    currentUsername: overrides.currentUsername ?? null,
    getUserInfo: overrides.getUserInfo || (() => ({
      isLoggedIn: Boolean(context.user),
      name: context.user
        ? (context.currentUsername || context.user.user_metadata?.full_name || context.user.user_metadata?.name || 'Guest Learner')
        : 'Guest Learner'
    })),
    state: { entries: {} },
    scenarios: overrides.scenarios || [
      { id: 'BAN_BEG_001', domain: 'Banking', level: 'Beginner' },
      { id: 'BAN_BEG_002', domain: 'Banking', level: 'Beginner' }
    ],
    currentSampleTable: 'accounts',
    getEffectiveScenario: s => getEffectiveScenario(s),
    nextTimestamp: () => 1,
    entry: () => ({ thinking: { response: overrides.savedThinking || '' }, assessment: null }),
    persist() {},
    renderSchemaCards() { renderSchemaCalls += 1; },
    setSchemaTab() { setSchemaTabCalls += 1; },
    thinkingText: thinking => thinking?.response || '',
    renderAssessment() {},
     evaluateThinking() {},
    updateProgress() {},
    updateGates() {}
  });

  vm.runInContext(renderSource, context);
  return {
    context,
    elements,
    getRenderSchemaCalls: () => renderSchemaCalls,
    getSetSchemaTabCalls: () => setSchemaTabCalls
  };
}

test('all 420 scenarios across primary and fallback datasets contain valid scenario-specific dialogue', () => {
  const files = [
    '../data/Crack_SQL_420_Simple.json',
    '../data/scenarios.json',
    '../data/scenarios-metadata.json'
  ];

  const sqlLeakPattern = /\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|INNER JOIN|GROUP BY|ORDER BY|HAVING|ROW_NUMBER|DENSE_RANK|RANK\s*\(|LAG\s*\(|PARTITION BY|DATE_TRUNC|COALESCE|NULLIF)\b/;

  for (const relPath of files) {
    const raw = JSON.parse(fs.readFileSync(new URL(relPath, import.meta.url), 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.scenarios;
    assert.equal(list.length, 420, `${relPath} must have 420 scenarios`);

    const domainCounts = {};
    for (const item of list) {
      assert.equal(typeof item.learner_question, 'string', `${relPath} ${item.id} missing learner_question`);
      assert.equal(typeof item.manager_reply, 'string', `${relPath} ${item.id} missing manager_reply`);
      assert.ok(item.learner_question.trim().length >= 12, `${relPath} ${item.id} learner_question too short`);
      assert.ok(item.manager_reply.trim().length >= 12, `${relPath} ${item.id} manager_reply too short`);
      assert.ok(item.learner_question.trim().endsWith('?'), `${relPath} ${item.id} learner_question should be a question`);
      assert.ok(
        !/can we get this from our database\?/i.test(item.learner_question),
        `${relPath} ${item.id} must not use generic filler question`
      );
      assert.ok(
        !sqlLeakPattern.test(item.manager_reply),
        `${relPath} ${item.id} manager_reply must not leak SQL keywords: ${item.manager_reply}`
      );
      domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
    }

    for (const domain of CANONICAL_DOMAINS) {
      assert.equal(domainCounts[domain], 60, `${relPath} must have 60 scenarios for ${domain}`);
    }
  }
});

test('Banking sample dialogues match exact specification for BAN_BEG_001, BAN_BEG_002, and BAN_BEG_006', () => {
  const simple = JSON.parse(fs.readFileSync(new URL('../data/Crack_SQL_420_Simple.json', import.meta.url), 'utf8'));
  const byId = new Map(simple.map(s => [s.id, s]));

  assert.equal(
    byId.get('BAN_BEG_002').learner_question,
    'If an account has exactly ₹50,000, should I leave it out?'
  );
  assert.equal(
    byId.get('BAN_BEG_002').manager_reply,
    'Yes. Include only accounts with a balance above ₹50,000.'
  );

  assert.equal(
    byId.get('BAN_BEG_001').learner_question,
    'Do you need each Active account’s full details, or just the number of Active accounts?'
  );
  assert.equal(
    byId.get('BAN_BEG_001').manager_reply,
    'The full recorded details of each Active account, please.'
  );

  assert.equal(
    byId.get('BAN_BEG_006').learner_question,
    'If several products belong to the same category, should that category appear more than once?'
  );
  assert.equal(
    byId.get('BAN_BEG_006').manager_reply,
    'No. Show each category only once, even if several products belong to it.'
  );
});

test('centralized manager personas cover all 7 domains including Banking Arun / Bank Manager and Retail', () => {
  const { context } = loadConversationHarness();

  const banking = context.getDomainManagerPersona('Banking');
  assert.equal(banking.name, 'Arun');
  assert.equal(banking.role, 'Bank Manager');
  assert.ok(banking.svg.includes('<svg'));

  for (const domain of CANONICAL_DOMAINS) {
    const persona = context.getDomainManagerPersona(domain);
    assert.ok(persona.name && persona.name.trim().length > 0, `Missing manager name for ${domain}`);
    assert.ok(persona.role && persona.role.trim().length > 0, `Missing manager role for ${domain}`);
    assert.ok(persona.svg && persona.svg.includes('<svg'), `Missing SVG avatar for ${domain}`);
  }
});

test('renderScenario renders 3-turn conversation and keeps trailing learner instruction separate', () => {
  const { context, elements } = loadConversationHarness({
    current: {
      id: 'BAN_BEG_002',
      domain: 'Banking',
      level: 'Beginner',
      questionNo: 2,
      skill: 'Numeric filtering',
      question:
        'Bank management wants to identify accounts with a balance greater than ₹50,000 for high-value monitoring. Explain your approach in your own words. No SQL is required.',
      learner_question: 'If an account has exactly ₹50,000, should I leave it out?',
      manager_reply: 'Yes. Include only accounts with a balance above ₹50,000.',
      schemaText: 'accounts(account_id)'
    },
    user: { id: 'u1', email: 'priya@example.com' },
    currentUsername: 'Priya'
  });

  context.renderScenario();

  assert.equal(elements.get('conversationManagerName').textContent, 'Arun');
  assert.equal(elements.get('conversationManagerRole').textContent, 'Bank Manager');
  assert.equal(elements.get('conversationRequestSpeaker').textContent, 'Arun');
  assert.equal(elements.get('conversationReplySpeaker').textContent, 'Arun');
  assert.equal(elements.get('conversationLearnerName').textContent, 'Priya');

  assert.equal(
    elements.get('question').textContent.trim(),
    'Bank management wants to identify accounts with a balance greater than ₹50,000 for high-value monitoring.'
  );
  assert.equal(
    elements.get('thinkingInstruction').textContent.trim(),
    'Explain your approach in your own words. No SQL is required.'
  );
  assert.equal(elements.get('thinkingInstructionCard').hidden, false);

  assert.equal(
    elements.get('learnerQuestion').textContent,
    'If an account has exactly ₹50,000, should I leave it out?'
  );
  assert.equal(
    elements.get('managerReply').textContent,
    'Yes. Include only accounts with a balance above ₹50,000.'
  );
  assert.equal(elements.get('learnerClarificationTurn').hidden, false);
  assert.equal(elements.get('managerReplyTurn').hidden, false);
});

test('learner name personalization handles profile name, Tamil/Unicode names, email suppression, and label-only refresh', () => {
  const { context, elements, getRenderSchemaCalls, getSetSchemaTabCalls } = loadConversationHarness({
    savedThinking: 'My draft plan in progress'
  });

  context.renderScenario();
  assert.equal(elements.get('conversationLearnerName').textContent, 'Learner');
  assert.equal(getRenderSchemaCalls(), 1);
  assert.equal(getSetSchemaTabCalls(), 1);

  // User edits textarea and switches schema tab; label-only refresh must not reset them
  elements.get('thinking').value = 'Unsaved learner draft in textarea';

  context.user = { id: 'u-tamil', email: 'karthik@example.com' };
  context.currentUsername = 'கார்த்திக் சுப்பிரமணியன்';
  context.refreshConversationLearnerIdentity();

  assert.equal(elements.get('conversationLearnerName').textContent, 'கார்த்திக் சுப்பிரமணியன்');
  assert.equal(elements.get('thinking').value, 'Unsaved learner draft in textarea');
  assert.equal(getRenderSchemaCalls(), 1);
  assert.equal(getSetSchemaTabCalls(), 1);

  // Fallback to getUserInfo().name when currentUsername is empty
  context.currentUsername = '';
  context.user = { id: 'u-meta', user_metadata: { full_name: 'Ananya Sharma' }, email: 'ananya@example.com' };
  context.refreshConversationLearnerIdentity();
  assert.equal(elements.get('conversationLearnerName').textContent, 'Ananya Sharma');

  // Never show full email address as conversation name
  context.currentUsername = '';
  context.user = { id: 'u-email', user_metadata: { full_name: 'ananya@example.com' }, email: '' };
  context.getUserInfo = () => ({ isLoggedIn: true, name: 'ananya@example.com' });
  context.refreshConversationLearnerIdentity();
  assert.equal(elements.get('conversationLearnerName').textContent, 'Learner');

  // Never show permanent "You", "User", or "U"
  for (const forbidden of ['You', 'User', 'U', 'Guest Learner']) {
    context.currentUsername = forbidden;
    context.refreshConversationLearnerIdentity();
    assert.equal(elements.get('conversationLearnerName').textContent, 'Learner');
  }

  // Signed out fallback
  context.user = null;
  context.currentUsername = null;
  context.refreshConversationLearnerIdentity();
  assert.equal(elements.get('conversationLearnerName').textContent, 'Learner');

  // Certificate helper behavior remains untouched
  assert.equal(getLearnerDisplayName({ user_metadata: { full_name: 'Cert Name' } }, 'ProfileHandle'), 'Cert Name');
});

test('missing, empty, or mismatched-variant dialogue hides clarification and reply turns as a pair', () => {
  const { context, elements } = loadConversationHarness({
    current: {
      id: 'BAN_BEG_001',
      domain: 'Banking',
      level: 'Beginner',
      questionNo: 1,
      question: 'Return accounts with status Active.',
      learner_question: 'Do you need each Active account’s full details?',
      manager_reply: '', // incomplete pair
      schemaText: 'accounts(account_id)'
    }
  });

  context.renderScenario();
  assert.equal(elements.get('question').textContent, 'Return accounts with status Active.');
  assert.equal(elements.get('learnerClarificationTurn').hidden, true);
  assert.equal(elements.get('managerReplyTurn').hidden, true);
  assert.equal(elements.get('learnerQuestion').textContent, '');
  assert.equal(elements.get('managerReply').textContent, '');

  // Variant with a different question and no variant dialogue falls back to question-only
  context.current = {
    id: 'BAN_BEG_001',
    domain: 'Banking',
    level: 'Beginner',
    questionNo: 1,
    question: 'Return accounts with status Active.',
    learner_question: 'Do you need each Active account’s full details?',
    manager_reply: 'The full recorded details of each Active account, please.',
    selectedVariant: {
      question: 'Return accounts with status Pending.'
    },
    schemaText: 'accounts(account_id)'
  };
  context.renderScenario();
  assert.equal(elements.get('question').textContent, 'Return accounts with status Pending.');
  assert.equal(elements.get('learnerClarificationTurn').hidden, true);
  assert.equal(elements.get('managerReplyTurn').hidden, true);
});

test('index.html preserves exact Practice section ordering and does not duplicate question or thinking inputs', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const practiceStart = html.indexOf('<section id="practice"');
  const practiceEnd = html.indexOf('</section>', html.indexOf('<div class="footer">', practiceStart));
  const practiceHtml = html.slice(practiceStart, practiceEnd);

  const headIdx = practiceHtml.indexOf('class="scenario-head"');
  const convIdx = practiceHtml.indexOf('id="scenarioConversation"');
  const qIdx = practiceHtml.indexOf('id="question"');
  const learnerQIdx = practiceHtml.indexOf('id="learnerQuestion"');
  const managerRIdx = practiceHtml.indexOf('id="managerReply"');
  const instrIdx = practiceHtml.indexOf('id="thinkingInstructionCard"');
  const schemaIdx = practiceHtml.indexOf('id="tabSchema"');
  const thinkingIdx = practiceHtml.indexOf('id="thinking"');
  const checkBtnIdx = practiceHtml.indexOf('id="checkThinkingBtn"');
  const feedbackIdx = practiceHtml.indexOf('id="feedback"');
  const fiddleIdx = practiceHtml.indexOf('id="copyFiddleBtn"');

  assert.ok(headIdx > 0 && headIdx < convIdx, 'scenario-head must precede scenarioConversation');
  assert.ok(convIdx < qIdx && qIdx < learnerQIdx && learnerQIdx < managerRIdx, 'conversation turns must be in order');
  assert.ok(managerRIdx < instrIdx, 'conversation must precede thinkingInstructionCard');
  assert.ok(instrIdx < schemaIdx, 'thinkingInstructionCard must precede Schema Overview');
  assert.ok(schemaIdx < thinkingIdx, 'Schema Overview must precede thinking textarea');
  assert.ok(thinkingIdx < checkBtnIdx, 'thinking textarea must precede Check My Thinking button');
  assert.ok(checkBtnIdx < feedbackIdx, 'Check My Thinking button must precede feedback/score');
  assert.ok(feedbackIdx < fiddleIdx, 'feedback/score must precede optional SQL section');

  assert.equal((practiceHtml.match(/id="question"/g) || []).length, 1, 'must have exactly one #question element');
  assert.equal((practiceHtml.match(/<textarea\b/g) || []).length, 1, 'must have exactly one textarea in #practice');
});
