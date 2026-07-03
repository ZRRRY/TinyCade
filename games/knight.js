/* ============================================================
   games/knight.js — 骑士（action）
   - 原版 games-extra.js:1608 — 挥剑斩龙，躲避火焰
   - 输入：left/right 移动 · a 边沿挥剑
   - 决定论：火焰生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'knight',
    name: '骑士',
    desc: '挥剑斩龙，躲避火焰',
    icon: '🛡️',
    cat: 'action',
    controls: '← → 移动 · 空格挥剑',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 480, H = 320, GROUND = 280;
    let knight, dragon, fires, score, slash, over;

    function reset() {
      knight = { x: 100 };
      dragon = { x: 380, y: 100, hp: 5 };
      fires = []; score = 0; slash = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (slash > 0) slash--;
        // 移动：方向键 held
        if (input.held.left) knight.x -= 20;
        if (input.held.right) knight.x += 20;
        knight.x = Math.max(20, Math.min(200, knight.x));

        // 挥剑
        if (input.pressed.a) { slash = 10; api.emit('swoosh'); }

        // 火焰生成
        if (rng() < 0.02) fires.push({ x: dragon.x - 20, y: dragon.y + 30, vx: -3 - rng.range(0, 1), vy: 0 });
        fires.forEach((f) => { f.x += f.vx; });
        fires = fires.filter((f) => f.x > -20);

        // 火焰命中
        let dead = false;
        fires.forEach((f) => {
          if (Math.abs(f.x - knight.x) < 20 && Math.abs(f.y - (GROUND - 20)) < 30) {
            api.emit('hit'); dead = true;
          }
        });
        if (dead) { over = true; return; }

        // 斩龙
        if (slash > 0 && Math.abs(knight.x + 30 - dragon.x) < 40) {
          dragon.hp--; score += 10; api.emit('hit');
          if (dragon.hp <= 0) { over = true; api.emit('win'); return; }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#1a0033'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#444'; ctx.fillRect(0, GROUND, W, 40);
        ctx.fillStyle = '#0000ff'; ctx.fillRect(knight.x - 10, GROUND - 30, 20, 30);
        if (slash > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(knight.x + 10, GROUND - 30, 30, 4); }
        ctx.fillStyle = '#ff0000'; ctx.fillRect(dragon.x - 30, dragon.y, 60, 30);
        ctx.fillStyle = '#ffaa00';
        fires.forEach((f) => {
          ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score} | HP ${dragon.hp}`, 8, 8);
      },
      serialize() { return { score, x: knight.x, hp: dragon.hp, over }; },
    };
  },
};