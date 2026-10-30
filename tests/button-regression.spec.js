import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 }
];

function createSupabaseMockScript({ signedIn = true, isAdmin = false, paidUnlocked = false } = {}) {
  return `
    window.supabase = {
      createClient() {
        const isSignedIn = ${Boolean(signedIn)};
        const isAdminUser = ${Boolean(isAdmin)};
        const isPaid = ${Boolean(paidUnlocked)};
        const mockUser = isSignedIn ? {
          id: isAdminUser ? 'admin-test-id' : 'learner-test-id',
          email: isAdminUser ? 'admin@cracksql.com' : 'learner@cracksql.com',
          user_metadata: { full_name: 'Test Learner', name: 'Test Learner' }
        } : null;
        const mockSession = mockUser ? { user: mockUser, access_token: 'mock-jwt-token' } : null;

        const mockContest = {
          id: 'contest-test-1',
          title: 'Crack SQL Thinking Challenge #1',
          status: 'PUBLISHED',
          audience_type: 'ALL',
          entry_fee: 49,
          prize_1st: '₹1,000',
          prize_2nd: '₹500',
          prize_3rd: '₹250',
          scenario_text: 'Analyze regional banking dormancy risk across multi-branch accounts.',
          instructions: 'Explain step by step how you would solve this problem.',
          rules: 'One attempt per user. 15 minutes time limit.'
        };

        function makeQuery(table) {
          const q = {
            select() { return q; },
            eq() { return q; },
            in() { return q; },
            ilike() { return q; },
            order() { return q; },
            limit() { return q; },
            insert() { return q; },
            update() { return q; },
            upsert() { return q; },
            delete() { return q; },
            maybeSingle() {
              if (table === 'profiles' && mockUser) {
                return Promise.resolve({
                  data: {
                    id: mockUser.id,
                    email: mockUser.email,
                    username: 'TestLearner',
                    mobile_number: '+919876543210',
                    whatsapp_consent: true,
                    is_admin: isAdminUser,
                    paid_unlocked: isPaid
                  },
                  error: null
                });
              }
              if (table === 'admin_users' && isAdminUser && mockUser) {
                return Promise.resolve({ data: { role: 'admin' }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            single() { return q.maybeSingle(); },
            then(resolve) {
              if (table === 'contests') {
                return Promise.resolve({ data: [mockContest], error: null }).then(resolve);
              }
              if (table === 'profiles' && isAdminUser) {
                return Promise.resolve({
                  data: [{
                    id: 'learner-test-id',
                    email: 'learner@cracksql.com',
                    username: 'TestLearner',
                    mobile_number: '+919876543210',
                    whatsapp_consent: true,
                    is_admin: false,
                    paid_unlocked: true,
                    solved_count: 20,
                    updated_at: new Date().toISOString()
                  }],
                  error: null
                }).then(resolve);
              }
              return Promise.resolve({ data: [], error: null }).then(resolve);
            }
          };
          return q;
        }

        return {
          auth: {
            onAuthStateChange(cb) {
              setTimeout(() => cb(mockSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockSession), 0);
              return { data: { subscription: { unsubscribe() {} } } };
            },
            getSession() {
              return Promise.resolve({ data: { session: mockSession }, error: null });
            },
            getUser() {
              return Promise.resolve({ data: { user: mockUser }, error: null });
            },
            signOut() {
              return Promise.resolve({ error: null });
            },
            signInWithOAuth() {
              return Promise.resolve({ data: {}, error: null });
            }
          },
          rpc(fn) {
            if (fn === 'is_admin') return Promise.resolve({ data: isAdminUser, error: null });
            if (fn === 'sync_user_progress' || fn === 'reconcile_user_completions') {
              return Promise.resolve({ data: { completed_count: 2 }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
          from(table) {
            return makeQuery(table);
          },
          functions: {
            invoke() {
              return Promise.resolve({ data: null, error: null });
            }
          }
        };
      }
    };
  `;
}

async function checkButtonsAndLayout(page, screenName) {
  await page.waitForTimeout(180);

  const check = await page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const pageOverflow = scrollWidth > innerWidth;

    const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const failures = [];
    const visibleElements = [];

    function getMaxLinesInSingleTextNode(rootEl) {
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.classList.contains('notification-badge') || parent.classList.contains('map-node-badge')) {
            return NodeFilter.FILTER_REJECT;
          }
          const st = window.getComputedStyle(parent);
          if (st.display === 'none' || st.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let maxNodeLines = 1;
      let singleWordWrapped = false;
      let textNode;
      while ((textNode = walker.nextNode())) {
        const raw = textNode.nodeValue.trim().replace(/\s+/g, ' ');
        if (!raw) continue;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rects = Array.from(range.getClientRects()).filter(r => r.width > 0.5 && r.height > 0.5);
        const lineTops = [];
        for (const r of rects) {
          if (!lineTops.some(t => Math.abs(t - r.top) < 6)) {
            lineTops.push(r.top);
          }
        }
        const lines = lineTops.length;
        if (lines > maxNodeLines) maxNodeLines = lines;
        const nodeWords = raw.split(' ').filter(Boolean);
        if (nodeWords.length === 1 && lines > 1) {
          singleWordWrapped = true;
        }
      }
      return { maxNodeLines, singleWordWrapped };
    }

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      if (el.hidden || el.closest('[hidden]')) continue;

      const hiddenParent = el.closest(
        '.screen:not(.active), .modal-backdrop[style*="display:none"], .modal-backdrop[style*="display: none"], .modal-overlay[style*="display:none"], .modal-overlay[style*="display: none"]'
      );
      if (hiddenParent) continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      // Temporarily hide floating corner badges (.notification-badge, .map-node-badge) so they don't skew text scrollWidth
      const cornerBadges = Array.from(el.querySelectorAll('.notification-badge, .map-node-badge'));
      const savedDisplays = cornerBadges.map(b => b.style.display);
      cornerBadges.forEach(b => { b.style.display = 'none'; });

      const elScrollW = el.scrollWidth;
      const elClientW = el.clientWidth;
      const elScrollH = el.scrollHeight;
      const elClientH = el.clientHeight;

      cornerBadges.forEach((b, idx) => { b.style.display = savedDisplays[idx]; });

      // 1. Text Overflow check (scrollWidth > clientWidth + 1 or scrollHeight > clientHeight + 1)
      const textOverflow = (elScrollW > elClientW + 1) || (elScrollH > elClientH + 1);

      // 2. Minimum dimension check:
      // Height or width >= 44px (icon-only buttons may be square but at least 40px)
      const isIconOnly =
        el.classList.contains('notification-avatar-btn') ||
        el.classList.contains('profile-avatar-btn') ||
        el.classList.contains('modal-close-btn') ||
        el.classList.contains('modal-close') ||
        el.classList.contains('thinking-modal-close') ||
        el.classList.contains('contest-modal-close') ||
        el.id === 'chooseLevelCloseBtn';

      const w = Math.max(r.width, el.offsetWidth || 0);
      const h = Math.max(r.height, el.offsetHeight || 0);

      const minDimFail = isIconOnly
        ? (w < 40 || h < 40 || Math.abs(w - h) > 2)
        : (w < 43.5 || h < 43.5);

      // 3. Text wrapping check:
      // Fail if text wraps in a one-word button.
      // Allow longer labels to wrap only inside cards and only when the button has min-height and padding.
      const cleanClone = el.cloneNode(true);
      cleanClone.querySelectorAll('.notification-badge, .map-node-badge').forEach(n => n.remove());
      const text = (cleanClone.innerText || cleanClone.textContent || '').trim().replace(/\s+/g, ' ');
      const { maxNodeLines: lineCount, singleWordWrapped } = getMaxLinesInSingleTextNode(el);

      const isCardOrInsideCard = Boolean(
        el.classList.contains('domain-mission-card') ||
        el.classList.contains('level-option-btn') ||
        el.classList.contains('selection-card') ||
        el.classList.contains('catalog-item') ||
        el.classList.contains('feedback-emoji-btn') ||
        el.classList.contains('brand-wrap') ||
        el.closest('#chooseLevelScenarioList, .domain-missions-grid, .levels, .cert-cards-grid, .contest-invitation-card, .modal-dialog, .modal-card, .modal-box, .card, .panel')
      );
      const hasMinHeightAndPadding =
        parseFloat(style.minHeight || '0') >= 40 &&
        (parseFloat(style.paddingTop || '0') > 0 || parseFloat(style.paddingLeft || '0') > 0);

      let textWrapped = false;
      if (singleWordWrapped) {
        textWrapped = true;
      } else if (lineCount > 1) {
        if (!isCardOrInsideCard || !hasMinHeightAndPadding) {
          textWrapped = true;
        }
      }

      if (textOverflow || minDimFail || textWrapped) {
        failures.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          cls: typeof el.className === 'string' ? el.className : '',
          text: text.slice(0, 40),
          w: Math.round(w * 10) / 10,
          h: Math.round(h * 10) / 10,
          scrollW: elScrollW,
          clientW: elClientW,
          scrollH: elScrollH,
          clientH: elClientH,
          lineCount,
          textOverflow,
          minDimFail,
          textWrapped
        });
      }

      visibleElements.push({ el, r, text });
    }

    // 4. Sibling button overlap check
    const overlaps = [];
    for (let i = 0; i < visibleElements.length; i++) {
      for (let j = i + 1; j < visibleElements.length; j++) {
        const a = visibleElements[i];
        const b = visibleElements[j];

        if (a.el.parentElement && a.el.parentElement === b.el.parentElement) {
          const overlap = !(
            a.r.right <= b.r.left + 1 ||
            a.r.left >= b.r.right - 1 ||
            a.r.bottom <= b.r.top + 1 ||
            a.r.top >= b.r.bottom - 1
          );
          if (overlap) {
            overlaps.push({
              btnA: a.text || a.el.id || a.el.className,
              btnB: b.text || b.el.id || b.el.className
            });
          }
        }
      }
    }

    return { pageOverflow, scrollWidth, innerWidth, failures, overlaps };
  });

  expect(check.pageOverflow, `Horizontal page overflow on ${screenName}: ${check.scrollWidth}px > ${check.innerWidth}px`).toBe(false);
  expect(check.failures, `Button layout issues on ${screenName}: ${JSON.stringify(check.failures)}`).toEqual([]);
  expect(check.overlaps, `Button overlap issues on ${screenName}: ${JSON.stringify(check.overlaps)}`).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test(`button layout and touch targets regression check across all screens and modals at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // --- PART A: Signed-out Home & Login Modal check ---
    let mockMode = { signedIn: false, isAdmin: false, paidUnlocked: false };
    await page.route('**/supabase.min.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: createSupabaseMockScript(mockMode)
      });
    });

    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
    });

    // Verify #authBox has only 1 button ("Continue with Google"), full-width on phones, and no demo/Try Standard buttons
    const signedOutAuthCheck = await page.evaluate(() => {
      const authBtns = Array.from(document.querySelectorAll('#authBox button'));
      const adminBtn = document.getElementById('headerAdminPortalBtn');
      const adminHidden = !adminBtn || adminBtn.hidden || getComputedStyle(adminBtn).display === 'none';
      const bodyText = document.body.innerText || '';
      const authBtnWidth = authBtns[0] ? Math.round(authBtns[0].getBoundingClientRect().width) : 0;
      return {
        authBtnCount: authBtns.length,
        authBtnText: authBtns.map(b => b.textContent.trim()),
        authBtnWidth,
        adminHidden,
        hasTryStandard: /try standard|try demo|demo mode/i.test(bodyText)
      };
    });
    expect(signedOutAuthCheck.authBtnCount).toBe(1);
    expect(signedOutAuthCheck.authBtnText[0]).toBe('Continue with Google');
    if (vp.width <= 600) {
      expect(signedOutAuthCheck.authBtnWidth).toBeGreaterThanOrEqual(vp.width - 40);
    }
    expect(signedOutAuthCheck.adminHidden).toBe(true);
    expect(signedOutAuthCheck.hasTryStandard).toBe(false);

    await checkButtonsAndLayout(page, `${vp.name} - Home (Signed Out)`);

    // Login Modal (#loginScreen)
    await page.evaluate(() => {
      if (typeof window.openLoginModal === 'function') window.openLoginModal();
    });
    await checkButtonsAndLayout(page, `${vp.name} - Login Modal`);
    await page.evaluate(() => {
      if (typeof window.closeLoginModal === 'function') window.closeLoginModal();
    });

    // --- PART B: Signed-in Learner State across all screens and modals ---
    mockMode = { signedIn: true, isAdmin: false, paidUnlocked: false };
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
    });

    // Normal signed-in learner must NOT see Admin Portal button
    const learnerAdminHidden = await page.evaluate(() => {
      const adminBtn = document.getElementById('headerAdminPortalBtn');
      return !adminBtn || adminBtn.hidden || getComputedStyle(adminBtn).display === 'none';
    });
    expect(learnerAdminHidden).toBe(true);

    // 1. Home (Signed-in)
    await checkButtonsAndLayout(page, `${vp.name} - Home (Signed In)`);

    // 2. Choose Level Modal
    await page.evaluate(() => {
      const card = document.querySelector('#allDomainsGrid .domain-mission-card');
      if (typeof window.selectDomain === 'function' && card) window.selectDomain('Banking', card);
    });
    await checkButtonsAndLayout(page, `${vp.name} - Choose Level Modal`);

    // 3. Mission Map
    await page.evaluate(async () => {
      const lvl = document.querySelector('#levelsPicker .level-option-btn');
      if (typeof window.selectLevel === 'function' && lvl) window.selectLevel('Beginner', lvl);
      if (typeof window.startPracticeSession === 'function') await window.startPracticeSession();
    });
    await checkButtonsAndLayout(page, `${vp.name} - Mission Map`);

    // 4. Practice Screen — Business Scenario Tab
    await page.evaluate(async () => {
      if (typeof window.openScenario === 'function') await window.openScenario('BAN_BEG_001');
    });
    await checkButtonsAndLayout(page, `${vp.name} - Practice (Business Tab)`);

    // 5. Practice Screen — Schema & Sample Records Tab
    await page.evaluate(() => {
      if (typeof window.setPracticeWorkspaceTab === 'function') {
        window.setPracticeWorkspaceTab('schema', false, { instant: true });
      } else {
        document.getElementById('practiceTabSchema')?.click();
      }
    });
    await checkButtonsAndLayout(page, `${vp.name} - Practice (Schema Tab)`);

    // 6. Feedback Modals (Motivation Popup + Mandatory Level Feedback Modal)
    await page.evaluate(() => {
      document.getElementById('practiceTabBusiness')?.click();
      if (typeof window.openMotivationPopup === 'function') window.openMotivationPopup(8);
    });
    await checkButtonsAndLayout(page, `${vp.name} - Feedback Motivation Modal`);
    await page.evaluate(() => {
      if (typeof window.closeMotivationModal === 'function') window.closeMotivationModal();
      if (typeof window.openMandatoryLevelFeedbackModal === 'function') {
        window.openMandatoryLevelFeedbackModal('Banking', 'Beginner');
      }
    });
    await checkButtonsAndLayout(page, `${vp.name} - Mandatory Level Feedback Modal`);

    // 7. Level Completion Modal (unlocked after submitting mandatory level feedback)
    await page.evaluate(async () => {
      const ta = document.getElementById('mandatoryFeedbackText');
      if (ta) ta.value = 'Great realistic banking scenarios!';
      if (typeof window.submitMandatoryLevelFeedback === 'function') {
        await window.submitMandatoryLevelFeedback();
      }
    });
    await checkButtonsAndLayout(page, `${vp.name} - Level Completion Modal`);
    await page.evaluate(() => {
      if (typeof window.closeLevelCompletionModal === 'function') window.closeLevelCompletionModal();
    });

    // 8. Progress Screen
    await page.evaluate(async () => {
      if (typeof window.showScreen === 'function') await window.showScreen('progress');
    });
    await checkButtonsAndLayout(page, `${vp.name} - Progress Screen`);

    // 9. Profile Modal
    await page.evaluate(() => {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    });
    await checkButtonsAndLayout(page, `${vp.name} - Profile Modal`);
    await page.evaluate(() => {
      if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    });

    // 10. Paywall Modal
    await page.evaluate(() => {
      if (typeof window.openPaywallModal === 'function') window.openPaywallModal();
    });
    await checkButtonsAndLayout(page, `${vp.name} - Paywall Modal`);
    await page.evaluate(() => {
      if (typeof window.closePaywallModal === 'function') window.closePaywallModal();
    });

    // 11. Contest Card & Contest Modal
    await page.evaluate(async () => {
      if (typeof window.showScreen === 'function') await window.showScreen('home');
      const mockClient = window.supabase.createClient();
      const mockUser = { id: 'learner-test-id', email: 'learner@cracksql.com' };
      if (typeof window.initContest === 'function') {
        await window.initContest(mockClient, mockUser, 20, false);
      }
      if (typeof window.openContestModal === 'function') {
        window.openContestModal('details');
      }
    });
    await checkButtonsAndLayout(page, `${vp.name} - Contest Modal`);
    await page.evaluate(() => {
      if (typeof window.closeContestModal === 'function') window.closeContestModal();
    });

    // 12. Certificates List Modal
    await page.evaluate(async () => {
      if (typeof window.openAllCertificatesModal === 'function') await window.openAllCertificatesModal();
    });
    await checkButtonsAndLayout(page, `${vp.name} - Certificates List Modal`);
    await page.evaluate(() => {
      if (typeof window.closeAllCertificatesModal === 'function') window.closeAllCertificatesModal();
    });

    // 13. Certificate Preview Modal
    await page.evaluate(() => {
      if (typeof window.openCertificateModal === 'function') {
        window.openCertificateModal({
          domain: 'Banking',
          level: 'Beginner',
          userName: 'Test Learner',
          completionDate: '30 October 2026'
        });
      }
    });
    await checkButtonsAndLayout(page, `${vp.name} - Certificate Preview Modal`);
    await page.evaluate(() => {
      if (typeof window.closeCertificateModal === 'function') window.closeCertificateModal();
    });

    // --- PART C: Signed-in Admin Home Header & Admin Page (/admin.html) ---
    mockMode = { signedIn: true, isAdmin: true, paidUnlocked: true };
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
    });
    const adminVisible = await page.evaluate(() => {
      const adminBtn = document.getElementById('headerAdminPortalBtn');
      return Boolean(adminBtn && !adminBtn.hidden && getComputedStyle(adminBtn).display !== 'none');
    });
    expect(adminVisible).toBe(true);
    await checkButtonsAndLayout(page, `${vp.name} - Home (Signed-In Admin)`);

    // 14. Admin Screen (/admin.html)
    await page.goto('/admin.html', { waitUntil: 'networkidle' });
    await checkButtonsAndLayout(page, `${vp.name} - Admin Portal`);

    // 15. Verify Screen (/verify.html)
    await page.goto('/verify.html', { waitUntil: 'networkidle' });
    await checkButtonsAndLayout(page, `${vp.name} - Verify Credential Screen`);
  });
}
