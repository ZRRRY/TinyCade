/* ============================================================
   games/rps.js — 猜拳(casual)
   3 选项: ← → 选, BTN.a 确认.
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'rps',
    name: '猜拳',
    desc: '石头剪刀布三局两胜',
    icon: '✂️',
    cat: 'casual',
    controls: '← → 选 · BTN.a 出招 · BTN.b 重开',
    width: 360,
    height: 360,
  },
  tickHz: 10,

  create(rng, api) {
    const W = 360, H = 360;
    const GEST = ['✊', '✌', '✋'];
    let cursor, you, cpu, wins, frame = 0;

    function reset() {
      cursor = 0; you = -1; cpu = -1; wins = [0, 0];
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
        else if (p.right && cursor < 2) cursor++;
        if (p.a) {
          you = cursor; cpu = rng.int(3);
          const result = (you - cpu + 3) % 3;
          if (result === 0) api.emit('beep');
          else if (result === 1) { wins[0]++; api.emit('win'); }
          else { wins[1]++; api.emit('lose'); }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === cursor ? '#aa00ff' : '#ff0066';
          ctx.fillRect(20 + i * 110, 100, 90, 100);
          ctx.fillStyle = '#fff'; ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(GEST[i], 65 + i * 110, 150);
        }
        centerText(ctx, `YOU ${wins[0]} - ${wins[1]} CPU`, W / 2, 240, '#00ffff', 24);
        centerText(ctx, `${GEST[you]}  vs  ${GEST[cpu]}`, W / 2, 290, '#ff0', 32);
      },
      serialize() { return { cursor, you, cpu, wins: wins.slice() }; },
    };
  },
};
