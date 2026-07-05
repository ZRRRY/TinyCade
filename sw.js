/* TINYCADE Service Worker
 * 在首次安装时预缓存主资源，以便离线使用。
 * 资源带内容哈希，新版本会自动使旧缓存失效（cache name 含版本号）。
 *
 * 修复记录（2026-07-04）：
 *  - SW_VERSION 强制 bump：使旧 cache 立即失效并被 activate 清掉。
 *  - install 用 {cache:'no-store'} 显式 fetch，绕开 SW 自己的 fetch handler，
 *    防止「cache.addAll → SW.fetch → caches.match → 命中旧版 → 旧版入缓存」的循环 bug。
 */
const SW_VERSION = '2026-07-04a';  // 改这里就能让所有用户 SW 重新安装并清旧缓存
const VERSION = (self.TINYCADE_VERSION || '1.0.0') + '-' + (self.TINYCADE_BUILD || '');
const CACHE_NAME = 'tinycade-' + SW_VERSION + '-' + VERSION;
// PRECACHE：阶段 2+ 起把入口 + 引擎 + manifest 加入预缓存，确保首次安装即可离线启动。
// 其余游戏模块走运行时 fetch 后写入缓存（fetch handler 已支持）。
const PRECACHE = [
  './',
  './app.js',
  './sounds.js',
  './version.js',
  './style.css',
  './engine/engine.js',
  './engine/input.js',
  './engine/recorder.js',
  './engine/rng.js',
  './games/manifest.js',
  './games/snake.js',
  './manifest.webmanifest'
];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 显式 no-store fetch，绕过 SW 自己的 fetch handler，避免循环命中旧版
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const fresh = await fetch(url, { cache: 'no-store' });
        if (fresh && fresh.ok) await cache.put(url, fresh);
      } catch (e) { /* 单个失败不影响整体 */ }
    }));
  })());
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
  if (url.origin !== self.location.origin) return; // 同源策略
  // API 与动态端点(/api/*, /healthz, /metrics) 不进运行时缓存,避免返回陈旧或敏感数据。
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz' || url.pathname === '/metrics') return;
  // 只缓存静态资源:扩展名命中可缓存列表(JS/CSS/HTML/JSON/manifest/woff2/svg/ico/png/jpg/gif/webp/wasm/map)。
  // 避免缓存带 query 的动态 URL(如 ?record=1, ?token=xxx)。
  const CACHEABLE_EXT = /\.(?:js|css|html|json|webmanifest|svg|ico|png|jpe?g|gif|webp|wasm|map|woff2?|ttf|otf)$/i;
  const isCacheable = CACHEABLE_EXT.test(url.pathname);
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // 只缓存:成功 + 同源 + 静态资源 + 无 query 参数的 GET 响应
        if (res && res.status === 200 && res.type === 'basic' && isCacheable && url.search === '') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});
