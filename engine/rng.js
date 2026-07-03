/* ============================================================
   engine/rng.js — 种子 PRNG（§4.1）
   mulberry32：32 位状态，快、够随机、可序列化。
   零依赖 · 原生 ESM · Node 18+ 与浏览器共用。
   ============================================================ */

// mulberry32：给定 seed 返回一个可序列化的确定性 PRNG。
export function makeRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);           // [0, n)
  rng.range = (a, b) => a + Math.floor(rng() * (b - a));
  rng.pick = (arr) => arr[rng.int(arr.length)];
  rng.getState = () => s >>> 0;                      // 便于快照
  rng.setState = (v) => { s = v >>> 0; };
  return rng;
}

// 由字符串/日期派生种子（每日挑战用）：FNV-1a。
export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i); h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
