/* ============================================================
   games/colormemory.js — 颜色记忆(casual)
   4 象限颜色序列. 复用 simon 模式但 4 颜色方块独立显示.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'colormemory',
    name: '颜色记忆',
    desc: '记住方块序列',
    icon: '🌈',
    cat: 'casual',
    controls: '方向键移象限 · BTN.a 按下 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 400;
    const COLORS = ['#ff0066', '#00ff66', '#0066ff', '#ffff00'];
    let seq, idx, lit, score, state, cursor, showTick, frame = 0;

    function reset() {
      seq = [];
      for (let i = 0; i < 3; i++) seq.push(rng.int(4));
      idx = 0; lit = -1; score = 0; state = 'show'; cursor = 0;
      showTick = frame;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return state === 'fail'; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (state === 'show') {
          const t = frame - showTick;
          if (t < seq.length * 30) {
            const i = Math.floor(t / 30);
            const subT = t % 30;
            lit = subT < 18 ? seq[i] : -1;
          } else { lit = -1; state = 'input'; }
        } else if (state === 'input') {
          if (p.left && cursor % 2 === 1) cursor--;
          else if (p.right && cursor % 2 === 0) cursor++;
          else if (p.up && cursor >= 2) cursor -= 2;
          else if (p.down && cursor <= 1) cursor += 2;
          if (p.a) {
            if (cursor === seq[idx]) {
              idx++;
              if (idx === seq.length) {
                score++; api.emit('blip');
                seq.push(rng.int(4)); state = 'show'; showTick = frame; idx = 0;
              }
            } else { state = 'fail'; api.emit('gameover'); }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        COLORS.forEach((c, i) => {
          ctx.fillStyle = lit === i ? c : '#222';
          ctx.fillRect((i % 2) * 200, Math.floor(i / 2) * 200, 200, 200);
        });
        if (state === 'input') {
          const cx = (cursor % 2) * 200, cy = Math.floor(cursor / 2) * 200;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
          ctx.strokeRect(cx + 4, cy + 4, 192, 192);
        }
        centerText(ctx, `LEVEL ${score + 1}`, W / 2, 20, '#fff', 16);
        if (state === 'fail') centerText(ctx, 'GAME OVER - BTN.b', W / 2, H - 30, '#fff', 20);
      },
      serialize() { return { score, state, cursor }; },
    };
  },
};
