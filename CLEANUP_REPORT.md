# Crack SQL - Version 1 Repository Inventory & Cleanup Report

**Date:** 2026-10-30  
**Baseline Git Tag:** `pre-v1-cleanup`  
**Working Branch:** `v1-cleanup`  
**Restore Command:** `git checkout master` or `git checkout pre-v1-cleanup` or `git reset --hard pre-v1-cleanup`

---

## 1. Executive Summary & Policy

This report documents every file and folder in the Crack SQL repository, categorized into three distinct buckets with verifiable evidence:
- **Category A (Safe to delete):** Obsolete backups, generated artifacts, unused files, and removed demo mode assets with 0 runtime references.
- **Category B (Needs owner decision / Report only):** Secondary scenario files, large WebAssembly packages, internal development and test scripts, and migrations. Kept in repository; excluded from production publish.
- **Category C (Keep):** Core application runtime files, assets, configurations, and documentation.

---

## 2. Inventory & Classification Table

| File / Folder Path | Size | Category | Evidence & Proof |
| :--- | :--- | :---: | :--- |
| **`backup/`** | 551 KB | **A** | Obsolete UI backups from earlier development iterations. 0 runtime imports or references in modern applet. |
| ├── `backup/admin.before-glass.html` | 68,856 B | A | Superseded by `admin.html`. 0 references. |
| ├── `backup/index.before-glass.html` | 113,532 B | A | Superseded by `index.html`. 0 references. |
| ├── `backup/styles.before-2C.css` | 175,380 B | A | Superseded by `styles.css`. 0 references. |
| ├── `backup/styles.before-glass.css` | 177,985 B | A | Superseded by `styles.css`. 0 references. |
| ├── `backup/sw.before-glass.js` | 3,185 B | A | Superseded by `sw.js`. 0 references. |
| └── `backup/verify.before-glass.html` | 12,377 B | A | Superseded by `verify.html`. 0 references. |
| **`.aistudio/`** | ~2 MB | **A** | Internal AI Studio assistant scratchpad and task artifacts. Never published to production; added to `.gitignore`. |
| **`public/assets/aistudio/`** | 276 KB | **A** | Historical analysis document and mockups from early design phase. 0 references in any code or stylesheet. |
| ├── `public/assets/aistudio/.gitignore` | 2 B | A | Subdirectory ignore file; removed with directory. |
| ├── `public/assets/aistudio/d2d_crack_sql_analysis_...md` | 22,718 B | A | 0 references across all HTML, JS, CSS, JSON, and build scripts. |
| └── `public/assets/aistudio/image_8be70582.png` | 253,775 B | A | 0 references across all HTML, JS, CSS, JSON, and build scripts. |
| **`js/admin-demo-data.js`** | 21,380 B | **A** | Dedicated demo dataset for admin portal. Removed in Step 3 demo cleanup. |
| **`tests/demo-mode.test.js`** | 10,757 B | **A** | Dedicated test suite for demo mode. Removed in Step 3 demo cleanup. |
| **`tests/admin-demo.test.js`** | 8,367 B | **A** | Dedicated test suite for admin demo mode. Removed in Step 3 demo cleanup. |
| **`data/readme.txt`** | 5 B | **A** | Stub text file (`TODO`). 0 references. |
| **`js/readme.txt`** | 16 B | **A** | Stub text file (`Helper modules.`). 0 references. |
| **`bun.lock`** | 18,314 B | **A** | Unused package manager lockfile (project uses `pnpm` per `package.json`). |
| **`data/scenarios.json`** | 2,042,402 B | **B** | Fallback scenario catalog and test suite baseline. Kept in repo; excluded from default dist bundle. |
| **`data/scenarios-metadata.json`** | 385,532 B | **B** | Scenario metadata catalog referenced by `tests/scenario-conversation.test.js`. Kept in repo. |
| **`vendor/pglite/`** | 17.2 MB | **B** | In-browser PostgreSQL WASM runtime for learner query execution and result comparison. Kept and published. |
| **`js/sql-evaluator.js`** | 21,007 B | **B** | WebAssembly query executor and result evaluator. Kept and published. |
| **`supabase_setup.sql`** | 76,710 B | **B** | Monolithic local setup SQL. Kept in repo; excluded from publish. |
| **`js/build-scenarios.mjs`** | 67,931 B | **B** | Scenario build compiler script. Kept in repo; excluded from publish. |
| **`playwright.config.js`** | 626 B | **B** | Playwright test runner configuration. Kept in repo. |
| **`tests/*.spec.js`** | ~17 KB | **B** | Playwright integration specs. Kept in repo. |
| **`.github/workflows/*`** | ~2 KB | **B** | CI/CD automation. Modified to prevent publishing unpublished files. |
| **`migrations/`** | ~180 KB | **B** | Supabase database migrations (002 through 020). Kept untouched in repo; excluded from publish. |
| **`index.html`** | 116 KB | **C** | Main application frontend shell. |
| **`admin.html`** | 71.7 KB | **C** | Admin dashboard interface. |
| **`verify.html`** | 14.9 KB | **C** | Public certificate verification portal. |
| **`styles.css`** | 217 KB | **C** | Global design system and layout styling. |
| **`sw.js`** | 3.2 KB | **C** | Service worker for PWA offline caching. |
| **`manifest.json`** | 770 B | **C** | Web App Manifest for PWA installation. |
| **`metadata.json`** | 308 B | **C** | Applet platform metadata. |
| **`js/app.js`** | 326 KB | **C** | Main client application controller. |
| **`js/admin.js`** | 151 KB | **C** | Admin portal controller. |
| **`js/certificate.js`** | 30 KB | **C** | Dynamic SVG certificate generation and verification. |
| **`js/cloud.js`** | 6.2 KB | **C** | Cloud synchronization and RPC bridge. |
| **`js/contest.js`** | 66.8 KB | **C** | Contest management and leaderboard client. |
| **`js/contest-ai-evaluator.js`** | 9.4 KB | **C** | Contest AI thinking rubric evaluation client. |
| **`js/curriculum.js`** | 8.8 KB | **C** | Domain progression and curriculum manager. |
| **`js/notifications.js`** | 10.5 KB | **C** | In-app notification center. |
| **`js/progress.js`** | 9.6 KB | **C** | Learner progress calculation and sync. |
| **`js/schema.js`** | 50.3 KB | **C** | Domain database schemas, tables, and seed data. |
| **`js/thinking.js`** | 23.1 KB | **C** | Thinking Engine 2.0 evaluation and rubrics. |
| **`js/util.js`** | 3.3 KB | **C** | Common utilities and DOM helpers. |
| **`data/Crack_SQL_420_Simple.json`** | 616 KB | **C** | Canonical 420-scenario dataset loaded by `js/app.js`. |
| **`data/domains/*.json`** (7 files) | ~536 KB | **C** | Domain-specific curriculum scenario files. |
| **`data/domains/*.sql.json`** (7 files) | ~79 KB | **C** | Domain-specific reference SQL solutions. |
| **`d2d-logo.svg`** | 4.8 KB | **C** | Brand icon referenced in `admin.html`. |
| **`public/logo.png`** | 70.2 KB | **C** | High-resolution application brand logo. |
| **`apple-touch-icon.png`** | 55.6 KB | **C** | iOS PWA home screen icon. |
| **`favicon-64.png`** | 8.8 KB | **C** | High-DPI browser favicon. |
| **`favicon.ico`** | 4.3 KB | **C** | Standard browser favicon. |
| **`icon-192.png`** | 62.5 KB | **C** | Standard Android/PWA icon. |
| **`icon-512.png`** | 355 KB | **C** | High-resolution Android/PWA icon. |
| **`icon-maskable-512.png`** | 291 KB | **C** | Android adaptive maskable icon. |
| **`thinking-chime.mp3`** | 12.2 KB | **C** | Audio sound effect for successful thinking submissions. |
| **`package.json`** | 830 B | **C** | Node project configuration and scripts. |
| **`pnpm-lock.yaml`** | 22.5 KB | **C** | Pnpm dependency lockfile. |
| **`server.js`** | 16.5 KB | **C** | Local development and testing HTTP server. |
| **`copy-vendor.js`** | 2.8 KB | **C** | Build utility to populate vendor libraries. |
| **`deploy/baseline-counts.sql`** | 4.9 KB | **C** | Production database verification queries. |
| **`DEPLOY_CHECKLIST.md`** | 7.3 KB | **C** | Production rollout runbook. |
| **`README.md`** | 7.3 KB | **C** | Repository overview and migration safety notices. |
| **`.gitignore`** | 71 B | **C** | Git exclusion list. |
| **`.env.example`** | 32 B | **C** | Safe environment variable template. |

---

## 3. Analysis of Category B Items (Report Only)

### 3.1 Scenario Data Files (`scenarios.json` vs `Crack_SQL_420_Simple.json`)
- **Comparison:**
  - `data/Crack_SQL_420_Simple.json` contains exactly 420 scenarios.
  - `data/scenarios.json` contains exactly 420 scenarios, plus legacy aliases and domain assets.
  - Scenario IDs across both files are **100% identical in exact sequence** (420/420 match from `BAN_BEG_001` through `SEM_EXP_020`).
- **Canonical Source:**
  - `data/Crack_SQL_420_Simple.json` is the primary runtime file fetched by `js/app.js` (`fetch('./data/Crack_SQL_420_Simple.json')`).
  - `data/scenarios.json` acts as an automated fallback if simple loading encounters network interruption, and is heavily used in Node test suites.
  - `data/scenarios-metadata.json` is used exclusively by `tests/scenario-conversation.test.js`.
- **Recommendation:** Keep all three in the repository. Saved user progress in Supabase depends on scenario IDs remaining completely stable.

### 3.2 In-Browser SQL Execution (`vendor/pglite` & `js/sql-evaluator.js`)
- **Required Features:**
  - Learner SQL execution ("Check / Run SQL" in Practice).
  - Schema creation and seed insertion into an ephemeral in-memory PostgreSQL instance.
  - Execution result comparison against the scenario reference query.
  - Read-only query validation and DB Fiddle package generator.
- **Loading Architecture:**
  - Dynamically imported on demand via `await import('../vendor/pglite/index.js')`. Does not block the initial page load or login flow.
- **Impact if Removed:**
  - Learners would lose the ability to test their SQL queries live in the browser.
- **Recommendation:** Retain in repository and publish in `dist/vendor/pglite/`.

### 3.3 Duplicate `017` Migration Files
- **Status:**
  - `migrations/017_thinking_engine_2_0_global_reset.sql` (one-time destructive reset; prominent warning added).
  - `migrations/017_thinking_logic_2_merge_and_reset.sql` (additive merge logic).
- **Rule:** Per instructions, migration files are neither renamed nor renumbered. Neither is executed during this release.

---

## 4. Deletion & Verification Log

Each subcategory of Category A is executed as an isolated commit:
1. `backup/` directory deletion
2. `.aistudio/` and `public/assets/aistudio/` deletion (and `.gitignore` update)
3. Demo mode removal across HTML, JS, and CSS
4. Dead CSS class removal
5. Unused lockfiles and stub files removal
