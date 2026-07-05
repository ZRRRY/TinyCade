/* ============================================================
   games/dice.js — 骰子双雄（策略类）
   BTN.a 投掷. 5 局三胜. rng 决定双方点数.
   ============================================================ */

import { centerText, pixelText } from '../engine/draw.js';

export default {
  meta: {
    id: 'dice',
    name: '骰子双雄',
    desc: '比大小赢回合',
    icon: '🎲',
    cat: 'strategy',
    controls: 'BTN.a 投掷 · BTN.b 重开',
    width: 360,
    height: 360,
  },
  tickHz: 5,

  create(rng, api) {
    const W = 360, H = 360;
    let you, cpu, score, turn, frame = 0;

    function reset() {
      you = 0; cpu = 0; score = [0, 0]; turn = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return turn >= 5; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (turn < 5 && p.a && you === 0 && cpu === 0) {
          const a = 1 + rng.int(6);
          const b = 1 + rng.int(6);
          you = a; cpu = b;
          api.emit('roll');
          if (a > b) { score[0]++; api.emit('win'); }
          else if (b > a) { score[1]++; api.emit('gameover'); }
          else { api.emit('beep'); }
          turn++;
        }
        // 重置本轮显示 (用于下次显示)
        if (turn < 5 && p.select) { you = 0; cpu = 0; }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff0066';
        centerText(ctx, 'YOU', W / 2, 60, '#ff0066', 36);
        centerText(ctx, 'CPU', W / 2, 220, '#ff0066', 36);
        ctx.fillStyle = '#fff';
        ctx.fillRect(120, 100, 120, 80);
        ctx.fillRect(120, 260, 120, 80);
        ctx.fillStyle = '#000';
        centerText(ctx, String(you || '?'), 180, 120, '#000', 60);
        centerText(ctx, String(cpu || '?'), 180, 280, '#000', 60);
        centerText(ctx, `${score[0]} - ${score[1]}`, W / 2, 330, '#00ffff', 20);
        if (turn >= 5) {
          centerText(ctx, score[0] > score[1] ? 'YOU WIN!' : score[1] > score[0] ? 'CPU WINS!' : 'DRAW', W / 2, 30,
            score[0] >= score[1] ? '#00ff00' : '#ff0000', 24);
        } else {
          centerText(ctx, `ROUND ${turn + 1}/5 · BTN.a TO ROLL`, W / 2, 380, '#888', 14);
        }
      },
      serialize() { return { you, cpu, score: score.slice(), turn, over: turn >= 5 }; },
    };
  },
};
