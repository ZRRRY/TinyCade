/* ============================================================
   games/kungfu.js — 功夫（action）
   - 原版 games-extra.js:1474 — 拳头对敌人，飞踢解决
   - 输入：方向键移动 · a 边沿拳击（atkT=10）· b 边沿踢（atkT=15）
   - 决定论：敌人生成 / 反向由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'kungfu',
    name: '功夫',
    desc: '拳头对敌人，飞踢解决',
    icon: '🥋',
    cat: 'action',
    controls: '← → 移动 · J/A 拳 · K/B 踢',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 480, H = 320;
    let me, foes, score, atkT, over;

    function reset() {
      me = { x: 80, y: 240 };
      foes = [];
      for (let i = 0; i < 3; i++) {
        foes.push({ x: 300 + i * 70, y: 240, vx: -0.5, hp: 2, t: rng.range(0, 100) });
      }
      score = 0; atkT = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 移动：方向键 held
        if (input.held.left) me.x -= 15;
        if (input.held.right) me.x += 15;
        me.x = Math.max(0, Math.min(W - 20, me.x));

        // 攻击：a 拳 (10), b 踢 (15)
        if (input.pressed.a) { atkT = 10; api.emit('swoosh'); }
        if (input.pressed.b) { atkT = 15; api.emit('swoosh'); }

        // 生成新敌人
        if (rng() < 0.02) {
          foes.push({ x: W, y: 240, vx: -0.5 - rng.range(0, 1) * 0.5, hp: 2, t: rng.range(0, 100) });
        }
        // 敌人移动 + 反向
        foes.forEach((f) => {
          f.x += f.vx; f.t++;
          if (f.t % 80 === 0) { f.vx = -f.vx; f.x = Math.max(0, Math.min(W, f.x)); }
        });
        foes = foes.filter((f) => f.x > -30);

        // 接触伤害
        foes.forEach((f) => {
          if (Math.abs(f.x - me.x) < 30) {
            api.emit('hit');
            me.x = Math.max(0, me.x - 30);
            f.x = me.x + 30;
          }
        });

        // 攻击命中
        if (atkT > 0) {
          atkT--;
          for (let i = foes.length - 1; i >= 0; i--) {
            if (Math.abs(foes[i].x - me.x) < 40) {
              foes[i].hp--;
              if (foes[i].hp <= 0) { foes.splice(i, 1); score += 10; api.emit('hit'); }
            }
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#aa4400'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, W, 40);
        ctx.fillStyle = '#0000ff'; ctx.fillRect(me.x, me.y, 20, 40);
        if (atkT > 0) { ctx.fillStyle = '#ff0'; ctx.fillRect(me.x + 20, me.y, 30, 8); }
        ctx.fillStyle = '#ff0000';
        foes.forEach((f) => ctx.fillRect(f.x, f.y, 20, 40));
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: me.x, foes: foes.length, over }; },
    };
  },
};