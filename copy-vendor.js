import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'node_modules', '@electric-sql', 'pglite', 'dist');
const destDir = path.join(__dirname, 'vendor', 'pglite');

/**
 * Traces the exact runtime files needed by vendor/pglite/index.js
 * (index.js, imported chunk-*.js files, pglite.wasm, initdb.wasm, pglite.data)
 * and excludes .map, .d.ts, .d.cts, .cjs, and unused extension .tar.gz archives.
 */
function resolveRequiredRuntimeFiles(baseDir) {
  const required = new Set(['index.js', 'pglite.wasm', 'initdb.wasm', 'pglite.data']);
  const queue = ['index.js'];

  while (queue.length > 0) {
    const rel = queue.shift();
    const full = path.join(baseDir, rel);
    if (!fs.existsSync(full) || !rel.endsWith('.js')) continue;

    const content = fs.readFileSync(full, 'utf8');
    const matches = [
      ...content.matchAll(/(?:from|import)\s*['"](\.\/[^'"]+)['"]|new URL\(['"](\.\/[^'"]+)['"]/g)
    ];
    for (const m of matches) {
      const target = (m[1] || m[2]).replace(/^\.\//, '');
      if (
        !target.endsWith('.map') &&
        !target.endsWith('.d.ts') &&
        !target.endsWith('.d.cts') &&
        !target.endsWith('.cjs') &&
        !target.endsWith('.tar.gz') &&
        !required.has(target)
      ) {
        required.add(target);
        queue.push(target);
      }
    }
  }

  return required;
}

function pruneDirectory(dir, allowedFiles) {
  if (!fs.existsSync(dir)) return 0;
  let removedCount = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      removedCount++;
    } else if (!allowedFiles.has(entry.name)) {
      fs.unlinkSync(fullPath);
      removedCount++;
    }
  }
  return removedCount;
}

const traceRoot = fs.existsSync(path.join(srcDir, 'index.js')) ? srcDir : destDir;
if (fs.existsSync(traceRoot)) {
  const requiredFiles = resolveRequiredRuntimeFiles(traceRoot);
  fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(srcDir)) {
    for (const relFile of requiredFiles) {
      const srcFile = path.join(srcDir, relFile);
      const destFile = path.join(destDir, relFile);
      if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  const pruned = pruneDirectory(destDir, requiredFiles);
  console.log(`Vendor PGlite ready at ${destDir} (${requiredFiles.size} runtime files kept, ${pruned} unused artifacts pruned).`);
} else {
  console.warn(` Neither ${srcDir} nor ${destDir} found.`);
}

process.exit(0);
