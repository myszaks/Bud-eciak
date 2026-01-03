const CACHE_NAME = "budzet-static-v2";
const STATIC_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const reqUrl = new URL(event.request.url);

  // Do not cache API/auth requests; let network handle them
  if (reqUrl.pathname.startsWith("/api") || reqUrl.pathname.startsWith("/auth") || reqUrl.pathname.includes("/rpc/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Navigation requests: network-first (with fallback to cached index)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Do not cache JS assets to avoid stale chunk mismatches after deploy
  if (reqUrl.pathname.startsWith('/assets/') || reqUrl.pathname.endsWith('.js')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  // For other assets: cache-first, then network, and cache successful responses
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          try {
            if (response && response.status === 200 && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          } catch (e) {
            // ignore caching errors
          }
          return response;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
