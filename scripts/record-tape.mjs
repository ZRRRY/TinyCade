#!/usr/bin/env node
/* ============================================================
   scripts/record-tape.mjs — 通用金样本录制工具
   - 零依赖 · 原生 ESM · Node 18+。
   - 用法：
       node scripts/record-tape.mjs <game-id>
       node scripts/record-tape.mjs <game-id> --seed 12345 --max-ticks 200
       node scripts/record-tape.mjs <game-id> --input state-changes.json
       node scripts/record-tape.mjs <game-id> --out <id>-2.tape.json
   - 输入文件格式（JSON 数组，跟 scripts/record-snake-tape.js 一致）：
       [{ "tick": 8, "held": { "down": true } }, ...]
   - 把 {game, seed, frames, expect} 写到 test/replay/<out>（默认 <id>.tape.json）。
   - 复跑幂等：同一份 seed + 输入序列 → 同一 expect。
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
  const opts = { seed: 12345, maxTicks: 200, input: null, id: null, out: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--seed') opts.seed = Number(args[++i]) >>> 0;
    else if (a === '--max-ticks') opts.maxTicks = Number(args[++i]) >>> 0;
    else if (a === '--input') opts.input = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (!opts.id) opts.id = a;
    else { console.error(`[record-tape] ✗ 未知参数: ${a}`); process.exit(2); }
  }
  if (!opts.id) {
    console.error('Usage: node scripts/record-tape.mjs <game-id> [--seed N] [--max-ticks N] [--input <state.json>] [--out <file>]');
    process.exit(2);
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const meta = findById(opts.id);
  if (!meta) {
    console.error(`[record-tape] ✗ manifest 找不到 id: ${opts.id}`);
    process.exit(1);
  }
  const modPath = pathToFileURL(path.resolve(__dirname, '..', 'games', opts.id + '.js')).href;
  const mod = await import(modPath);
  const gameMod = mod.default || mod;
  if (typeof gameMod.create !== 'function') {
    console.error(`[record-tape] ✗ games/${opts.id}.j s 没有 default export create()`);
    process.exit(1);
  }

  let stateChanges = [];
  if (opts.input) {
    const txt = fs.readFileSync(opts.input, 'utf8');
    stateChanges = JSON.parse(txt);
    if (!Array.isArray(stateChanges)) {
      console.error('[record-tape] ✗ --input 必须是 JSON 数组');
      process.exit(2);
    }
  }

  const rng = makeRng(opts.seed);
  const recorder = createRecorder();
  const api = { width: 400, height: 400, emit: () => {} };
  const inst = gameMod.create(rng, api);

  let held = {};
  let prev = {};
  let changeIdx = 0;
  let endedAt = -1;

  for (let tick = 0; tick < opts.maxTicks; tick++) {
    while (changeIdx < stateChanges.length && stateChanges[changeIdx].tick === tick) {
      held = { ...stateChanges[changeIdx].held };
      changeIdx++;
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
    maxTicks: opts.maxTicks,        // 记录录带时跑的 tick 上限，replay 用它避免跑得过长产生不一致
    frames: recorder.frames,
    expect,
  };

  fs.mkdirSync(REPLAY_DIR, { recursive: true });
  const out = path.join(REPLAY_DIR, opts.out || (opts.id + '.tape.json'));
  fs.writeFileSync(out, JSON.stringify(tape, null, 2) + '\n', 'utf8');

  console.log(`[record-tape] wrote ${path.relative(process.cwd(), out)}`);
  console.log(`  seed:    ${tape.seed}`);
  console.log(`  frames:  ${tape.frames.length} (change-only)`);
  console.log(`  endedAt: ${endedAt >= 0 ? 'tick ' + endedAt : 'did not end within ' + opts.maxTicks}`);
  console.log(`  state:   ${JSON.stringify(finalState)}`);
  console.log(`  expect:  ${expect}`);
}

main().catch((e) => {
  console.error('[record-tape] ✗', e && e.message ? e.message : e);
  process.exit(1);
});
