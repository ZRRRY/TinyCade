/* ============================================================
   games/centipede.js — 蜈蚣 CENTIPEDE（arcade）
   - 原版 games-extra.js:353 — 网格射击游戏，蜈蚣分段
   - 输入：方向键 + WASD 移动；a (空格) 射击
   - 90 秒时间限制；lives=3。
   ============================================================ */

export default {
  meta: {
    id: 'centipede',
    name: '蜈蚣',
    desc: '射击分段蜈蚣，避免它的头',
    icon: '🐛',
    cat: 'arcade',
    controls: '方向键/WASD 移动 · 空格射击',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 480, CELL = 20;
    let player, centi, bullets, rocks, score, lives, timeLeft, frame = 0;
    function spawnCenti() {
      centi = []; for (let i = 0; i < 12; i++) centi.push({ x: 20 + i * 20, y: 40, dir: 1, down: false });
    }
    function reset() {
      player = { x: 200, y: 440 };
      centi = []; bullets = []; rocks = [];
      for (let i = 0; i < 30; i++) rocks.push({ x: rng.int(20) * 20, y: 100 + rng.int(17) * 20 });
      spawnCenti();
      score = 0; lives = 3; timeLeft = 90 * 30; // 90s @ 30Hz
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
        if (input.held.left) player.x = Math.max(0, Math.min(380, player.x - 20));
        if (input.held.right) player.x = Math.max(0, Math.min(380, player.x + 20));
        if (input.held.up) player.y = Math.max(0, Math.min(460, player.y - 20));
        if (input.held.down) player.y = Math.max(0, Math.min(460, player.y + 20));
        if (input.pressed.a && bullets.length < 3) {
          bullets.push({ x: player.x, y: player.y - 8 }); api.emit('shoot');
        }
        if (isOver()) return;
        player.x = Math.max(0, Math.min(380, player.x));
        player.y = Math.max(0, Math.min(460, player.y));
        if (centi.length === 0) { spawnCenti(); score += 100; }
        centi.forEach((s) => { s.x += s.dir * 2; if (s.x < 0 || s.x > 380) s.down = true; });
        centi.forEach((s) => { if (s.down) { s.y += 20; s.dir = -s.dir; s.x = Math.max(0, Math.min(380, s.x)); s.down = false; } });
        bullets.forEach((b) => { b.y -= 6; });
        bullets = bullets.filter((b) => b.y > 0);
        const hits = new Set();
        const survivingBullets = [];
        bullets.forEach((b) => {
          let hit = false;
          centi.forEach((s, si) => {
            if (!hit && !hits.has(si) && Math.abs(s.x - b.x) < 10 && Math.abs(s.y - b.y) < 10) {
              hits.add(si); hit = true; score += 10; api.emit('hit');
            }
          });
          if (!hit) survivingBullets.push(b);
        });
        bullets = survivingBullets;
        centi = centi.filter((_, i) => !hits.has(i));
        for (const s of centi) {
          if (Math.abs(s.x - player.x) < 14 && Math.abs(s.y - player.y) < 14) {
            lives--; api.emit('hit');
            if (lives <= 0) api.emit('gameover');
            break;
          }
        }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#222'; rocks.forEach((r) => ctx.fillRect(r.x, r.y, 18, 18));
        centi.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#ff00ff' : '#00ff00'; ctx.fillRect(s.x - 8, s.y - 8, 16, 16); });
        ctx.fillStyle = '#ffff00'; bullets.forEach((b) => { ctx.fillRect(b.x - 1, b.y - 4, 2, 8); });
        ctx.fillStyle = '#00ffff'; ctx.fillRect(player.x - 6, player.y - 6, 12, 12);
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, centiLen: centi.length, over: this.over }; },
    };
  },
};
