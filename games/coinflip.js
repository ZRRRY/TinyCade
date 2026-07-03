/* ============================================================
   games/coinflip.js — 硬币抛(casual)
   ← → 选 H/T, BTN.a 提交.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'coinflip',
    name: '硬币抛',
    desc: '猜正反 · 连胜加分',
    icon: '🪙',
    cat: 'casual',
    controls: '← → 选 H/T · BTN.a 投 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const W = 360, H = 360;
    let streak, last, cursor, frame = 0;

    function reset() {
      streak = 0; last = '?'; cursor = 0;
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
        if (p.left && cursor > 0) cursor--;
        else if (p.right && cursor < 1) cursor++;
        if (p.a) {
          const g = cursor === 0 ? 'H' : 'T';
          const r = rng() < 0.5 ? 'H' : 'T';
          if (g === r) { streak++; api.emit('blip'); }
          else { streak = 0; api.emit('deny'); }
          last = r;
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(W / 2, 140, 50, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = '40px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(last === '?' ? '?' : last, W / 2, 140);
        ctx.fillStyle = cursor === 0 ? '#aa00ff' : '#ff0066';
        ctx.fillRect(50, 250, 110, 80);
        ctx.fillStyle = cursor === 1 ? '#aa00ff' : '#ff0066';
        ctx.fillRect(200, 250, 110, 80);
        ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'center';
        ctx.fillText('HEADS', 105, 295);
        ctx.fillText('TAILS', 255, 295);
        centerText(ctx, `STREAK ${streak}`, W / 2, 30, '#00ffff', 24);
      },
      serialize() { return { streak, last, cursor }; },
    };
  },
};
