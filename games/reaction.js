/* ============================================================
   games/reaction.js — 反应力(casual)
   等红→绿,BTN.a 按下尽快反应. 简化为单阶段.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'reaction',
    name: '反应力',
    desc: '看颜色变化瞬间点击，测你的反应速度',
    icon: '⚡',
    cat: 'casual',
    controls: 'BTN.a 当屏幕变绿立刻按 · 太早按失败 · BTN.b 重开',
    width: 480,
    height: 320,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 480, H = 320;
    let phase, waitT, startT, best, last, frame = 0;

    function start() {
      phase = 'wait'; waitT = 30 + rng.int(90); // 1-4s @ 30Hz
      startT = 0;
    }
    function reset() {
      best = Infinity; last = 0; start();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (phase === 'wait') {
          waitT--;
          if (waitT <= 0) { phase = 'go'; startT = frame; }
          if (p.a) { phase = 'fail'; api.emit('deny'); }
        } else if (phase === 'go') {
          if (p.a) {
            const r = (frame - startT) / 30 * 1000; // ms
            last = r;
            if (r < best) best = r;
            api.emit(r < 300 ? 'blip' : 'beep');
            phase = 'result';
          }
        } else if (phase === 'result' || phase === 'fail') {
          if (p.a) start();
        }
        frame++;
      },
      render(ctx) {
        const colors = { wait: '#aa0000', go: '#00aa00', fail: '#aa6600', result: '#000088' };
        ctx.fillStyle = colors[phase] || '#aa0000';
        ctx.fillRect(0, 0, W, H);
        if (phase === 'wait') {
          centerText(ctx, 'WAIT FOR GREEN...', W / 2, 130, '#fff', 28);
        } else if (phase === 'go') {
          centerText(ctx, 'CLICK NOW!', W / 2, 130, '#fff', 36);
        } else if (phase === 'fail') {
          centerText(ctx, 'TOO EARLY!', W / 2, 130, '#fff', 32);
          centerText(ctx, 'BTN.a TO RETRY', W / 2, 200, '#fff', 16);
        } else if (phase === 'result') {
          centerText(ctx, `${Math.round(last)} ms`, W / 2, 100, '#fff', 36);
          if (best < Infinity) centerText(ctx, `BEST: ${Math.round(best)} ms`, W / 2, 160, '#ffff00', 18);
          centerText(ctx, 'BTN.a TO TRY AGAIN', W / 2, 220, '#fff', 14);
        }
      },
      serialize() { return { phase, last, best: best === Infinity ? -1 : best }; },
    };
  },
};
