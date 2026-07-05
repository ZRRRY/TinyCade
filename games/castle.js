/* ============================================================
   games/castle.js — 攻城（action）
   - 原版 games-extra.js:2106 — 指挥弓箭手射击城堡
   - 输入：a 边沿放箭 [no-mouse-yet]（鼠标点击改成 a 键）
   - 决定论：箭矢抛物 / 时间递减 / 城堡 HP 由 tick + rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'castle',
    name: '攻城',
    desc: '指挥弓箭手射击城堡',
    icon: '🏰',
    cat: 'action',
    controls: 'A/空格 放箭 · 限时 90 秒',
    width: 480,
    height: 360,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 360;
    let castle, score, time, archers, over;

    function reset() {
      castle = { hp: 20 }; score = 0; time = 90; archers = [];
      over = false;
      for (let i = 0; i < 3; i++) archers.push({ x: 50 + i * 30, y: 280, vy: -8, alive: true });
    }

    function shoot() {
      archers.forEach((a) => {
        if (a.alive) {
          a.vy = -12 - rng.range(0, 4); a.alive = false;
          api.emit('shoot');
          // [no-mouse-yet] 简化为：每次射击有概率命中城堡弱点（固定位置）
          if (rng() < 0.5) {
            castle.hp--; score += 5; api.emit('hit');
            if (castle.hp <= 0) { api.emit('win'); reset(); }
          }
        }
      });
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        archers.forEach((a) => {
          a.vy += 0.4; a.y += a.vy;
          if (a.y > 350) { a.y = 350; a.vy = 0; a.alive = true; }
        });
        time -= 1 / 60;
        if (time <= 0) { api.emit('gameover'); reset(); return; }
        if (input.pressed.a) shoot();
      },
      render(ctx) {
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 320, W, 40);
        ctx.fillStyle = '#666'; ctx.fillRect(360, 160, 100, 160);
        ctx.fillStyle = '#aa4400'; ctx.fillRect(370, 180, 12, 16);
        ctx.fillStyle = '#ff0000';
        archers.forEach((a) => ctx.fillRect(a.x, a.y, 8, 16));
        ctx.fillStyle = '#ff0000'; ctx.font = '16px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`HP ${castle.hp}`, 360, 360);
        ctx.fillText(`TIME ${Math.ceil(time)}`, 10, 20);
        ctx.fillText(`SCORE ${score}`, 10, 40);
      },
      serialize() { return { score, time: Math.ceil(time), hp: castle.hp, over }; },
    };
  },
};