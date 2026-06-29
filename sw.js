/* TINYCADE Service Worker
 * \u5728\u9996\u6b21\u5b89\u88c5\u65f6\u9884\u7f13\u5b58\u4e3b\u8d44\u6e90\uff0c\u4ee5\u4fbf\u79bb\u7ebf\u4f7f\u7528\u3002
 * \u8d44\u6e90\u5e26\u5185\u5bb9\u54c8\u5e0c\uff0c\u65b0\u7248\u672c\u4f1a\u81ea\u52a8\u4f7f\u65e7\u7f13\u5b58\u5931\u6548\uff08cache name \u542b\u7248\u672c\u53f7\uff09\u3002
 */

const VERSION = (self.TINYCADE_VERSION || '1.0.0') + '-' + (self.TINYCADE_BUILD || '');
const CACHE_NAME = 'tinycade-' + VERSION;
const PRECACHE = [
  './',
  './manifest.webmanifest'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // \u540c\u6e90\u7b56\u7565
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // \u53ea\u7f13\u5b58\u6210\u529f\u54cd\u5e94\u4e14\u4e3a GET
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});
