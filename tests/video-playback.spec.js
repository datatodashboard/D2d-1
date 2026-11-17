import { test, expect } from '@playwright/test';

const BASE_VIDEO_URL = 'https://qklnaqfspvmnlequqagf.supabase.co/storage/v1/object/public/crack-sql-videos';
const VIDEO_IDS = Array.from({ length: 20 }, (_, i) => `BAN_BEG_${String(i + 1).padStart(3, '0')}`);

test('Premium Compact Practice Page Redesign: Centered box container, 30%/70% Business Scenario + Thinking cards, and interactive Schema & Records explorer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  // Enter via Go Demo Mode so we can inspect Practice scenarios
  await page.evaluate(() => {
    if (typeof window.startSandboxSession === 'function') {
      window.startSandboxSession();
    }
  });

  // Open Banking Beginner Question 1 (BAN_BEG_001) to enter Practice screen
  await page.evaluate(() => {
    window.openScenario('BAN_BEG_001');
  });

  // 1. Verify only two main tabs exist in #practice and Business Scenario is active by default
  const mainTabs = page.locator('#practice .practice-tabs-bar [role="tab"]');
  await expect(mainTabs).toHaveCount(2);
  await expect(mainTabs.nth(0)).toHaveText('Business Scenario');
  await expect(mainTabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(mainTabs.nth(1)).toHaveText('Schema & Records');

  // 2. Verify Practice Header displays Change button, Banking • Beginner, and compact question progress indicator
  await expect(page.locator('#practice .topbar .linkbtn')).toContainText('Change');
  await expect(page.locator('#practice #meta')).toContainText('Banking');
  await expect(page.locator('#practice #qno')).toBeVisible();
  await expect(page.locator('#practice #qno')).toContainText('Exercise');

  // 3. Verify all 20 Banking Beginner videos (BAN_BEG_001-020) in 30% Left / 70% Right layout
  for (const id of VIDEO_IDS) {
    await page.evaluate((scenarioId) => {
      window.openScenario(scenarioId);
    }, id);

    const splitGrid = page.locator('#businessScenarioSplitGrid');
    const visualCol = page.locator('#visualChallengeColumn');
    const writtenCol = page.locator('#writtenScenarioColumn');
    const scenarioCardA = page.locator('#scenarioConversation');
    const thinkingCardB = page.locator('#scenarioThinkingInline');
    const managerAvatarCard = page.locator('#practice .conversation-manager-card');
    const placeholder = page.locator('#visualChallengePlaceholder');
    const videoEl = page.locator('#scenarioChallengeVideo');
    const thinkingArea = page.locator('#thinking');
    const checkBtns = page.locator('#practice #checkThinkingBtn:visible');

    // Verify two-column layout is active, Manager avatar card is hidden, and exactly ONE Check My Thinking button is visible
    await expect(splitGrid).toHaveAttribute('data-has-video', 'true');
    await expect(visualCol).toBeVisible();
    await expect(writtenCol).toBeVisible();
    await expect(scenarioCardA).toBeVisible();
    await expect(thinkingCardB).toBeVisible();
    await expect(managerAvatarCard).toBeHidden();
    await expect(thinkingArea).toBeVisible();
    await expect(checkBtns).toHaveCount(1);

    // Verify 30% Left Video / 70% Right Scenario+Thinking proportions and Card B directly below Card A
    const visualBox = await visualCol.boundingBox();
    const writtenBox = await writtenCol.boundingBox();
    const cardABox = await scenarioCardA.boundingBox();
    const cardBBox = await thinkingCardB.boundingBox();
    const thinkingBox = await thinkingArea.boundingBox();
    const checkBtnBox = await checkBtns.first().boundingBox();

    expect(visualBox.x).toBeLessThan(writtenBox.x);
    // Right column (~62%) is significantly wider than enlarged left video column (~38%)
    expect(writtenBox.width).toBeGreaterThan(visualBox.width * 1.5);
    // Card B (Your Thinking) is directly below Card A (Business Scenario) inside the right column
    expect(Math.abs(cardABox.x - writtenBox.x)).toBeLessThan(12);
    expect(Math.abs(cardBBox.x - writtenBox.x)).toBeLessThan(12);
    expect(cardBBox.y).toBeGreaterThanOrEqual(cardABox.y + cardABox.height - 2);
    expect(thinkingBox.y).toBeGreaterThan(cardABox.y);
    // Check My Thinking button is inside Card B directly below the thinking box
    expect(checkBtnBox.y).toBeGreaterThan(thinkingBox.y);
    expect(checkBtnBox.width).toBeLessThanOrEqual(280);

    // Lazy media loading: before Play is clicked, placeholder is visible and video has no src
    await expect(placeholder).toBeVisible();
    await expect(videoEl).toBeHidden();
    const initialSrc = await videoEl.getAttribute('src');
    expect(initialSrc).toBeNull();

    // Click Play button
    await page.locator('#visualChallengePlayBtn').click();

    // Video becomes visible with exact Supabase storage URL and native controls
    await expect(videoEl).toBeVisible();
    await expect(placeholder).toBeHidden();
    await expect(videoEl).toHaveAttribute('src', `${BASE_VIDEO_URL}/${id}.mp4`);
    await expect(videoEl).toHaveAttribute('controls', '');
  }

  // 4. Open BAN_BEG_001 and verify unsaved typing is preserved when switching between Business Scenario and Schema & Records tabs
  await page.evaluate(() => {
    window.openScenario('BAN_BEG_001');
  });
  const sampleTyping = 'Filter the accounts table where status is Active and return all columns.';
  await page.locator('#thinking').fill(sampleTyping);
  await expect(page.locator('#thinking')).toHaveValue(sampleTyping);

  // Switch to Schema & Records tab and verify responsive card grid with collapsible sample records
  await page.locator('#practiceTabSchema').click();
  const schemaGrid = page.locator('#schema');
  await expect(schemaGrid).toBeVisible();

  // Verify Banking tables are rendered as cards and sample records are collapsed by default
  const tableCards = schemaGrid.locator('.schema-card');
  expect(await tableCards.count()).toBeGreaterThanOrEqual(3);
  await expect(schemaGrid.locator('.schema-sample-toggle[aria-expanded="true"]')).toHaveCount(0);

  // Verify accounts card shows two-column Columns table (Column / Type) and PK/FK badges
  const accountsCard = schemaGrid.locator('.schema-card[data-table="accounts"]');
  await expect(accountsCard.locator('.schema-table-name')).toHaveText('accounts');
  await expect(accountsCard.locator('.schema-cols-table')).toContainText('account_id');
  await expect(accountsCard.locator('.schema-cols-table')).toContainText('balance');

  // Click "Show sample records (n)" toggle on accounts card -> expands sample records table inside .table-scroll
  const toggleBtn = accountsCard.locator('.schema-sample-toggle');
  await expect(toggleBtn).toContainText('Show sample records (');
  await toggleBtn.click();
  await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(toggleBtn).toContainText('Hide sample records (');
  await expect(accountsCard.locator('.table-scroll[role="region"] table.sample-records-table')).toBeVisible();

  // Switch back to Business Scenario tab -> verify unsaved typing is preserved
  await page.locator('#practiceTabBusiness').click();
  await expect(page.locator('#thinking')).toBeVisible();
  await expect(page.locator('#thinking')).toHaveValue(sampleTyping);

  // 5. Verify centered container & balanced layout across 1366x768, 1440x900, and 1920x1080 desktop screens
  for (const vp of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(vp);
    const practiceBox = await page.locator('#practice').boundingBox();
    expect(practiceBox.width).toBeLessThanOrEqual(1450.5);
    // Centered horizontally with balanced left/right margins
    const leftMargin = practiceBox.x;
    const rightMargin = vp.width - (practiceBox.x + practiceBox.width);
    expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(20);
  }

  // 6. Verify mobile layout (360x800) stacks cleanly with zero horizontal overflow
  await page.setViewportSize({ width: 360, height: 800 });
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.locator('#visualChallengeColumn')).toBeVisible();
  await expect(page.locator('#scenarioConversation')).toBeVisible();
  await expect(page.locator('#thinking')).toBeVisible();
});

