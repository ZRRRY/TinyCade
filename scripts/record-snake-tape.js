#!/usr/bin/env node
/* ============================================================
   scripts/record-snake-tape.js — 贪吃蛇金样本录制脚本（dev-only）
   - 零依赖 · 原生 ESM · Node 18+。
   - 用法：node scripts/record-snake-tape.js
   - 行为：
       1. 预定义输入序列（stateChanges）。
       2. 用 makeRng(seed) 起蛇，调 snake.create()。
       3. 逐 tick 推进：recorder.record → inst.update（死亡时停）。
       4. 把 {game, seed, frames, expect: hashState(serialized)} 写到
          test/replay/snake.tape.json。
   - 重跑幂等：同一份 seed + 同一份输入序列 → 同一 expect。
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeRng } from '../engine/rng.js';
import { createRecorder, hashState } from '../engine/recorder.js';
import snake from '../games/snake.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAPE_PATH = path.resolve(__dirname, '..', 'test', 'replay', 'snake.tape.json');

// --- 录制参数 -----------------------------------------------------------
const SEED = 123456789;
const MAX_TICKS = 100;

// 预定义输入序列：状态变更列表（每条声明从该 tick 起的 held）。
// snake 初始 dir=(1,0)：向右。
//   tick 8  → 按下 down：蛇身走到 x=18, y=10 时转向下。
//   tick 9  → 释放 down：dir 已变 (0,1)，不再被 rejected，继续下。
//   tick 17 → 按下 right：让 dir 从 (0,1) 转 (1,0)，下一 tick 撞右墙。
//   tick 18 → 释放 right：snake 此刻已 gameover，无实际效果。
const stateChanges = [
  { tick: 8,  held: { down: true } },
  { tick: 9,  held: {} },
  { tick: 17, held: { right: true } },
  { tick: 18, held: {} },
];

// --- 录制主循环 ---------------------------------------------------------
const rng = makeRng(SEED);
const recorder = createRecorder();
const api = { width: 400, height: 400, emit: () => {} };
const inst = snake.create(rng, api);

let held = {};
let prev = {};
let changeIdx = 0;
let endedAt = -1;

for (let tick = 0; tick < MAX_TICKS; tick++) {
  // 应用本 tick 的所有 state changes（按顺序，后者覆盖前者）
  while (changeIdx < stateChanges.length && stateChanges[changeIdx].tick === tick) {
    held = { ...stateChanges[changeIdx].held };
    changeIdx++;
  }
  // 计算本 tick 的边沿（pressed）
  const pressed = {};
  for (const k of Object.keys(held)) {
    if (held[k] && !prev[k]) pressed[k] = true;
  }
  // 录制 + 推进逻辑
  recorder.record(tick, { held, pressed });
  inst.update({ held, pressed });
  // 死亡即终止
  if (inst.over) { endedAt = tick; break; }
  prev = { ...held };
}

const finalState = inst.serialize();
const expect = hashState(finalState);
const tape = {
  game: 'snake',
  seed: SEED,
  frames: recorder.frames,
  maxTicks: endedAt >= 0 ? endedAt + 1 : MAX_TICKS,
  expect,
};

// --- 落盘 ---------------------------------------------------------------
fs.mkdirSync(path.dirname(TAPE_PATH), { recursive: true });
fs.writeFileSync(TAPE_PATH, JSON.stringify(tape, null, 2) + '\n', 'utf8');

console.log(`[record-snake-tape] wrote ${TAPE_PATH}`);
console.log(`  seed:    ${tape.seed}`);
console.log(`  frames:  ${tape.frames.length} (change-only)`);
console.log(`  endedAt: ${endedAt >= 0 ? `tick ${endedAt}` : 'did not end within ' + MAX_TICKS}`);
console.log(`  state:   ${JSON.stringify(finalState)}`);
console.log(`  expect:  ${expect}`);
