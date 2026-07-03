/* ============================================================
   games/speedmath.js — 速算(casual)
   限时答数学题. 数字键 0-9 + BTN.b 退格 + BTN.a 提交.
   60s 内做最多.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'speedmath',
    name: '速算',
    desc: '60 秒内做多少题',
    icon: '🧠',
    cat: 'casual',
    controls: 'BTN.left/right 上/下 调数字 · BTN.a 确认 · BTN.b 退格 · BTN.start 新题',
  },
  tickHz: 10,

  create(rng, api) {
    let problem, score, time, input, frame = 0;

    function gen() {
      const a = rng.int(50), b = rng.int(50);
      problem = { q: `${a} + ${b}`, ans: a + b };
      input = '0';
    }
    function reset() {
      score = 0; time = 600; gen();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return time <= 0; },
      update(input_) {
        const p = input_.pressed;
        if (p.b) input = input.slice(0, -1) || '0';
        if (p.left) input = String((parseInt(input, 10) + 9) % 10);
        else if (p.right) input = String((parseInt(input, 10) + 1) % 10);
        if (p.start) gen();
        if (p.a) {
          if (parseInt(input, 10) === problem.ans) { score++; api.emit('blip'); }
          else api.emit('deny');
          gen();
        }
        if (time > 0) time--;
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 360, 480);
        centerText(ctx, problem.q, 180, 200, '#00ffff', 60);
        centerText(ctx, input, 180, 280, '#fff', 60);
        centerText(ctx, `SCORE ${score} | ${Math.ceil(time / 10)}s`, 180, 30, '#ff00ff', 18);
      },
      serialize() { return { problem, score, time, input }; },
    };
  },
};
