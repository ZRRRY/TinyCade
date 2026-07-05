// TINYCADE 新架构 DOM/模块 smoke
// 验证 games/manifest.js 元数据，并抽查若干游戏模块可加载、含 create 契约。

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`); }
}

const root = path.join(__dirname, '..');

async function main() {
  // 1. 读取 manifest
  const manifestPath = path.join(root, 'games', 'manifest.js');
  ok('manifest.js exists', fs.existsSync(manifestPath));
  if (!fs.existsSync(manifestPath)) {
    console.log('\nJS smoke: ' + passed + ' pass / ' + failed + ' fail');
    process.exit(1);
  }

  // 2. 动态 import manifest（Node 18+ 原生 ESM）
  const mod = await import(pathToFileURL(manifestPath).href);
  const MANIFEST = mod.MANIFEST;
  const findById = mod.findById;
  ok('MANIFEST exported', Array.isArray(MANIFEST));
  ok('findById exported', typeof findById === 'function');
  ok('game count >= 100', MANIFEST.length >= 100, 'actual=' + MANIFEST.length);

  // 3. 元数据结构检查
  let schemaFail = [];
  for (const g of MANIFEST) {
    if (typeof g.id !== 'string' || typeof g.name !== 'string' || typeof g.desc !== 'string' ||
        typeof g.icon !== 'string' || typeof g.cat !== 'string' || typeof g.controls !== 'string') {
      schemaFail.push(g.id || '(no id)');
    }
  }
  ok('every game has required meta', schemaFail.length === 0, 'fail=' + schemaFail.join(','));
  ok('findById(snake) works', findById('snake')?.id === 'snake');

  // 4. 抽查若干游戏模块可 import 并含 create
  const sample = ['snake', 'tetris', 'flappy', 'minesweeper', 'g2048', 'pong', 'gomoku', 'dino', 'fruitninja', 'sudoku', 'memory', 'reaction', 'reversi'];
  let loaded = 0, loadFail = [];
  for (const id of sample) {
    const file = path.join(root, 'games', `${id}.js`);
    if (!fs.existsSync(file)) { loadFail.push(id + ':missing'); continue; }
    try {
      const gmod = await import(pathToFileURL(file).href);
      const def = gmod.default || gmod;
      if (typeof def.create !== 'function') { loadFail.push(id + ':no create'); continue; }
      if (typeof def.meta !== 'object') { loadFail.push(id + ':no meta'); continue; }
      if (typeof def.tickHz !== 'number') { loadFail.push(id + ':no tickHz'); continue; }
      loaded++;
    } catch (e) {
      loadFail.push(id + ':' + e.message);
    }
  }
  ok('sample modules loaded', loaded === sample.length, 'loaded=' + loaded + ' of ' + sample.length);
  ok('no module errors', loadFail.length === 0, loadFail.join(';'));

  // 5. 验证一个游戏可 create（无头，不依赖 DOM）
  try {
    const snakeMod = await import(pathToFileURL(path.join(root, 'games', 'snake.js')).href);
    const snake = (snakeMod.default || snakeMod);
    const inst = snake.create({ int() { return 0; }, range() { return 0; }, pick() { return ''; } }, { width: 400, height: 400, emit() {} });
    ok('snake.create returns object', typeof inst === 'object');
    ok('snake has update', typeof inst.update === 'function');
    ok('snake has render', typeof inst.render === 'function');
    ok('snake has serialize', typeof inst.serialize === 'function');
    ok('snake has events array', Array.isArray(inst.events));
  } catch (e) {
    ok('snake create headless', false, e.message);
  }

  console.log('\nJS smoke: ' + passed + ' pass / ' + failed + ' fail');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('JS smoke crash:', e); process.exit(1); });
