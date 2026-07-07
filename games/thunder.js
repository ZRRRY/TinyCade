/* ============================================================
   games/thunder.js — 雷电（action）
   - 原版 games-extra.js:2149 — 驾驶战机穿越弹幕
   - 输入：方向键移动 · a 边沿射击
   - 决定论：敌人生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'thunder',
    name: '雷电',
    desc: '驾驶战机穿越弹幕',
    icon: '⚡',
    cat: 'action',
    controls: '方向键移动 · 空格射击',
    width: 360,
    height: 480,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 360, H = 480;
    let ship, bullets, enemies, score, over;

    function reset() {
      ship = { x: 180, y: 400 };
      bullets = []; enemies = []; score = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) ship.x -= 10;
        if (input.held.right) ship.x += 10;
        if (input.held.up) ship.y -= 10;
        if (input.held.down) ship.y += 10;
        ship.x = Math.max(0, Math.min(340, ship.x));
        ship.y = Math.max(0, Math.min(460, ship.y));

        if (input.pressed.a) {
          bullets.push({ x: ship.x, y: ship.y - 8 });
          api.emit('shoot');
        }

        // 敌人生成
        if (rng() < 0.05) enemies.push({ x: rng.range(0, 320), y: -20, vy: 2, alive: true });
        bullets.forEach((b) => { b.y -= 7; });
        enemies.forEach((e) => { e.y += e.vy; });
        bullets = bullets.filter((b) => b.y > 0);
        enemies = enemies.filter((e) => e.y < H);

        // 命中
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          const b = bullets[bi];
          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            if (e.alive && Math.abs(b.x - e.x) < 14 && Math.abs(b.y - e.y) < 14) {
              e.alive = false; bullets.splice(bi, 1); score += 20; api.emit('hit');
              break;
            }
          }
        }
        enemies = enemies.filter((e) => e.alive);

        // 撞机
        let dead = false;
        enemies.forEach((e) => {
          if (Math.abs(e.x - ship.x) < 16 && Math.abs(e.y - ship.y) < 16) dead = true;
        });
        if (dead) { over = true; api.emit('gameover'); return; }
      },
      render(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff';
        enemies.forEach((e) => ctx.fillRect(e.x - 10, e.y - 10, 20, 20));
        ctx.fillStyle = '#00ffff'; ctx.fillRect(ship.x - 12, ship.y - 8, 24, 16);
        ctx.fillStyle = '#ff0';
        bullets.forEach((b) => ctx.fillRect(b.x - 1, b.y - 4, 2, 8));
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: ship.x, y: ship.y, over }; },
    };
  },
};