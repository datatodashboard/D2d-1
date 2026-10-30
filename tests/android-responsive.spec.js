import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '320x640', width: 320, height: 640 },
  { name: '360x800', width: 360, height: 800 },
  { name: '412x915', width: 412, height: 915 },
  { name: '480x900', width: 480, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '800x360', width: 800, height: 360 }
];

async function assertNoHorizontalOverflowAndTouchTargets(page, contextName) {
  await page.waitForTimeout(260);
  const result = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const innerWidth = window.innerWidth;
    const buttons = Array.from(document.querySelectorAll('button'));
    const undersized = [];
    for (const btn of buttons) {
      const style = window.getComputedStyle(btn);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      if (btn.hidden || btn.closest('[hidden]')) continue;
      const hiddenParent = btn.closest('.screen:not(.active), .modal-backdrop[ style*="display:none" ], .modal-backdrop[ style*="display: none" ], .modal-overlay[ style*="display:none" ], .modal-overlay[ style*="display: none" ]');
      if (hiddenParent) continue;
      const r = btn.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const w = Math.max(r.width, btn.offsetWidth || 0);
      const h = Math.max(r.height, btn.offsetHeight || 0);
      if (h < 43.5 || w < 43.5) {
        undersized.push({
          id: btn.id || '',
          cls: btn.className || '',
          text: (btn.innerText || btn.getAttribute('aria-label') || '').trim().slice(0, 30),
          w: Math.round(w * 10) / 10,
          h: Math.round(h * 10) / 10
        });
      }
    }
    return {
      overflow: scrollWidth > innerWidth,
      scrollWidth,
      innerWidth,
      undersized
    };
  });

  expect(
    result.overflow,
    `${contextName}: horizontal overflow (${result.scrollWidth}px > ${result.innerWidth}px)`
  ).toBe(false);

  expect(
    result.undersized,
    `${contextName}: visible buttons smaller than 44x44px: ${JSON.stringify(result.undersized)}`
  ).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test(`screens and modals adapt cleanly with zero horizontal overflow and >=44px touch targets at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Home Screen
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const splash = document.getElementById('splashScreen');
      return !splash || splash.classList.contains('hidden') || getComputedStyle(splash).display === 'none';
    }, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Home`);

    // Verify viewport meta includes viewport-fit=cover without user-scalable=no or maximum-scale
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('viewport-fit=cover');
    expect(viewportMeta).not.toContain('user-scalable=no');
    expect(viewportMeta).not.toContain('maximum-scale');

    // Landscape phone check: bottom-nav must not cover more than 25% of viewport height
    if (vp.name === '800x360') {
      const navRatio = await page.evaluate(() => {
        const nav = document.getElementById('bottomNav');
        if (!nav) return 0;
        return nav.getBoundingClientRect().height / window.innerHeight;
      });
      expect(navRatio).toBeLessThanOrEqual(0.25);
    }

    // 2. Login Modal
    await page.evaluate(() => {
      const login = document.getElementById('loginScreen');
      if (login) {
        login.hidden = false;
        login.style.display = 'flex';
      }
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Login Modal`);
    await page.evaluate(() => {
      if (typeof window.cancelGoogleLoginPopup === 'function') window.cancelGoogleLoginPopup();
      const login = document.getElementById('loginScreen');
      if (login) {
        login.hidden = true;
        login.style.display = 'none';
      }
    });

    // 3. Demo Home
    await page.evaluate(() => {
      if (typeof window.startDemoMode === 'function') window.startDemoMode();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Demo Home`);

    // 4. Choose Level Modal
    await page.evaluate(() => {
      const card = document.querySelector('#allDomainsGrid .domain-mission-card');
      if (typeof window.selectDomain === 'function' && card) window.selectDomain('Banking', card);
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Choose Level Modal`);

    // 5. Mission Map
    await page.evaluate(() => {
      const lvl = document.querySelector('#levelsPicker .level-option-btn');
      if (typeof window.selectLevel === 'function' && lvl) window.selectLevel('Beginner', lvl);
      if (typeof window.startPracticeSession === 'function') window.startPracticeSession();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Mission Map`);

    // 6. Practice Screen — Business Scenario Tab
    await page.evaluate(() => {
      if (typeof window.openScenario === 'function') window.openScenario('BAN_BEG_001');
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Practice Business Tab`);

    // 7. Practice Screen — Schema & Records Tab
    await page.evaluate(() => {
      if (typeof window.setPracticeWorkspaceTab === 'function') {
        window.setPracticeWorkspaceTab('schema', false, { instant: true });
      }
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Practice Schema Tab`);

    // 8. Empty Thinking Warning Modal
    await page.evaluate(() => {
      if (typeof window.setPracticeWorkspaceTab === 'function') {
        window.setPracticeWorkspaceTab('business', false, { instant: true });
      }
      const ta = document.getElementById('thinking');
      if (ta) ta.value = '';
      if (typeof window.evaluatePlan === 'function') window.evaluatePlan();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Empty Thinking Modal`);
    await page.evaluate(() => {
      if (typeof window.closeEmptyThinkingModal === 'function') window.closeEmptyThinkingModal();
    });

    // 9. Onboarding Modal
    await page.evaluate(() => {
      if (typeof window.openOnboarding === 'function') window.openOnboarding();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Onboarding Modal`);
    await page.evaluate(() => {
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
    });

    // 10. Progress Screen
    await page.evaluate(() => {
      if (typeof window.showScreen === 'function') window.showScreen('progress');
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Progress Screen`);

    // 11. All Certificates Modal
    await page.evaluate(() => {
      if (typeof window.openAllCertificatesModal === 'function') window.openAllCertificatesModal();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} All Certificates Modal`);
    await page.evaluate(() => {
      if (typeof window.closeAllCertificatesModal === 'function') window.closeAllCertificatesModal();
    });

    // 12. Certificate Preview Overlay
    await page.evaluate(() => {
      if (typeof window.openCertificateModal === 'function') window.openCertificateModal('Banking', 'Beginner');
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Certificate Preview`);
    await page.evaluate(() => {
      if (typeof window.closeCertificateModal === 'function') window.closeCertificateModal();
    });

    // 13. Profile Modal
    await page.evaluate(() => {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Profile Modal`);
    await page.evaluate(() => {
      if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
    });

    // 14. Admin Portal (Demo)
    await page.goto('/admin.html?demo=1', { waitUntil: 'networkidle' });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Admin Portal`);

    // 15. Verify Credential Page
    await page.goto('/verify.html', { waitUntil: 'networkidle' });
    await assertNoHorizontalOverflowAndTouchTargets(page, `${vp.name} Verify Page`);
  });
}

test('full learner flow works end-to-end on Android phone viewport (360x800)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';
    if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
  });

  // Start Demo Mode
  await page.locator('#homeTryDemoBtn').click();
  await expect(page.locator('#demoHomeHeaderUtility')).toBeVisible();

  // Select Banking domain
  await page.locator('#allDomainsGrid .domain-mission-card').first().click();
  await expect(page.locator('#chooseLevelModal')).toBeVisible();

  // Select Beginner level and start practice
  await page.locator('#levelsPicker .level-option-btn').first().click();
  await page.locator('#startPracticeBtn').click();
  await expect(page.locator('#missionMap')).toHaveClass(/active/);

  // Click Scenario 1 node on Mission Map (uses infinite pulse animation)
  await page.locator('#missionMapCanvas .map-node.available').first().click({ force: true });
  await expect(page.locator('#practice')).toHaveClass(/active/);
  await expect(page.locator('#scenarioId')).toContainText('BAN_BEG_001');

  // Switch between Business Scenario and Schema & Records tabs
  await page.locator('#practiceTabSchema').click();
  await expect(page.locator('#practiceTabSchema')).toHaveAttribute('aria-selected', 'true');
  const tableScrollTabindex = await page.locator('#schema .table-scroll').first().getAttribute('tabindex');
  expect(tableScrollTabindex).toBe('0');

  await page.locator('#practiceTabBusiness').click();
  await expect(page.locator('#practiceTabBusiness')).toHaveAttribute('aria-selected', 'true');

  // Verify #thinking textarea height >= 120px, font-size 16px, and keyboard-active class on focus
  const thinkingBox = await page.locator('#thinking').boundingBox();
  expect(thinkingBox.height).toBeGreaterThanOrEqual(120);
  const thinkingFontSize = await page.locator('#thinking').evaluate(el => getComputedStyle(el).fontSize);
  expect(thinkingFontSize).toBe('16px');

  await page.locator('#thinking').focus();
  await expect(page.locator('body')).toHaveClass(/keyboard-input-active/);

  // Enter thinking plan and check score
  await page.locator('#thinking').fill(
    'Select distinct category values from the account_products table, order alphabetically by category ascending, and keep null values at the end.'
  );
  await page.locator('#checkThinkingBtn').click();
  await expect(page.locator('#feedback')).toHaveAttribute('data-has-result', 'true');
  await expect(page.locator('#howToThinkBox')).toBeVisible();
});
