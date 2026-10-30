import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'screenshots/baseline';
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 }
];

async function capture() {
  const browser = await chromium.launch();
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    // 1. Unauthenticated Login Screen
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      if (typeof window.closeOnboarding === 'function') window.closeOnboarding();
      const login = document.getElementById('loginScreen');
      if (login) {
        login.hidden = false;
        login.style.display = 'flex';
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `login_${vp.name}.png`), fullPage: false });

    // 2. Set signed-in state for all subsequent screens
    await page.evaluate(async () => {
      const login = document.getElementById('loginScreen');
      if (login) {
        login.hidden = true;
        login.style.display = 'none';
      }
      const app = document.getElementById('appMain');
      if (app) {
        app.hidden = false;
        app.style.display = '';
      }
      const nav = document.getElementById('bottomNav');
      if (nav) {
        nav.hidden = false;
        nav.style.display = '';
      }
      if (typeof window.showScreen === 'function') {
        await window.showScreen('home');
      }
    });
    await page.waitForTimeout(400);

    // 2. Home screen
    await page.screenshot({ path: path.join(outDir, `home_${vp.name}.png`), fullPage: false });

    // 3. Choose Level Modal
    await page.evaluate(() => {
      const card = document.querySelector('#allDomainsGrid .domain-mission-card');
      if (typeof window.selectDomain === 'function' && card) {
        window.selectDomain('Banking', card);
      } else if (typeof window.openChooseLevelModal === 'function') {
        window.openChooseLevelModal('Banking');
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `choose-level_${vp.name}.png`), fullPage: false });

    // 4. Mission Map
    await page.evaluate(async () => {
      if (typeof window.closeChooseLevelModal === 'function') window.closeChooseLevelModal();
      if (typeof window.openMissionMap === 'function') {
        await window.openMissionMap('Banking', 'Beginner');
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `mission-map_${vp.name}.png`), fullPage: false });

    // 5. Practice Screen
    await page.evaluate(async () => {
      if (typeof window.openScenario === 'function') {
        await window.openScenario('BAN_BEG_001');
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `practice_${vp.name}.png`), fullPage: false });

    // 6. Progress Screen
    await page.evaluate(async () => {
      if (typeof window.showScreen === 'function') {
        await window.showScreen('progressScreen');
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `progress_${vp.name}.png`), fullPage: false });

    // 7. Profile Modal
    await page.evaluate(() => {
      if (typeof window.openProfileModal === 'function') {
        window.openProfileModal();
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `profile_${vp.name}.png`), fullPage: false });

    // 8. Paywall Modal
    await page.evaluate(() => {
      if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
      if (typeof window.openPaywallModal === 'function') {
        window.openPaywallModal('Banking', 'Intermediate');
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `paywall_${vp.name}.png`), fullPage: false });

    // 9. Certificates List Modal
    await page.evaluate(async () => {
      if (typeof window.closePaywallModal === 'function') window.closePaywallModal();
      if (typeof window.openAllCertificatesModal === 'function') {
        await window.openAllCertificatesModal();
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `certificates-list_${vp.name}.png`), fullPage: false });

    // 10. Certificates Preview Modal
    await page.evaluate(() => {
      if (typeof window.closeAllCertificatesModal === 'function') window.closeAllCertificatesModal();
      if (typeof window.openCertificateModal === 'function') {
        window.openCertificateModal({
          domain: 'Banking',
          level: 'Beginner',
          learnerName: 'Test Learner',
          completionDate: '2026-10-30',
          certNumber: 'D2D-SQL-TEST-001'
        });
      }
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `certificates-preview_${vp.name}.png`), fullPage: false });

    // 11. Admin page
    await page.goto('http://localhost:3000/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `admin_${vp.name}.png`), fullPage: false });

    // 12. Verify page
    await page.goto('http://localhost:3000/verify.html?id=D2D-SQL-TEST-001', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `verify_${vp.name}.png`), fullPage: false });

    await context.close();
  }
  await browser.close();
  console.log(`Successfully captured all baseline screenshots to ${outDir}`);
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
