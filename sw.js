const CACHE = 'crack-sql-v2-cssfix';
const ROOT = new URL('./', self.location).href;
const SHELL = [
  'index.html',
  'styles.css',
  'manifest.json',
  'favicon.ico',
  'public/logo.png'
].map(p => new URL(p, ROOT).href);

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('crack-sql-') && k !== CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept non-GET, cross-origin, API, or health-check requests
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/health' ||
    url.pathname === '/healthz' ||
    url.pathname === '/_health'
  ) {
    return;
  }

  const isNavigation = req.mode === 'navigate';
  const isVendorAsset = url.pathname.startsWith('/vendor/pglite/');
  const isStaticMedia = /\.(png|jpe?g|svg|ico|webp|mp3|woff2?)$/i.test(url.pathname);
  const isCodeOrData = !isVendorAsset && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.html')
  );

  if (!isNavigation && !isVendorAsset && !isStaticMedia && !isCodeOrData && !SHELL.includes(url.href)) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    if (isNavigation) {
      const targetShell = url.pathname.startsWith('/admin')
        ? new URL('admin.html', ROOT).href
        : new URL('index.html', ROOT).href;
      try {
        const netResp = await fetch(req);
        if (netResp && netResp.ok) {
          cache.put(targetShell, netResp.clone());
        }
        return netResp;
      } catch (e) {
        const cached = (await cache.match(targetShell)) || (await cache.match(new URL('index.html', ROOT).href));
        if (cached) return cached;
        return new Response('Offline — please reconnect and reload.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }

    // Network-first for application code and scenario catalog JSON so updates are never stale
    if (isCodeOrData) {
      try {
        const netResp = await fetch(req);
        if (netResp && netResp.ok) {
          cache.put(req, netResp.clone());
        }
        return netResp;
      } catch (e) {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        throw e;
      }
    }

    // On-demand cache-first for PGlite SQL engine binaries/chunks and static media/icons
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    const netResp = await fetch(req);
    if (netResp && netResp.ok) {
      cache.put(req, netResp.clone());
    }
    return netResp;
  })());
});
