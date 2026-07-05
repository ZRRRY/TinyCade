/* ============================================================
   engine/input.js — 统一输入快照（§4.2）
   逻辑按键与物理键/触摸解耦；引擎每 tick 采样一次并计算边沿。
   触摸/虚拟手柄直接写 held[btn]，不再伪造 KeyboardEvent。
   ============================================================ */

// 逻辑按键，与物理键/触摸解耦
export const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

// 回放/demo 输入源：按录制帧逐 tick 注入 held/pressed，不监听真实输入。
export function createDemoInput(frames) {
  let fi = 0;
  let held = Object.fromEntries(BTN.map((k) => [k, false]));
  let prev = Object.fromEntries(BTN.map((k) => [k, false]));
  let tick = 0;
  return {
    setBtn() {},
    freeze() {},
    unfreeze() {},
    sample() {
      while (fi < frames.length && frames[fi].tick === tick) {
        held = { ...Object.fromEntries(BTN.map((k) => [k, false])), ...frames[fi].held };
        fi++;
      }
      const pressed = {};
      for (const k of BTN) pressed[k] = held[k] && !prev[k];
      prev = held;
      tick++;
      return { held, pressed };
    },
    destroy() {}
  };
}

export function createInput(target = window) {
  const held = Object.fromEntries(BTN.map((k) => [k, false]));
  const KEYMAP = {
    ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
    ' ': 'a', Enter: 'a', z: 'a', x: 'b', p: 'start', Escape: 'select',
  };
  const norm = (e) => KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  const down = (e) => { const b = norm(e); if (b) { held[b] = true; e.preventDefault(); } };
  const up = (e) => { const b = norm(e); if (b) { held[b] = false; } };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);

  // 触摸/虚拟手柄直接写 held[btn]，不再伪造 KeyboardEvent
  const setBtn = (btn, v) => { if (btn in held) held[btn] = !!v; };

  let prev = { ...held };
  let frozen = false;
  return {
    setBtn,
    // 暂停时冻结 sample: 仍生成快照但 prev 不变,恢复后边沿反映
    // 真实状态变化(而非把暂停期间的释放误判为新的按下)。
    freeze() { frozen = true; },
    unfreeze() { frozen = false; prev = { ...held }; },
    // 引擎每 tick 调一次：返回本 tick 快照 + 边沿
    sample() {
      const cur = { ...held };
      const pressed = {};
      for (const k of BTN) pressed[k] = cur[k] && !prev[k];
      if (!frozen) prev = cur;
      return { held: cur, pressed };
    },
    // 回放时用录制值覆盖
    injectSnapshot(snap) { Object.assign(held, snap); },
    destroy() {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
    },
  };
}
