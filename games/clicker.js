/* ============================================================
   games/clicker.js — 点击狂(casual)
   60秒内按 BTN.a 多少下. 纯计数.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'clicker',
    name: '点击狂',
    desc: '60 秒能点多少下',
    icon: '🖱️',
    cat: 'casual',
    controls: 'BTN.a 狂按 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    let count, time, frame = 0;

    function reset() {
      count = 0; time = 1800; // 60s @ 30Hz
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return time <= 0; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (time > 0) time--;
        if (p.a && time > 0) { count++; api.emit('click'); }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 360, 480);
        ctx.fillStyle = '#ff0066'; ctx.fillRect(80, 200, 200, 100);
        centerText(ctx, 'CLICK!', 180, 230, '#fff', 40);
        centerText(ctx, String(count), 180, 100, '#00ffff', 60);
        centerText(ctx, `${Math.ceil(time / 30)}s`, 180, 150, '#00ffff', 24);
      },
      serialize() { return { count, time, over: time <= 0 }; },
    };
  },
};
