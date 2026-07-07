/* ============================================================
   games/speedmath.js — 速算(casual)
   限时答数学题. 方向键移动光标并调数字, BTN.b 退格, BTN.a 提交.
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
    controls: '方向键选择/调数字 · BTN.a 确认 · BTN.b 退格 · BTN.start 新题',
  },
  tickHz: 10,

  create(rng, api) {
    let problem, score, time, input, frame = 0, cursor = 0;

    function gen() {
      const a = rng.int(50), b = rng.int(50);
      problem = { q: `${a} + ${b}`, ans: a + b };
      input = '0';
      cursor = 0;
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
        if (time <= 0) return;
        const p = input_.pressed;
        if (p.b) {
          if (input.length > 1) {
            input = input.slice(0, cursor) + input.slice(cursor + 1);
            if (cursor > input.length - 1) cursor = input.length - 1;
          } else {
            input = '0';
          }
        }
        if (p.up) {
          const arr = input.split('');
          arr[cursor] = String((parseInt(arr[cursor], 10) + 1) % 10);
          input = arr.join('');
        } else if (p.down) {
          const arr = input.split('');
          arr[cursor] = String((parseInt(arr[cursor], 10) + 9) % 10);
          input = arr.join('');
        }
        if (p.left && cursor > 0) cursor--;
        if (p.right && cursor < input.length - 1) cursor++;
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
        if (input.length > 1) {
          ctx.save();
          ctx.font = '60px VT323, monospace';
          ctx.textBaseline = 'top';
          const total = ctx.measureText(input).width;
          const cw = total / input.length;
          const x = 180 - total / 2 + cursor * cw;
          ctx.fillStyle = '#ff00ff';
          ctx.fillRect(x, 345, cw, 4);
          ctx.restore();
        }
        centerText(ctx, `SCORE ${score} | ${Math.ceil(time / 10)}s`, 180, 30, '#ff00ff', 18);
      },
      serialize() { return { problem, score, time, input }; },
    };
  },
};
