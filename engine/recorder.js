/* ============================================================
   engine/recorder.js — 录制 / 回放 / 哈希（§4.5）
   原生 ESM，Node 18+ 与浏览器共用；测试在 Node 里 import 同一份
   games/*.js 跑 replay。全部 import/export，不使用 require。
   ============================================================ */

import { makeRng } from './rng.js';
import { BTN } from './input.js';

// 录制器：仅在 held 变化时压栈以省空间。
export function createRecorder() {
  const frames = []; // [{tick, held}]
  let lastKey = '';
  let maxTick = -1;
  return {
    frames,
    record(tick, snap) {
      if (tick > maxTick) maxTick = tick;
      const key = JSON.stringify(snap.held);
      if (key !== lastKey) { frames.push({ tick, held: snap.held }); lastKey = key; }
    },
    export(seed) { return { seed, frames, maxTicks: maxTick + 1 }; },
  };
}

// 按钮掩码：与 BTN 顺序对齐（up/down/left/right/a/b/start/select）
function heldToMask(held) {
  let m = 0;
  for (let i = 0; i < BTN.length; i++) {
    if (held[BTN[i]]) m |= 1 << i;
  }
  return m;
}
function maskToHeld(mask) {
  const held = {};
  for (let i = 0; i < BTN.length; i++) {
    held[BTN[i]] = !!(mask & (1 << i));
  }
  return held;
}

/**
 * 压缩录制帧为 URL-safe base64 字符串。
 * 格式：JSON.stringify([[tick, mask], ...]) 后 base64（URL-safe，去 padding）。
 */
export function encodeFrames(frames) {
  const arr = frames.map(f => [f.tick, heldToMask(f.held)]);
  const b64 = btoa(JSON.stringify(arr));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 解压缩 encodeFrames 的结果，返回 [{tick, held}]。
 */
export function decodeFrames(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const arr = JSON.parse(atob(b64));
  return arr.map(([tick, mask]) => ({ tick, held: maskToHeld(mask) }));
}

function allFalse() {
  const o = {};
  for (const k of BTN) o[k] = false;
  return o;
}

// 无头回放：不需要 canvas/audio，纯跑 update。
//   maxTicks 缺省从 tape.maxTicks 读（保证跟录带时一致），再退回 100000。
export function replay(gameModule, tape, maxTicks) {
  const mod = (gameModule && gameModule.default) ? gameModule.default : gameModule;
  const rng = makeRng(tape.seed);
  const inst = mod.create(rng, { width: 400, height: 400, emit() {} });
  const frames = tape.frames || [];
  const cap = maxTicks || tape.maxTicks || 100000;
  let fi = 0;
  let held = allFalse();
  let prev = allFalse();
  for (let tick = 0; tick < cap; tick++) {
    // 应用本 tick 的录制变化（可能有多条同 tick，取最后一条）
    while (fi < frames.length && frames[fi].tick === tick) {
      held = { ...allFalse(), ...frames[fi].held };
      fi++;
    }
    const pressed = {};
    for (const k of BTN) pressed[k] = held[k] && !prev[k];
    inst.update({ held, pressed });
    prev = held;
    if (inst.over) break;
  }
  return inst.serialize();
}

// FNV-1a，跨端一致，返回 hex 字符串。
export function hashState(obj) {
  const s = JSON.stringify(obj);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
