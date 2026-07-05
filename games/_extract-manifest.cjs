/* ============================================================
   games/_extract-manifest.cjs — 元数据生成器
   扫描 games/*.js，提取每个游戏的 meta 对象，输出 games/manifest.js。
   仅处理文件系统，不执行游戏逻辑；meta 内不支持运行时表达式。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gamesDir = path.join(root, 'games');

function extractMeta(src) {
  // 定位 "meta:" 后第一个 "{"，然后花括号匹配到闭合。
  const idx = src.indexOf('meta:');
  if (idx < 0) return null;
  let start = src.indexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) {
      const block = src.slice(start, i + 1);
      try { return eval('(' + block + ')'); } catch (e) { return null; }
    }}
  }
  return null;
}

const entries = [];
for (const f of fs.readdirSync(gamesDir).sort()) {
  if (!f.endsWith('.js') || f.startsWith('_') || f === 'manifest.js') continue;
  const src = fs.readFileSync(path.join(gamesDir, f), 'utf8');
  const meta = extractMeta(src);
  if (!meta) { console.warn('skip', f, '(no meta)'); continue; }
  entries.push({
    id: meta.id,
    name: meta.name,
    desc: meta.desc,
    icon: meta.icon,
    cat: meta.cat,
    controls: meta.controls,
    ...(meta.width ? { width: meta.width } : {}),
    ...(meta.height ? { height: meta.height } : {}),
  });
}

console.log('Extracted', entries.length, 'entries');

const body = entries.map((e) => '  ' + JSON.stringify(e) + ',').join('\n');
const out = `/* ============================================================
   games/manifest.js — 游戏元数据注册表（§8.1）
   自 games/*.js 扫描提取的全量元数据（${entries.length} 条），
   仅含 id/name/desc/icon/cat/controls 及可选 width/height，不含逻辑，首屏加载。
   本文件由 games/_extract-manifest.cjs 生成，请勿手改。
   ============================================================ */

export const MANIFEST = [
${body}
];

export function findById(id) {
  return MANIFEST.find((m) => m.id === id) || null;
}
`;

fs.writeFileSync(path.join(gamesDir, 'manifest.js'), out, 'utf8');
console.log('Wrote games/manifest.js');
