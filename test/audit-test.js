// TINYCADE - 新架构游戏模块审计
// 检查每个 games/*.js 能 import、含 create、create 返回所需契约字段。

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

const root = path.join(__dirname, '..');
const gamesDir = path.join(root, 'games');

// 轻量 rng stub：只提供游戏 audit 所需接口
function makeStubRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.range = (a, b) => a + rng.int(b - a);
  rng.pick = (arr) => arr[rng.int(arr.length)];
  return rng;
}

async function main() {
  const files = fs.readdirSync(gamesDir)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'manifest.js')
    .sort();

  let createErrors = 0, contractErrors = 0;
  const errorIds = [];

  for (const f of files) {
    const id = path.basename(f, '.js');
    const filePath = path.join(gamesDir, f);
    let mod;
    try {
      mod = await import(pathToFileURL(filePath).href);
    } catch (e) {
      createErrors++;
      if (errorIds.length < 5) errorIds.push(id + ' import: ' + e.message);
      continue;
    }
    const def = mod.default || mod;
    if (typeof def.create !== 'function' || typeof def.meta !== 'object' || typeof def.tickHz !== 'number') {
      contractErrors++;
      if (errorIds.length < 5) errorIds.push(id + ': missing create/meta/tickHz');
      continue;
    }
    try {
      const inst = def.create(makeStubRng(12345), { width: 400, height: 400, emit() {} });
      if (!inst || typeof inst.update !== 'function' || typeof inst.render !== 'function' ||
          typeof inst.serialize !== 'function' || !Array.isArray(inst.events)) {
        contractErrors++;
        if (errorIds.length < 5) errorIds.push(id + ': create return lacks update/render/serialize/events');
      }
    } catch (e) {
      createErrors++;
      if (errorIds.length < 5) errorIds.push(id + ' create: ' + e.message);
    }
  }

  console.log('games audited: ' + files.length);
  console.log('create errors: ' + createErrors);
  console.log('contract errors: ' + contractErrors);
  if (errorIds.length) console.log('  ' + errorIds.join('\n  '));

  ok('all games imported', createErrors === 0, createErrors + ' import failures');
  ok('all games satisfy contract', contractErrors === 0, contractErrors + ' contract failures');

  console.log('\nAudit: ' + passed + ' pass / ' + failed + ' fail');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('Audit crash:', e); process.exit(1); });
