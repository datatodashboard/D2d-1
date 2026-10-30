import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

// Clear existing dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 1. Top-level runtime files
const topLevelFiles = [
  'index.html',
  'admin.html',
  'verify.html',
  'styles.css',
  'sw.js',
  'manifest.json',
  'd2d-logo.svg',
  'apple-touch-icon.png',
  'favicon-64.png',
  'favicon.ico',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'thinking-chime.mp3'
];

// 2. Public assets directory
const publicFiles = [
  'public/logo.png'
];

// 3. Browser runtime JS modules (excludes Node-only build-scenarios.mjs)
const jsRuntimeFiles = [
  'js/admin.js',
  'js/app.js',
  'js/certificate.js',
  'js/cloud.js',
  'js/contest-ai-evaluator.js',
  'js/contest.js',
  'js/curriculum.js',
  'js/notifications.js',
  'js/progress.js',
  'js/schema.js',
  'js/sql-evaluator.js',
  'js/thinking.js',
  'js/util.js'
];

// 4. Scenario data files loaded by the app at runtime (excludes test-only scenarios-metadata.json)
const domainSlugs = [
  'banking',
  'capital-markets',
  'education',
  'healthcare',
  'insurance',
  'retail',
  'semiconductor'
];

const dataRuntimeFiles = [
  'data/Crack_SQL_420_Simple.json',
  'data/scenarios.json',
  ...domainSlugs.flatMap(slug => [
    `data/domains/${slug}.json`,
    `data/domains/${slug}.sql.json`
  ])
];

function copyFileChecked(relPath) {
  const srcPath = path.join(__dirname, relPath);
  const destPath = path.join(distDir, relPath);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`[Build] Required runtime file missing: ${relPath}`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

for (const rel of [
  ...topLevelFiles,
  ...publicFiles,
  ...jsRuntimeFiles,
  ...dataRuntimeFiles
]) {
  copyFileChecked(rel);
}

// 5. Vendor PGlite runtime files
const vendorSrcDir = path.join(__dirname, 'vendor', 'pglite');
if (!fs.existsSync(vendorSrcDir)) {
  throw new Error('[Build] Required directory missing: vendor/pglite');
}
for (const entry of fs.readdirSync(vendorSrcDir, { withFileTypes: true })) {
  if (entry.isFile()) {
    copyFileChecked(path.posix.join('vendor/pglite', entry.name));
  }
}

console.log('Build completed successfully. Dist directory populated at dist/.');
