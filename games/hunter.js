/* ============================================================
   games/hunter.js — 猎人（action）
   - 原版 games-extra.js:1566 — 限时 60 秒射击猎物
   - 输入：a 边沿射击 [no-mouse-yet]（鼠标点击改成 a 键）
   - 决定论：猎物初始位置 / 速度 / 时间递减均来自 rng 与 tick
   ============================================================ */

export default {
  meta: {
    id: 'hunter',
    name: '猎人',
    desc: '射击猎物得分',
    icon: '🏹',
    cat: 'action',
    controls: 'A/空格 射击 · 限时 60 秒',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    let ducks, score, time, over;

    function spawn() {
      ducks.push({
        x: 40 + rng.range(0, 400),
        y: 30 + rng.range(0, 240),
        vx: (rng() - 0.5) * 4,
        vy: (rng() - 0.5) * 2,
        alive: true,
        type: rng() < 0.2 ? 'deer' : 'duck',
      });
    }

    function reset() {
      ducks = []; score = 0; time = 60; over = false;
      for (let i = 0; i < 6; i++) spawn();
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 猎物漂移 + 反弹
        ducks.forEach((d) => {
          d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > W) d.vx = -d.vx;
          if (d.y < 0 || d.y > H) d.vy = -d.vy;
        });
        if (rng() < 0.02) spawn();
        // 时间递减（固定 dt = 1/60）
        time -= 1 / 60;
        if (time <= 0) { over = true; api.emit('gameover'); return; }

        // 射击：a 边沿 → 击中屏幕中点（替代鼠标点击的简化策略）
        if (input.pressed.a) {
          api.emit('shoot');
          // [no-mouse-yet] 简化为击中所有 alive 鸭子中的随机一个
          const alive = ducks.filter((d) => d.alive);
          if (alive.length > 0) {
            const target = alive[rng.int(alive.length)];
            target.alive = false;
            score += target.type === 'deer' ? 20 : 10;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, 80);
        ducks.forEach((d) => {
          if (!d.alive) return;
          ctx.fillStyle = d.type === 'deer' ? '#884400' : '#ffffff';
          ctx.fillRect(d.x - 12, d.y - 8, 24, 16);
        });
        ctx.fillStyle = '#000'; ctx.font = '18px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`TIME ${Math.ceil(time)}`, 10, 10);
        ctx.fillText(`SCORE ${score}`, W - 100, 10);
      },
      serialize() { return { score, time: Math.ceil(time), alive: ducks.filter((d) => d.alive).length, over }; },
    };
  },
};