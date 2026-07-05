/* ============================================================
   games/duckshoot.js — 鸭子射击 DUCK SHOOT（arcade）
   - 原版 games-extra.js:709 — 鼠标点击飞行鸭子
   - 引擎抽象：a 键按下时 = 模拟单击中央偏上 (240,140) 位置。
   - 弹药 30 发，用完即结束。鸭子飞出场地 ending 也计 0 分。
   ============================================================ */

export default {
  meta: {
    id: 'duckshoot',
    name: '鸭子射击',
    desc: '经典红白机鸭子射击',
    icon: '🦆',
    cat: 'arcade',
    controls: '鼠标点击飞行鸭子 · 不能掉地',
    width: 480,
    height: 360,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 360;
    let ducks, score, ammo, timeLeft, frame = 0;
    function reset() {
      ducks = []; score = 0; ammo = 30;
      for (let i = 0; i < 5; i++) spawn();
      timeLeft = 60 * 60;
    }
    function spawn() {
      ducks.push({ x: -30, y: 50 + rng() * 200, vx: 2 + rng() * 2, vy: 0, t: rng() * 200, alive: true });
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return ammo <= 0 || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        ducks.forEach((d) => { d.x += d.vx; d.t += 0.1; d.y += Math.sin(d.t) * 1.5; });
        ducks = ducks.filter((d) => d.alive && d.x < W + 30);
        if (ducks.filter((d) => d.alive).length < 3 && rng() < 0.05) spawn();
        if (input.pressed.a) {
          if (ammo > 0) {
            ammo--;
            api.emit('shoot');
            const sx = W * 0.5, sy = H * 0.4;
            ducks.forEach((d) => {
              if (d.alive && Math.abs(d.x - sx) < 18 && Math.abs(d.y - sy) < 12) { d.alive = false; score += 10; api.emit('hit'); }
            });
          }
        }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, H - 60, W, 60);
        ducks.forEach((d) => {
          if (!d.alive) return;
          ctx.fillStyle = '#8b4513'; ctx.fillRect(d.x - 12, d.y - 6, 24, 12);
          ctx.fillStyle = '#00ff00'; ctx.fillRect(d.x - 8, d.y - 12, 16, 6);
          ctx.fillStyle = '#ffaa00'; ctx.fillRect(d.x + 10, d.y - 2, 6, 4);
        });
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
        ctx.fillText('AMMO: ' + ammo, 10, 24);
        ctx.fillText('SCORE: ' + score, 10, 44);
      },
      serialize() { return { score, ammo: Math.max(0, ammo), timeLeft, over: this.over }; },
    };
  },
};
