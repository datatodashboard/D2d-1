import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Crack SQL – Sandbox Session / Go Demo Mode Verification Suite', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf8');
  const cloudJs = fs.readFileSync(path.join(rootDir, 'js/cloud.js'), 'utf8');
  const swJs = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');

  test('1. The one button: "Go Demo Mode" exists strictly on login screen in secondary style', () => {
    // Exactly one button with visible text "Go Demo Mode"
    const demoMatches = [...indexHtml.matchAll(/>\s*Go Demo Mode\s*</g)];
    assert.equal(demoMatches.length, 1, 'Exactly one button with visible text "Go Demo Mode" must exist in index.html');

    // The button is on the login screen modal (#loginScreen) only
    const loginScreenMatch = indexHtml.match(/<section id="loginScreen"[\s\S]*?<\/section>/);
    assert.ok(loginScreenMatch, '#loginScreen must exist');
    assert.ok(loginScreenMatch[0].includes('id="sandboxEntryBtn"'), '#sandboxEntryBtn must be inside #loginScreen');
    assert.ok(loginScreenMatch[0].includes('Go Demo Mode'), 'Go Demo Mode must be inside #loginScreen');

    // Placed directly below #googleSignIn
    const googleIdx = loginScreenMatch[0].indexOf('id="googleSignIn"');
    const sandboxIdx = loginScreenMatch[0].indexOf('id="sandboxEntryBtn"');
    assert.ok(googleIdx > 0 && sandboxIdx > googleIdx, '#sandboxEntryBtn must be positioned below #googleSignIn');

    // Secondary (ghost) button style with neutral class
    assert.ok(loginScreenMatch[0].includes('class="action secondary sandbox-entry-btn"'));

    // Sized to content on desktop, min-height 44px, no wrapped text, full-width on phones
    assert.match(stylesCss, /\.sandbox-entry-btn\s*\{[\s\S]*?min-height:\s*44px/);
    assert.match(stylesCss, /\.sandbox-entry-btn\s*\{[\s\S]*?white-space:\s*nowrap/);
    assert.match(stylesCss, /@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\.sandbox-entry-btn\s*\{[\s\S]*?width:\s*100%\s*!important/);
  });

  test('2. Case-insensitive search for "demo" across all published files finds ONLY the button label', () => {
    const publishedFiles = [
      'index.html',
      'admin.html',
      'verify.html',
      'styles.css',
      'sw.js',
      'js/app.js',
      'js/admin.js',
      'js/cloud.js',
      'js/contest.js',
      'js/certificate.js',
      'js/progress.js',
      'js/curriculum.js',
      'js/schema.js',
      'js/sql-evaluator.js',
      'js/thinking.js',
      'js/util.js',
      'js/notifications.js'
    ];

    for (const relPath of publishedFiles) {
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check occurrences of demo (case-insensitive)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/demo/i.test(line)) {
          if (relPath === 'index.html') {
            assert.ok(
              line.includes('Go Demo Mode'),
              `Unexpected "demo" occurrence in ${relPath} line ${i + 1}: ${line.trim()}`
            );
          } else {
            assert.fail(`Unexpected "demo" occurrence in published file ${relPath} line ${i + 1}: ${line.trim()}`);
          }
        }
      }
    }
  });

  test('3. Airtight data isolation: sessionStorage with prefix sandbox: and zero localStorage / Supabase writes', () => {
    // sessionStorage prefix sandbox:
    assert.ok(appJs.includes("sessionStorage.getItem('sandbox:active')"));
    assert.ok(appJs.includes("sessionStorage.setItem('sandbox:active', 'true')"));
    assert.ok(appJs.includes("sessionStorage.getItem('sandbox:state')"));
    assert.ok(appJs.includes("sessionStorage.setItem('sandbox:state'"));
    assert.ok(appJs.includes("sessionStorage.removeItem('sandbox:active')"));
    assert.ok(appJs.includes("sessionStorage.removeItem('sandbox:state')"));

    // Cloud sync drain is hard no-op during sandbox session
    assert.ok(cloudJs.includes("sessionStorage.getItem('sandbox:active') === 'true'"));

    // Supabase client methods wrapped to no-op
    assert.ok(appJs.includes('wrapClientForSandbox'));
    assert.ok(appJs.includes('if (isSandboxSessionActive())'));

    // Record guest lifetime completions ignores sandbox
    assert.ok(appJs.includes('function recordGuestCompletedScenario(scenarioId) {\n  if (isSandboxSessionActive()) return;'));

    // persist() writes strictly to sandbox:state in sessionStorage, never touching storage (localStorage)
    assert.match(appJs, /function persist\([^)]*\)\s*\{[\s\S]*?if\s*\(isSandboxSessionActive\(\)\)\s*\{[\s\S]*?saveSandboxState\(state\);[\s\S]*?return;\s*\}/);

    // changeEntry() updates local state and saves to sandbox
    assert.match(appJs, /function changeEntry\([^)]*\)\s*\{[\s\S]*?if\s*\(isSandboxSessionActive\(\)\)\s*\{[\s\S]*?state\.entries\[current\.id\][\s\S]*?persist\(true,\s*immediateSync\);[\s\S]*?return;\s*\}/);
  });

  test('4. Challenge limit of 5 free challenges and restricted action handling', () => {
    // Challenge limit: at 5 challenges, restricted panel opens
    assert.ok(appJs.includes('if (isSandboxSessionActive()) {\n    const completedCount = getCompletedCount();\n    if (completedCount >= 5) {\n      openSandboxAuthModal();'));

    // Restricted panel exists in HTML
    assert.ok(indexHtml.includes('id="sandboxAuthRequiredModal"'));
    assert.ok(indexHtml.includes('id="sandboxAuthTitle"'));
    assert.ok(indexHtml.includes('Sign In to Continue'));
    assert.ok(indexHtml.includes('handleSandboxSignInClick()'));

    // Plain panel: NO demo wording, NO payment wording
    const modalMatch = indexHtml.match(/<div id="sandboxAuthRequiredModal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
    assert.ok(modalMatch, 'sandboxAuthRequiredModal must be found');
    assert.doesNotMatch(modalMatch[0], /demo/i, 'Restricted panel must contain NO demo wording');
    assert.doesNotMatch(modalMatch[0], /pay|payment|price|₹/i, 'Restricted panel must contain NO payment or pricing wording');

    // Restricted actions trigger openSandboxAuthModal
    // Paywall:
    assert.ok(appJs.includes('function openPaywallModal() {\n  if (isSandboxSessionActive()) {\n    openSandboxAuthModal();'));
    // Certificates:
    assert.ok(appJs.includes('function openCertificateModal(certData) {\n  if (isSandboxSessionActive()) {\n    openSandboxAuthModal();'));
    assert.ok(appJs.includes('async function openAllCertificatesModal() {\n  if (isSandboxSessionActive()) {\n    openSandboxAuthModal();'));
    // Profile:
    assert.ok(appJs.includes('function openProfileModal() {\n  closeProfileDropdown();\n  if (isSandboxSessionActive()) {\n    openSandboxAuthModal();'));
    // Admin:
    assert.ok(appJs.includes('function openAdminPortal() {\n  closeProfileDropdown();\n  if (isSandboxSessionActive()) {\n    openSandboxAuthModal();'));
  });

  test('5. Header controls swap to single "Sign in with Google" button and sign-in cleans up sandbox', () => {
    // Header buttons in HTML
    assert.ok(indexHtml.includes('id="sandboxHeaderSignInBtn"'));
    assert.ok(indexHtml.includes('id="practiceSandboxSignInBtn"'));

    // updateSandboxUI hides avatar/notifications and shows single Sign in with Google button
    assert.ok(appJs.includes('function updateSandboxUI()'));
    assert.ok(appJs.includes("headerBtn.style.display = 'inline-flex'"));

    // Clicking header button clears sandbox and starts Google sign-in
    assert.ok(appJs.includes('function handleSandboxSignInClick() {\n  closeSandboxAuthModal();\n  clearSandboxSession();'));

    // Signed-in user cleanly clears sandbox session
    assert.ok(appJs.includes('if (user) {\n    clearSandboxSession();\n    updateSandboxUI();'));

    // Signed-in user cannot start sandbox session
    assert.ok(appJs.includes('function startSandboxSession() {\n  if (user && user.id) {\n    closeLoginModal();\n    return;\n  }'));
  });

  test('6. Service worker cache version is bumped', () => {
    assert.ok(swJs.includes('crack-sql-v6-netlify'), 'Service worker cache must be bumped to crack-sql-v6-netlify');
  });
});
