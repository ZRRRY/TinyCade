/* ============================================================
   games/asteroids.js — 小行星 ASTEROIDS（arcade）
   - 原版 games-extra.js:194 — 飞船射击 + 旋转 + 推进
   - 输入：left/right 旋转 · up 推进 · a 射击
   - 60 秒时间限制；lives=3，碰撞到 rock 损失一条命。
   ============================================================ */

export default {
  meta: {
    id: 'asteroids',
    name: '小行星',
    desc: '驾驶飞船射击小行星，惯性漂移',
    icon: '☄️',
    cat: 'arcade',
    controls: '←→ 旋转 · ↑ 推进 · 空格射击',
    width: 480,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 480;
    let ship, rocks, bullets, score, lives, timeLeft, frame = 0;
    function spawnRock(size, x, y) {
      let ex, ey;
      if (x === undefined) {
        const e = rng.int(4);
        if (e === 0) { ex = 0; ey = rng() * H; }
        else if (e === 1) { ex = W; ey = rng() * H; }
        else if (e === 2) { ex = rng() * W; ey = 0; }
        else { ex = rng() * W; ey = H; }
      } else {
        ex = x; ey = y;
      }
      const ax = ship ? ship.x - ex : W / 2 - ex;
      const ay = ship ? ship.y - ey : H / 2 - ey;
      const a = Math.atan2(ay, ax);
      rocks.push({ x: ex, y: ey, vx: Math.cos(a) * 1, vy: Math.sin(a) * 1, r: size, size, rot: 0 });
    }
    function reset() {
      ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
      rocks = []; bullets = []; score = 0; lives = 3; timeLeft = 60 * 60;
      for (let i = 0; i < 5; i++) spawnRock(40);
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return lives <= 0 || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        if (input.held.left) ship.a -= 0.1;
        if (input.held.right) ship.a += 0.1;
        if (input.held.up) { ship.vx += Math.cos(ship.a) * 0.2; ship.vy += Math.sin(ship.a) * 0.2; }
        if (input.pressed.a && bullets.length < 5) {
          bullets.push({ x: ship.x, y: ship.y, vx: Math.cos(ship.a) * 6, vy: Math.sin(ship.a) * 6, life: 40 });
          api.emit('shoot');
        }
        ship.x = (ship.x + ship.vx + W) % W;
        ship.y = (ship.y + ship.vy + H) % H;
        ship.vx *= 0.99; ship.vy *= 0.99;
        rocks.forEach((r) => {
          r.x = (r.x + r.vx + W) % W;
          r.y = (r.y + r.vy + H) % H;
          r.rot = (r.rot || 0) + 0.02;
        });
        bullets.forEach((b) => { b.x += b.vx; b.y += b.vy; b.life--; });
        bullets = bullets.filter((b) => b.life > 0);
        bullets.forEach((b) => {
          rocks.forEach((r) => {
            const dx = r.x - b.x, dy = r.y - b.y;
            if (dx * dx + dy * dy < r.r * r.r) {
              score += r.size === 40 ? 20 : (r.size === 20 ? 50 : 100);
              api.emit('explode');
              if (r.size > 15) {
                const cx = r.x, cy = r.y;
                spawnRock(r.size / 2, cx, cy); rocks[rocks.length - 1].x = cx; rocks[rocks.length - 1].y = cy;
                spawnRock(r.size / 2, cx, cy); rocks[rocks.length - 1].x = cx; rocks[rocks.length - 1].y = cy;
              }
              r.dead = true;
            }
          });
        });
        rocks = rocks.filter((r) => !r.dead);
        if (rocks.length === 0) for (let i = 0; i < 5; i++) spawnRock(40);
        let hit = false;
        rocks.forEach((r) => {
          const dx = r.x - ship.x, dy = r.y - ship.y;
          if (dx * dx + dy * dy < (r.r + 10) * (r.r + 10)) hit = true;
        });
        if (hit) { lives--; api.emit('hit'); ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0; }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        rocks.forEach((r) => {
          ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const rad = r.r * (0.7 + (i % 2) * 0.3);
            if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
            else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          }
          ctx.closePath(); ctx.stroke();
          ctx.restore();
        });
        ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -8); ctx.lineTo(-6, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ff00ff';
        bullets.forEach((b) => { ctx.fillRect(b.x - 1, b.y - 1, 3, 3); });
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, over: this.over }; },
    };
  },
};
