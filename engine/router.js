/* ============================================================
   engine/router.js — 纯函数 hash 路由解析
   零依赖 · 原生 ESM · Node 18+ 与浏览器共用。
   ============================================================ */

/**
 * 解析 location.hash 风格的路由。
 * 只认 `/#/` 开头的路径；其他 hash（如 #view-library）视为 library。
 *
 * 返回：
 *   { type: 'library' }                         — 回主页
 *   { type: 'route', path, search, params }     — path 不含前导斜杠，params 是 URLSearchParams
 */
export function parseHash(hash) {
  if (!hash || hash === '#' || !hash.startsWith('#/')) {
    return { type: 'library' };
  }
  const rest = hash.slice(2); // 去掉 '#/'
  if (!rest) return { type: 'library' };
  const qidx = rest.indexOf('?');
  const path = qidx === -1 ? rest : rest.slice(0, qidx);
  const search = qidx === -1 ? '' : rest.slice(qidx + 1);
  return {
    type: 'route',
    path,
    search,
    params: new URLSearchParams(search)
  };
}

/** 生成游戏深链。 */
export function gameUrl(id) {
  return '#/' + id;
}

/** 生成每日挑战深链。 */
export function dailyUrl() {
  return '#/daily';
}

/** 生成回放深链（C2 使用）。 */
export function replayUrl(game, seed, framesEncoded) {
  const params = new URLSearchParams({ g: game, s: String(seed) });
  if (framesEncoded) params.set('frames', framesEncoded);
  return '#/replay?' + params.toString();
}
