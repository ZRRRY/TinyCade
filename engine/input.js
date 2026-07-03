/* ============================================================
   engine/input.js — 统一输入快照（§4.2）
   逻辑按键与物理键/触摸解耦；引擎每 tick 采样一次并计算边沿。
   触摸/虚拟手柄直接写 held[btn]，不再伪造 KeyboardEvent。
   ============================================================ */

// 逻辑按键，与物理键/触摸解耦
export const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

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
  return {
    setBtn,
    // 引擎每 tick 调一次：返回本 tick 快照 + 边沿
    sample() {
      const cur = { ...held };
      const pressed = {};
      for (const k of BTN) pressed[k] = cur[k] && !prev[k];
      prev = cur;
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
