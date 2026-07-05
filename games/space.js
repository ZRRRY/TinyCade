/* ============================================================
   games/space.js — 太空侵略者（arcade）
   - 原版 games.js:1530 — 经典 1978 街机，5 排敌人
   - 输入：left/right 移动 · a (z/space) 射击 · start 暂停
   - 决定论：敌人随机射击概率由 rng 控制，不使用日期 API。
   ============================================================ */

export default {
  meta: {
    id: 'space',
    name: '太空侵略者',
    desc: '左右移动射击外星人，1978 年街机经典',
    icon: '👾',
    cat: 'arcade',
    controls: '← → 移动 · 空格射击 · P 暂停',
    width: 480,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 480;
    let player, bullets, enemies, eBullets, score, lives, level, dir, over, paused, frame = 0;
    function spawnEnemies() {
      enemies = [];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 8; c++)
          enemies.push({ x: 60 + c * 50, y: 60 + r * 40, w: 32, h: 24, type: r, alive: true });
      dir = 1;
    }
    function reset() {
      player = { x: W / 2, y: H - 40 };
      bullets = []; enemies = []; eBullets = [];
      score = 0; lives = 3; level = 1; over = false; paused = false;
      spawnEnemies();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return over; },
      update(input) {
        frame++;
        if (input.pressed.start) { paused = !paused; }
        if (paused || over) return;
        if (input.held.left) player.x = Math.max(20, player.x - 5);
        if (input.held.right) player.x = Math.min(W - 20, player.x + 5);
        if (input.pressed.a && bullets.length < 3) {
          bullets.push({ x: player.x, y: player.y - 12 });
          api.emit('shoot');
        }
        bullets.forEach((b) => { b.y -= 6; });
        bullets = bullets.filter((b) => b.y > 0);
        eBullets.forEach((b) => { b.y += 4; });
        eBullets = eBullets.filter((b) => b.y < H);
        let hitEdge = false;
        enemies.forEach((e) => { if (e.alive && (e.x <= 10 || e.x + e.w >= W - 10)) hitEdge = true; });
        if (hitEdge) { dir *= -1; enemies.forEach((e) => e.y += 16); }
        enemies.forEach((e) => { if (e.alive) e.x += dir * (1 + level * 0.3); });
        bullets.forEach((b) => enemies.forEach((e) => {
          if (e.alive && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.alive = false; b.dead = true;
            score += (5 - e.type) * 10; api.emit('explode');
            if (enemies.every((en) => !en.alive)) {
              level++; spawnEnemies(); api.emit('powerup');
            }
          }
        }));
        bullets = bullets.filter((b) => !b.dead);
        const alive = enemies.filter((e) => e.alive);
        if (alive.length && rng() < 0.02 + level * 0.01) {
          const e = alive[rng.int(alive.length)];
          eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h });
        }
        eBullets.forEach((b) => {
          if (b.x > player.x - 20 && b.x < player.x + 20 && b.y > player.y - 15 && b.y < player.y + 15) {
            b.dead = true; lives--; api.emit('hit');
            if (lives <= 0) { over = true; api.emit('gameover'); }
          }
        });
        eBullets = eBullets.filter((b) => !b.dead);
        if (alive.some((e) => e.y + e.h > H - 50)) { over = true; api.emit('gameover'); }
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // 星
        for (let i = 0; i < 50; i++) {
          const x = (i * 37) % W, y = (i * 73) % H;
          ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 3) * 0.3})`;
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(player.x - 16, player.y, 32, 16);
        ctx.fillRect(player.x - 8, player.y - 8, 16, 8);
        ctx.fillRect(player.x - 4, player.y - 12, 8, 4);
        const colors = ['#ff00ff', '#ff0066', '#ff6600', '#ffff00', '#00ffff'];
        enemies.forEach((e) => {
          if (!e.alive) return;
          ctx.fillStyle = colors[e.type];
          ctx.fillRect(e.x + 8, e.y, 16, 8);
          ctx.fillRect(e.x + 4, e.y + 8, 24, 8);
          ctx.fillRect(e.x, e.y + 16, 32, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(e.x + 8, e.y + 12, 4, 4);
          ctx.fillRect(e.x + 20, e.y + 12, 4, 4);
        });
        ctx.fillStyle = '#ffff00';
        bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y, 4, 12));
        ctx.fillStyle = '#ff0066';
        eBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y, 4, 12));
        ctx.fillStyle = '#ffff00'; ctx.font = '12px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 10, 10);
        ctx.fillStyle = '#00ff66'; ctx.textAlign = 'right';
        ctx.fillText(`LIVES ${lives}`, W - 10, 10);
        ctx.fillStyle = '#ff00ff'; ctx.textAlign = 'center';
        ctx.fillText(`LV ${level}`, W / 2, 10);
      },
      serialize() { return { score, lives, level, frame, over }; },
    };
  },
};
