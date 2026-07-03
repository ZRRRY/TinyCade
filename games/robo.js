/* ============================================================
   games/robo.js — 机器人爆炸（action）
   - 原版 games-extra.js:1700 — 控制机器人射击敌人
   - 输入：方向键移动 · a 边沿射击
   - 决定论：敌人生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'robo',
    name: '机器人爆炸',
    desc: '控制机器人射击敌人',
    icon: '🤖',
    cat: 'action',
    controls: '方向键移动 · 空格射击',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 480;
    let robo, bullets, enemies, score, over;

    function reset() {
      robo = { x: 200, y: 420 };
      bullets = []; enemies = []; score = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) robo.x -= 15;
        if (input.held.right) robo.x += 15;
        if (input.held.up) robo.y -= 15;
        if (input.held.down) robo.y += 15;
        robo.x = Math.max(0, Math.min(W - 20, robo.x));
        robo.y = Math.max(0, Math.min(H - 20, robo.y));

        if (input.pressed.a) {
          bullets.push({ x: robo.x, y: robo.y - 10 });
          api.emit('shoot');
        }

        // 敌人生成
        if (rng() < 0.03) enemies.push({ x: rng.range(0, W), y: -20, vy: 1 + rng.range(0, 2), alive: true });

        bullets.forEach((b) => { b.y -= 6; });
        enemies.forEach((e) => { e.y += e.vy; });
        bullets = bullets.filter((b) => b.y > 0);
        enemies = enemies.filter((e) => e.y <= H);

        // 命中
        bullets.forEach((b) => {
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.alive && Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
              e.alive = false; score += 10; api.emit('hit');
              bullets.splice(bullets.indexOf(b), 1);
              break;
            }
          }
        });
        enemies = enemies.filter((e) => e.alive);

        // 撞机
        let dead = false;
        enemies.forEach((e) => {
          if (Math.abs(e.x - robo.x) < 18 && Math.abs(e.y - robo.y) < 18) dead = true;
        });
        if (dead) { over = true; api.emit('gameover'); return; }
      },
      render(ctx) {
        ctx.fillStyle = '#000022'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#888';
        enemies.forEach((e) => ctx.fillRect(e.x - 12, e.y - 12, 24, 24));
        ctx.fillStyle = '#00ff00'; ctx.fillRect(robo.x - 10, robo.y - 10, 20, 20);
        ctx.fillStyle = '#ff0';
        bullets.forEach((b) => ctx.fillRect(b.x - 1, b.y - 4, 2, 8));
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: robo.x, y: robo.y, over }; },
    };
  },
};