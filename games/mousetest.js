/* ============================================================
   games/mousetest.js — 鼠标测试(casual)
   [no-mouse-yet]: BTN.a 击打随机出现的目标点.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'mousetest',
    name: '鼠标测试',
    desc: '尽可能快地点击圆点',
    icon: '🐭',
    cat: 'casual',
    controls: 'BTN.a 击中目标 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 400;
    let targets, score, frame = 0;

    function spawn() {
      targets = [{ x: 50 + rng.int(300), y: 50 + rng.int(300), r: 15, t: 90 }];
    }
    function reset() {
      score = 0; spawn();
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
        targets.forEach((t) => t.t--);
        targets = targets.filter((t) => t.t > 0);
        if (!targets.length) spawn();
        if (p.a) {
          targets = targets.filter((t) => { score++; return false; });
          if (!targets.length) spawn();
          api.emit('blip');
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        targets.forEach((t) => {
          ctx.fillStyle = `rgba(255, 0, 102, ${Math.min(1, t.t / 30)})`;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
        });
        centerText(ctx, `HITS ${score}`, W / 2, 30, '#00ffff', 24);
      },
      serialize() { return { score, targets: targets.slice() }; },
    };
  },
};
