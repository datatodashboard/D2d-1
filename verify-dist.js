import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream'
};

const DOMAIN_SLUGS = [
  'banking',
  'capital-markets',
  'education',
  'healthcare',
  'insurance',
  'retail',
  'semiconductor'
];

const FORBIDDEN_DIST_ENTRIES = [
  'migrations',
  'supabase',
  'tests',
  'backup',
  '.aistudio',
  '.github',
  '.env',
  '.env.local',
  '.env.production',
  '.env.example',
  'server.js',
  'deploy',
  'scripts',
  'screenshots',
  'metadata.json',
  'js/build-scenarios.mjs',
  'data/scenarios-metadata.json'
];

export function createDistStaticServer(rootDir = distDir) {
  return http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(reqUrl.pathname);

    // Explicit rule for / -> /index.html (no catch-all rewrite)
    if (pathname === '/') {
      pathname = '/index.html';
    }

    const safeRel = pathname.replace(/^\/+/, '');
    const resolved = path.resolve(rootDir, safeRel);
    if (!resolved.startsWith(path.resolve(rootDir) + path.sep) && resolved !== path.resolve(rootDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
    fs.createReadStream(resolved).pipe(res);
  });
}

function isExternalOrNonFileUrl(raw) {
  if (!raw) return true;
  const trimmed = raw.trim();
  return (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  );
}

function resolveLocalUrlToPathname(rawRef, baseUrlPath) {
  const base = new URL(baseUrlPath, 'http://127.0.0.1');
  const resolved = new URL(rawRef, base);
  return resolved.pathname;
}

function collectReferencedUrls(rootDir) {
  const checks = [];

  // 1. Always verify launch and top-level HTML entry points
  for (const entryUrl of ['/', '/index.html', '/admin.html', '/verify.html']) {
    checks.push({ source: 'launch-entry', raw: entryUrl, urlPath: entryUrl });
  }

  // 2. HTML files: index.html, admin.html, verify.html
  for (const htmlName of ['index.html', 'admin.html', 'verify.html']) {
    const htmlPath = path.join(rootDir, htmlName);
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`[Verify] Missing HTML file in publish directory: ${htmlName}`);
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    // Strip <script> bodies before scanning HTML attributes so JS template strings aren't mistaken for HTML attributes
    const htmlTagsOnly = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const attrMatches = [...htmlTagsOnly.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)];
    for (const m of attrMatches) {
      const raw = m[1].trim();
      if (isExternalOrNonFileUrl(raw)) continue;
      checks.push({
        source: htmlName,
        raw,
        urlPath: resolveLocalUrlToPathname(raw, `/${htmlName}`)
      });
    }
  }

  // 3. manifest.json: start_url, scope, id, icons
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('[Verify] Missing manifest.json in publish directory');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const field of ['start_url', 'scope', 'id']) {
    if (manifest[field] && !isExternalOrNonFileUrl(manifest[field])) {
      checks.push({
        source: `manifest.json (${field})`,
        raw: manifest[field],
        urlPath: resolveLocalUrlToPathname(manifest[field], '/manifest.json')
      });
    }
  }
  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (icon?.src && !isExternalOrNonFileUrl(icon.src)) {
        checks.push({
          source: 'manifest.json (icons)',
          raw: icon.src,
          urlPath: resolveLocalUrlToPathname(icon.src, '/manifest.json')
        });
      }
    }
  }

  // 4. sw.js: SHELL cache list & navigation fallback shells
  const swPath = path.join(rootDir, 'sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('[Verify] Missing sw.js in publish directory');
  }
  const swContent = fs.readFileSync(swPath, 'utf8');
  const shellBlockMatch = swContent.match(/const\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
  if (!shellBlockMatch) {
    throw new Error('[Verify] Could not locate SHELL array in sw.js');
  }
  const shellItems = [...shellBlockMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const item of shellItems) {
    checks.push({
      source: 'sw.js (SHELL)',
      raw: item,
      urlPath: resolveLocalUrlToPathname(item, '/sw.js')
    });
  }
  const swNewUrls = [...swContent.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*ROOT\s*\)/g)].map(m => m[1]);
  for (const item of swNewUrls) {
    checks.push({
      source: 'sw.js (navigation shell)',
      raw: item,
      urlPath: resolveLocalUrlToPathname(item, '/sw.js')
    });
  }

  // 5. JS files in dist/js/
  function scanJsDir(subDir) {
    const absDir = path.join(rootDir, subDir);
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const relFile = path.posix.join(subDir, entry.name);
      if (entry.isDirectory()) {
        scanJsDir(relFile);
        continue;
      }
      if (!entry.name.endsWith('.js') && !entry.name.endsWith('.mjs')) continue;
      const code = fs.readFileSync(path.join(rootDir, relFile), 'utf8');
      const baseForModule = `/${relFile}`;
      // Note: fetch() and new Audio() in browser run relative to the document (/index.html or /admin.html)
      const baseForDocument = '/index.html';

      // Static and dynamic imports: import ... from './...' or import('./...')
      const importMatches = [
        ...code.matchAll(/\bimport\s+[\s\S]*?\bfrom\s*['"](\.{1,2}\/[^'"]+|\/[^'"]+)['"]/g),
        ...code.matchAll(/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+|\/[^'"]+)['"]\s*\)/g)
      ];
      for (const m of importMatches) {
        const raw = m[1].trim();
        if (isExternalOrNonFileUrl(raw)) continue;
        checks.push({
          source: `${relFile} (import)`,
          raw,
          urlPath: resolveLocalUrlToPathname(raw, baseForModule)
        });
      }

      // new URL('...', import.meta.url) or new URL('...', loc.href)
      const urlMatches = [
        ...code.matchAll(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*(import\.meta\.url|loc\.href|self\.location|window\.location\.href)/g)
      ];
      for (const m of urlMatches) {
        const raw = m[1].trim();
        const baseKind = m[2];
        if (isExternalOrNonFileUrl(raw) || raw === './') continue;
        const base = baseKind === 'import.meta.url' ? baseForModule : baseForDocument;
        checks.push({
          source: `${relFile} (new URL)`,
          raw,
          urlPath: resolveLocalUrlToPathname(raw, base)
        });
      }

      // new Audio('...')
      const audioMatches = [...code.matchAll(/new\s+Audio\(\s*['"]([^'"]+)['"]\s*\)/g)];
      for (const m of audioMatches) {
        const raw = m[1].trim();
        if (isExternalOrNonFileUrl(raw)) continue;
        checks.push({
          source: `${relFile} (new Audio)`,
          raw,
          urlPath: resolveLocalUrlToPathname(raw, baseForDocument)
        });
      }

      // String literal fetch('...')
      const fetchLiteralMatches = [...code.matchAll(/\bfetch\(\s*['"]([^'"]+)['"]/g)];
      for (const m of fetchLiteralMatches) {
        const raw = m[1].trim();
        if (isExternalOrNonFileUrl(raw)) continue;
        // Skip optional server-only POST endpoints (/api/*) that are not static files
        if (raw.startsWith('/api/')) continue;
        checks.push({
          source: `${relFile} (fetch)`,
          raw,
          urlPath: resolveLocalUrlToPathname(raw, baseForDocument)
        });
      }

      // Template literal fetch(`...${slug}...`)
      const fetchTemplateMatches = [...code.matchAll(/\bfetch\(\s*`([^`]+)`/g)];
      for (const m of fetchTemplateMatches) {
        const rawTemplate = m[1].trim();
        if (isExternalOrNonFileUrl(rawTemplate) || rawTemplate.startsWith('/api/')) continue;
        if (rawTemplate.includes('${slug}')) {
          for (const slug of DOMAIN_SLUGS) {
            const expanded = rawTemplate.replace(/\$\{slug\}/g, slug);
            checks.push({
              source: `${relFile} (fetch template)`,
              raw: expanded,
              urlPath: resolveLocalUrlToPathname(expanded, baseForDocument)
            });
          }
        }
      }
    }
  }

  scanJsDir('js');

  // 6. Verify PGlite browser runtime entry & chunks/WASM/data in dist/vendor/pglite/
  const pgliteIndex = path.join(rootDir, 'vendor/pglite/index.js');
  if (fs.existsSync(pgliteIndex)) {
    const pgCode = fs.readFileSync(pgliteIndex, 'utf8');
    const chunkImports = [
      ...pgCode.matchAll(/\bfrom\s*['"](\.\/chunk-[^'"]+\.js)['"]/g),
      ...pgCode.matchAll(/new\s+URL\(\s*['"](\.\/[^'"]+\.(?:wasm|data))['"]\s*,\s*import\.meta\.url\s*\)/g)
    ];
    for (const m of chunkImports) {
      const raw = m[1].trim();
      checks.push({
        source: 'vendor/pglite/index.js',
        raw,
        urlPath: resolveLocalUrlToPathname(raw, '/vendor/pglite/index.js')
      });
    }
  }

  return checks;
}

export async function verifyPublishedDist(rootDir = distDir) {
  if (!fs.existsSync(rootDir)) {
    throw new Error(`[Verify] Publish directory does not exist: ${rootDir}`);
  }
  if (!fs.existsSync(path.join(rootDir, 'index.html'))) {
    throw new Error('[Verify] index.html is missing at the top level of dist/');
  }

  // Verify no forbidden files or directories were published into dist/
  for (const forbidden of FORBIDDEN_DIST_ENTRIES) {
    const target = path.join(rootDir, forbidden);
    if (fs.existsSync(target)) {
      throw new Error(`[Verify] Forbidden file or directory found in dist/: ${forbidden}`);
    }
  }

  const checks = collectReferencedUrls(rootDir);
  const server = createDistStaticServer(rootDir);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  const baseOrigin = `http://127.0.0.1:${port}`;
  const failures = [];
  const verifiedUnique = new Map();

  try {
    for (const item of checks) {
      const targetUrl = `${baseOrigin}${item.urlPath}`;
      const res = await fetch(targetUrl);
      await res.arrayBuffer();
      if (res.status !== 200) {
        failures.push(`${item.urlPath} (referenced by ${item.source} as "${item.raw}") -> HTTP ${res.status}`);
      } else {
        verifiedUnique.set(item.urlPath, item.source);
      }
    }

    // Confirm no catch-all rewrite masks missing pages
    const missingCheck = await fetch(`${baseOrigin}/__nonexistent_page_check__.html`);
    await missingCheck.arrayBuffer();
    if (missingCheck.status !== 404) {
      failures.push(`/__nonexistent_page_check__.html expected HTTP 404 (no catch-all rewrite), got HTTP ${missingCheck.status}`);
    }
  } finally {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise(resolve => server.close(resolve));
  }

  if (failures.length > 0) {
    throw new Error(`[Verify] Publish directory verification failed:\n  - ${failures.join('\n  - ')}`);
  }

  return {
    verifiedCount: verifiedUnique.size,
    totalChecks: checks.length,
    verifiedPaths: [...verifiedUnique.keys()].sort()
  };
}

// Run when invoked directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  verifyPublishedDist()
    .then(result => {
      console.log(
        `Publish directory verification passed: ${result.verifiedCount} unique local URLs (${result.totalChecks} total references) resolved with HTTP 200.`
      );
    })
    .catch(err => {
      console.error(err.message || err);
      process.exit(1);
    });
}
