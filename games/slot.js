/* ============================================================
   games/slot.js — 老虎机(casual)
   BTN.a 拉杆. rng 决定 3 个 reels. 命中加分.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'slot',
    name: '老虎机',
    desc: '转出相同符号赢分',
    icon: '🎰',
    cat: 'casual',
    controls: 'BTN.a 拉杆 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const SYMS = ['🍒', '🍋', '🍊', '🍇', '⭐', '7'];
    let reels, score, spinUntil, frame = 0;

    function reset() {
      reels = [0, 0, 0]; score = 100; spinUntil = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return score <= 0; },
      update(input) {
        const p = input.pressed;
        if (score <= 0) return;
        if (p.b) { reset(); return; }
        if (p.a && spinUntil === 0) {
          spinUntil = frame + 30; // 转 3 秒
          api.emit('swoosh');
        }
        if (spinUntil > 0 && frame <= spinUntil) {
          reels = reels.map(() => rng.int(SYMS.length));
        }
        if (spinUntil > 0 && frame > spinUntil) {
          // 检查
          if (reels[0] === reels[1] && reels[1] === reels[2]) {
            score += 100; api.emit('win');
          } else {
            score -= 5; api.emit('deny');
          }
          spinUntil = 0;
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 360, 320);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
          ctx.strokeRect(40 + i * 100, 80, 80, 100);
          ctx.fillStyle = '#fff'; ctx.font = '60px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(SYMS[reels[i]], 80 + i * 100, 130);
        }
        centerText(ctx, `$${score}`, 30, 30, '#00ffff', 24);
        if (spinUntil === 0) centerText(ctx, 'BTN.a to spin', 180, 240, '#888', 14);
      },
      serialize() { return { reels: reels.slice(), score, spinning: spinUntil > 0 }; },
    };
  },
};
