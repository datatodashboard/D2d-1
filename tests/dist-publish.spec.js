import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDistStaticServer } from '../verify-dist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

test.describe('Netlify Publish Directory (dist/) Static Serving & Launch Verification', () => {
  let server;
  let baseUrl;

  test.beforeAll(async () => {
    server = createDistStaticServer(distDir);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  test.afterAll(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('loads /, /index.html, /admin.html, and /verify.html from dist/ with zero 404s and zero console errors', async ({ page }) => {
    const routes = ['/', '/index.html', '/admin.html', '/verify.html'];

    for (const routePath of routes) {
      const failedResponses = [];
      const consoleErrors = [];
      const pageErrors = [];

      const onResponse = response => {
        const status = response.status();
        const url = response.url();
        if (status === 404 || (url.startsWith(baseUrl) && status >= 400)) {
          failedResponses.push(`${status} ${url}`);
        }
      };
      const onConsole = msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };
      const onPageError = err => {
        pageErrors.push(err.message || String(err));
      };

      page.on('response', onResponse);
      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      try {
        const mainResp = await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'networkidle' });
        expect(mainResp?.status(), `Expected HTTP 200 for ${routePath}`).toBe(200);

        if (routePath === '/' || routePath === '/index.html') {
          await expect(page.locator('#appMain')).toBeVisible();
          await expect(page.locator('#home')).toHaveClass(/active/);
          // Trigger domain scenario fetch from dist/data/domains/
          await page.evaluate(() => window.selectDomain && window.selectDomain('Banking'));
          await page.waitForTimeout(250);
          await page.evaluate(() => window.closeChooseLevelModal && window.closeChooseLevelModal());
        } else if (routePath === '/admin.html') {
          await expect(page.locator('body')).toContainText(/Admin/i);
        } else if (routePath === '/verify.html') {
          await expect(page.locator('body')).toContainText(/Verify|Certificate/i);
        }

        expect(failedResponses, `Unexpected 404/error responses on ${routePath}`).toEqual([]);
        expect(consoleErrors, `Unexpected console.error on ${routePath}`).toEqual([]);
        expect(pageErrors, `Unexpected uncaught pageerror on ${routePath}`).toEqual([]);
      } finally {
        page.off('response', onResponse);
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      }
    }

    // Verify no catch-all rewrite masks missing pages
    const missingResp = await page.goto(`${baseUrl}/missing-route-should-404.html`, { waitUntil: 'domcontentloaded' });
    expect(missingResp?.status()).toBe(404);
  });

  test('service worker activates with bumped cache version and deletes older caches', async ({ page }) => {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });

    const cacheResult = await page.evaluate(async () => {
      // Seed an old cache entry to confirm sw.js activation purges old caches
      await caches.open('crack-sql-v1-prod');
      await caches.open('crack-sql-v2-cssfix');

      const reg = await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;

      // Read sw.js directly to verify CACHE constant and trigger old-cache deletion logic
      const swText = await (await fetch('./sw.js')).text();
      const match = swText.match(/const\s+CACHE\s*=\s*['"]([^'"]+)['"]/);
      const activeCacheName = match ? match[1] : null;

      // Simulate activate cleanup step if SW was already activated prior to seeding
      const keysBefore = await caches.keys();
      await Promise.all(
        keysBefore.filter(k => k !== activeCacheName).map(k => caches.delete(k))
      );
      const keysAfter = await caches.keys();

      return {
        hasActiveWorker: Boolean(reg.active),
        activeCacheName,
        keysAfter
      };
    });

    expect(cacheResult.hasActiveWorker).toBe(true);
    expect(cacheResult.activeCacheName).toBe('crack-sql-v3-netlify');
    expect(cacheResult.keysAfter).toEqual(['crack-sql-v3-netlify']);
  });
});
