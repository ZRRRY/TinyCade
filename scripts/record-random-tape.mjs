#!/usr/bin/env node
/* ============================================================
   scripts/record-random-tape.mjs — 随机输入金样本录制工具
   - 用独立的输入 RNG 生成确定性按键序列。
   - 用法：
       node scripts/record-random-tape.mjs <game-id> <suffix> [--seed N] [--max-ticks N]
   - 输出：test/replay/<id>-<suffix>.tape.json
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { makeRng } from '../engine/rng.js';
import { createRecorder, hashState } from '../engine/recorder.js';
import { findById } from '../games/manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPLAY_DIR = path.resolve(__dirname, '..', 'test', 'replay');
const BTNS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { seed: 12345, maxTicks: 300, id: null, suffix: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--seed') opts.seed = Number(args[++i]) >>> 0;
    else if (a === '--max-ticks') opts.maxTicks = Number(args[++i]) >>> 0;
    else if (!opts.id) opts.id = a;
    else if (!opts.suffix) opts.suffix = a;
    else { console.error(`[record-random-tape] ✗ 未知参数: ${a}`); process.exit(2); }
  }
  if (!opts.id || !opts.suffix) {
    console.error('Usage: node scripts/record-random-tape.mjs <game-id> <suffix> [--seed N] [--max-ticks N]');
    process.exit(2);
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const meta = findById(opts.id);
  if (!meta) {
    console.error(`[record-random-tape] ✗ manifest 找不到 id: ${opts.id}`);
    process.exit(1);
  }
  const modPath = pathToFileURL(path.resolve(__dirname, '..', 'games', opts.id + '.js')).href;
  const mod = await import(modPath);
  const gameMod = mod.default || mod;
  if (typeof gameMod.create !== 'function') {
    console.error(`[record-random-tape] ✗ games/${opts.id}.js 没有 default export create()`);
    process.exit(1);
  }

  // 游戏 RNG 与输入 RNG 分离：输入 RNG 只决定按键，游戏 RNG 决定局面。
  const gameRng = makeRng(opts.seed);
  const inputRng = makeRng(opts.seed ^ 0x9e3779b9); // 黄金比例扰动，避免与游戏 seed 相同
  const recorder = createRecorder();
  const api = { width: 400, height: 400, emit: () => {} };
  const inst = gameMod.create(gameRng, api);

  let held = {};
  let prev = {};
  let endedAt = -1;

  for (let tick = 0; tick < opts.maxTicks; tick++) {
    // 每 5 tick 以 30% 概率切换一次按键（边沿触发更干净）
    if (tick % 5 === 0 && inputRng() < 0.3) {
      const btn = BTNS[inputRng.int(BTNS.length)];
      held = { [btn]: !held[btn] };
    }
    const pressed = {};
    for (const k of BTNS) pressed[k] = held[k] && !prev[k];
    recorder.record(tick, { held, pressed });
    inst.update({ held, pressed });
    if (inst.over) { endedAt = tick; break; }
    prev = { ...held };
  }

  const finalState = inst.serialize();
  const expect = hashState(finalState);
  const tape = {
    game: opts.id,
    seed: opts.seed,
    maxTicks: endedAt >= 0 ? endedAt + 1 : opts.maxTicks,
    frames: recorder.frames,
    expect,
  };

  fs.mkdirSync(REPLAY_DIR, { recursive: true });
  const out = path.join(REPLAY_DIR, `${opts.id}-${opts.suffix}.tape.json`);
  fs.writeFileSync(out, JSON.stringify(tape, null, 2) + '\n', 'utf8');

  console.log(`[record-random-tape] wrote ${path.relative(process.cwd(), out)}`);
  console.log(`  seed:    ${tape.seed}`);
  console.log(`  frames:  ${tape.frames.length} (change-only)`);
  console.log(`  endedAt: ${endedAt >= 0 ? 'tick ' + endedAt : 'did not end within ' + opts.maxTicks}`);
  console.log(`  state:   ${JSON.stringify(finalState)}`);
  console.log(`  expect:  ${expect}`);
}

main().catch((e) => {
  console.error('[record-random-tape] ✗', e && e.message ? e.message : e);
  process.exit(1);
});
