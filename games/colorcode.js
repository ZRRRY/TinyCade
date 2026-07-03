/* ============================================================
   games/colorcode.js — 颜色密码（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:3070 — Mastermind 风格
   - 演示模式：BTN.a 自动猜（按 rng 随机颜色组合），BTN.b 提交。
   ============================================================ */

export default {
  meta: {
    id: 'colorcode',
    name: '颜色密码',
    desc: '猜出隐藏的颜色密码',
    icon: '🎨',
    cat: 'puzzle',
    controls: '点击底部选色 · 提交看反馈',
  },
  tickHz: 5,

  create(rng, api) {
    const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800', '#aa00ff'];
    let secret, guesses, sel, attempts, over, win, tickFrame;

    function reset() {
      secret = [];
      for (let i = 0; i < 4; i++) secret.push(rng.int(COLORS.length));
      guesses = []; sel = [0, 0, 0, 0]; attempts = 0; over = false; win = false; tickFrame = 0;
    }
    function feedback(g) {
      let correct = 0, misp = 0;
      const sc = [...secret], gc = [...g];
      for (let i = 0; i < 4; i++) if (gc[i] === sc[i]) { correct++; sc[i] = -1; gc[i] = -2; }
      for (let i = 0; i < 4; i++) if (gc[i] >= 0) {
        const j = sc.indexOf(gc[i]);
        if (j >= 0) { misp++; sc[j] = -1; }
      }
      return { correct, misp };
    }
    function autoGuess() {
      const g = [rng.int(COLORS.length), rng.int(COLORS.length), rng.int(COLORS.length), rng.int(COLORS.length)];
      const f = feedback(g);
      guesses.push({ g, f });
      attempts++;
      if (f.correct === 4) { win = true; over = true; api.emit('win'); }
      else if (guesses.length > 6) { over = true; api.emit('gameover'); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (over) return;
        if (input.pressed.a) autoGuess();
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        // 历史
        guesses.forEach((row, ri) => {
          row.g.forEach((c, ci) => {
            ctx.fillStyle = COLORS[c];
            ctx.fillRect(20 + ci * 50, 20 + ri * 50, 40, 40);
          });
          for (let i = 0; i < row.f.correct; i++) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(220 + i * 8, 30 + ri * 50, 6, 20);
          }
          for (let i = 0; i < row.f.misp; i++) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(220 + (row.f.correct + i) * 8, 30 + ri * 50, 6, 20);
          }
        });
        // 候选
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = COLORS[sel[i]];
          ctx.fillRect(20 + i * 50, 320, 40, 40);
        }
        // 色板
        COLORS.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.fillRect(20 + i * 55, 380, 45, 30);
        });
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`ATTEMPTS ${attempts}`, 10, 8);
      },
      serialize() { return { attempts, win, over, secretLen: secret.length }; },
    };
  },
};