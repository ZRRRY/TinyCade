/* Temp extractor: loads games.js + games-extra.js in a stubbed Node
   context, reads Games.list(), and emits games/manifest.js.
   This is the ONLY file allowed to use require/CJS (per task spec). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gamesJs = fs.readFileSync(path.join(root, 'games.js'), 'utf8');
const extraJs = fs.readFileSync(path.join(root, 'games-extra.js'), 'utf8');

// Minimal browser stubs — factories are NOT executed at define() time,
// so these only need to exist, not behave.
const noop = () => {};
const sandbox = {
  console,
  window: {
    devicePixelRatio: 1,
    addEventListener: noop,
    removeEventListener: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
  },
  document: { hidden: false, createElement: () => ({ getContext: () => ({}), style: {}, addEventListener: noop, removeEventListener: noop }) },
  localStorage: { getItem: () => null, setItem: noop },
  Sounds: new Proxy({}, { get: () => new Proxy({}, { get: () => noop }) }),
  requestAnimationFrame: noop,
  cancelAnimationFrame: noop,
  performance: { now: () => 0 },
};
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
// const Games = (...)  — lexical const won't attach to global, so append an
// assignment inside the same script so we can read it back out.
const code = gamesJs + '\n' + extraJs + '\n;globalThis.__GAMES__ = Games;';
vm.runInContext(code, ctx, { filename: 'games-bundle.js' });

const list = sandbox.__GAMES__.list();
const entries = list.map((g) => ({
  id: g.id,
  name: g.name,
  desc: g.desc,
  icon: g.icon,
  cat: g.cat,
  controls: g.controls,
}));

console.log('Extracted', entries.length, 'entries');

// Pretty-print as ESM module.
const body = entries.map((e) => '  ' + JSON.stringify(e) + ',').join('\n');
const out = `/* ============================================================
   games/manifest.js — 游戏元数据注册表（§8.1）
   自 games.js + games-extra.js 抽取的全量元数据（${entries.length} 条），
   仅含 id/name/desc/icon/cat/controls，不含逻辑，首屏加载。
   本文件由 games/_extract-manifest.cjs 生成，请勿手改。
   ============================================================ */

export const MANIFEST = [
${body}
];

export function findById(id) {
  return MANIFEST.find((m) => m.id === id) || null;
}
`;

fs.writeFileSync(path.join(root, 'games', 'manifest.js'), out, 'utf8');
console.log('Wrote games/manifest.js');
