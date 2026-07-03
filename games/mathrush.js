/* ============================================================
   games/mathrush.js — 数学快答（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2701 — 限时选正确答案
   - 演示模式：BTN.a 自动选正确答案（演示用），BTN.b 选错答案。
   ============================================================ */

export default {
  meta: {
    id: 'mathrush',
    name: '数学快答',
    desc: '快速解答数学题',
    icon: '➕',
    cat: 'puzzle',
    controls: '点击正确答案',
  },
  tickHz: 30,

  create(rng, api) {
    let problem, score, timeTicks, over, tickFrame;

    function gen() {
      const a = rng.int(20) + 1, b = rng.int(20) + 1;
      const op = ['+', '-', '*'][rng.int(3)];
      const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
      const choices = [ans];
      while (choices.length < 4) {
        const v = ans + rng.range(-5, 6);
        if (!choices.includes(v) && v >= 0) choices.push(v);
      }
      // shuffle
      for (let i = choices.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      problem = { q: `${a} ${op} ${b}`, ans, choices };
    }
    function reset() {
      score = 0; timeTicks = 30 * 30; over = false; tickFrame = 0;
      gen();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return timeTicks <= 0; },
      update(input) {
        tickFrame++;
        if (timeTicks > 0) timeTicks--;
        if (input.pressed.a) {
          // 自动选对
          score++; api.emit('blip');
          gen();
        } else if (input.pressed.b) {
          api.emit('deny');
        }
        if (timeTicks <= 0 && !over) { over = true; api.emit('gameover'); }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#00ffff';
        ctx.font = '40px VT323, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(problem.q, 200, 100);
        problem.choices.forEach((c, i) => {
          ctx.fillStyle = '#ff0066';
          ctx.fillRect(40, 180 + i * 50, 320, 40);
          ctx.fillStyle = '#fff';
          ctx.font = '24px VT323, monospace';
          ctx.fillText(c, 200, 200 + i * 50);
        });
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score} · TIME ${Math.ceil(timeTicks / 30)}s`, 10, 10);
      },
      serialize() { return { score, timeTicks, over }; },
    };
  },
};