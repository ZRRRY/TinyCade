/* ============================================================
   games/numbermem.js — 数字记忆(casual)
   显示一段数字 → 玩家用 BTN.up/down 选 0-9, BTN.a 确认位.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'numbermem',
    name: '数字记忆',
    desc: '记住显示的数字并复述',
    icon: '🔢',
    cat: 'casual',
    controls: 'BTN.up/down 选数字 · BTN.a 确认位 · BTN.b 退格',
  },
  tickHz: 10,

  create(rng, api) {
    let level, num, state, input, showUntil, currentDigit, frame = 0;

    function makeNum() {
      let s = '';
      for (let i = 0; i < level; i++) s += String(rng.int(10));
      return s;
    }
    function reset() {
      level = 1;
      num = makeNum();
      state = 'show'; input = ''; showUntil = frame + level * 30;
      currentDigit = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; },
      update(input_) {
        const p = input_.pressed;
        if (state === 'show') {
          if (frame >= showUntil) { state = 'input'; currentDigit = 0; input = ''; }
        } else if (state === 'input') {
          if (p.up && currentDigit < 9) currentDigit++;
          else if (p.down && currentDigit > 0) currentDigit--;
          if (p.b && input.length) input = input.slice(0, -1);
          if (p.a) {
            input += String(currentDigit);
            if (input.length >= num.length) {
              if (input === num) { level++; api.emit('win'); num = makeNum(); state = 'show'; showUntil = frame + level * 30; input = ''; }
              else { api.emit('gameover'); reset(); }
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 360, 360);
        if (state === 'show') {
          centerText(ctx, num, 180, 180, '#00ffff', 60);
        } else {
          // input 显示
          centerText(ctx, input + (currentDigit !== null ? `_${currentDigit}` : ''), 180, 180, '#fff', 36);
        }
        centerText(ctx, `LEVEL ${level}`, 180, 30, '#ff00ff', 18);
      },
      serialize() { return { num, level, state, input }; },
    };
  },
};
