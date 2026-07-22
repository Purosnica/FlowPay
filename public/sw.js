/* FlowPay PWA service worker — shell offline Mi día / bandeja (I036). */
const CACHE_NAME = 'flowpay-shell-v2';
const SHELL_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/images/logo/logo-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // No fallar el install si una URL de app requiere auth.
        await Promise.allSettled(
          SHELL_URLS.map((url) =>
            fetch(url).then((res) => {
              if (res.ok) {
                return cache.put(url, res);
              }
              return undefined;
            }),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // API / GraphQL: network-only (cola offline se implementa en app).
  if (url.pathname.startsWith('/api/') || url.pathname.includes('graphql')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => cached || caches.match('/offline.html'));

      return cached || network;
    }),
  );
});
