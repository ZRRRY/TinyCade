/* ============================================================
   games/shooter.js — 飞机大战（arcade，竖版弹幕）
   - 原版 games.js:1753 — 玩家挡板 + 敌机 + 子弹 + 道具
   - 输入：left/right/up/down 移动 · a (空格) 射击
   - 决定论：敌机生成概率由 rng 控制；粒子位置也来自 rng。
   ============================================================ */

export default {
  meta: {
    id: 'shooter',
    name: '飞机大战',
    desc: '竖版射击，躲避弹幕击落敌机',
    icon: '✈️',
    cat: 'arcade',
    controls: '← → ↑ ↓ 移动 · 空格射击 · 收集道具',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 600;
    let player, bullets, enemies, eBullets, particles, powerups, score, lives, over, invuln, frame = 0;
    function spawnEnemy() {
      const r = rng();
      if (r < 0.7) {
        enemies.push({ x: 20 + rng() * (W - 60), y: -30, w: 28, h: 28, hp: 1, type: 0, vy: 2 + rng() * 2 });
      } else if (r < 0.9) {
        enemies.push({ x: 20 + rng() * (W - 60), y: -30, w: 32, h: 32, hp: 2, type: 1, vy: 1.5, fire: 0 });
      } else {
        enemies.push({ x: 20 + rng() * (W - 80), y: -40, w: 48, h: 48, hp: 8, type: 2, vy: 0.8 });
      }
    }
    function reset() {
      player = { x: W / 2, y: H - 60, w: 32, h: 32, power: 1 };
      bullets = []; enemies = []; eBullets = []; particles = []; powerups = [];
      score = 0; lives = 3; over = false; invuln = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return over; },
      update(input) {
        frame++;
        if (input.held.left) player.x = Math.max(20, player.x - 5);
        if (input.held.right) player.x = Math.min(W - 20, player.x + 5);
        if (input.held.up) player.y = Math.max(20, player.y - 5);
        if (input.held.down) player.y = Math.min(H - 20, player.y + 5);
        if (over) return;
        if (input.pressed.a) {
          if (player.power === 1) bullets.push({ x: player.x, y: player.y - 16 });
          else if (player.power === 2) { bullets.push({ x: player.x - 8, y: player.y - 10 }); bullets.push({ x: player.x + 8, y: player.y - 10 }); }
          else { bullets.push({ x: player.x, y: player.y - 16 }); bullets.push({ x: player.x - 12, y: player.y - 8 }); bullets.push({ x: player.x + 12, y: player.y - 8 }); }
          api.emit('shoot');
        }
        bullets.forEach((b) => { b.y -= 8; });
        bullets = bullets.filter((b) => b.y > -10);
        eBullets.forEach((b) => { b.y += b.vy || 4; });
        eBullets = eBullets.filter((b) => b.y < H + 10);
        if (rng() < 0.03 + score / 5000) spawnEnemy();
        enemies.forEach((e) => {
          e.y += e.vy;
          if (e.fire !== undefined) {
            e.fire = (e.fire + 1) % 60;
            if (e.fire === 0) eBullets.push({ x: e.x, y: e.y + e.h, vy: 5 });
          }
        });
        enemies = enemies.filter((e) => e.y < H + 60);
        bullets.forEach((b) => enemies.forEach((e) => {
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.hp--; b.dead = true;
            if (e.hp <= 0) {
              e.dead = true; score += e.type === 2 ? 200 : e.type === 1 ? 50 : 20; api.emit('explode');
              for (let i = 0; i < 8; i++) particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: (rng() - 0.5) * 4, vy: (rng() - 0.5) * 4, life: 20, color: e.type === 2 ? '#ff00ff' : '#ff8800' });
              if (rng() < 0.2) powerups.push({ x: e.x + e.w / 2, y: e.y, vy: 2, type: rng() < 0.5 ? 'power' : 'life' });
            }
          }
        }));
        bullets = bullets.filter((b) => !b.dead);
        enemies = enemies.filter((e) => !e.dead);
        if (!invuln) {
          eBullets.forEach((b) => {
            if (b.x > player.x - 16 && b.x < player.x + 16 && b.y > player.y - 16 && b.y < player.y + 16) {
              b.dead = true; lives--; api.emit('hit'); invuln = 60;
              for (let i = 0; i < 12; i++) particles.push({ x: player.x, y: player.y, vx: (rng() - 0.5) * 6, vy: (rng() - 0.5) * 6, life: 30, color: '#ff0066' });
              if (lives <= 0) { over = true; api.emit('gameover'); }
            }
          });
          enemies.forEach((e) => {
            if (e.x < player.x + 16 && e.x + e.w > player.x - 16 && e.y < player.y + 16 && e.y + e.h > player.y - 16) {
              e.dead = true; lives--; invuln = 60; api.emit('hit');
              if (lives <= 0) { over = true; api.emit('gameover'); }
            }
          });
        }
        eBullets = eBullets.filter((b) => !b.dead);
        enemies = enemies.filter((e) => !e.dead);
        powerups.forEach((p) => {
          p.y += p.vy;
          if (Math.abs(p.x - player.x) < 20 && Math.abs(p.y - player.y) < 20) {
            p.dead = true;
            if (p.type === 'power') { player.power = Math.min(3, player.power + 1); api.emit('powerup'); }
            else { lives = Math.min(5, lives + 1); api.emit('eat'); }
          }
        });
        powerups = powerups.filter((p) => !p.dead && p.y < H + 20);
        particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life--; });
        particles = particles.filter((p) => p.life > 0);
        if (invuln > 0) invuln--;
      },
      render(ctx) {
        const t = frame;
        ctx.fillStyle = '#0a0033'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1a0050';
        for (let y = -50 + (t % 50); y < H; y += 50) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 30; i++) { const sx = (i * 73 + t * 0.5) % W, sy = (i * 113 + t) % H; ctx.fillRect(sx, sy, 2, 2); }
        if (!invuln || Math.floor(invuln / 4) % 2) {
          ctx.fillStyle = '#00ffff'; ctx.fillRect(player.x - 16, player.y - 12, 32, 24);
          ctx.fillStyle = '#fff'; ctx.fillRect(player.x - 8, player.y - 16, 16, 8);
          ctx.fillStyle = '#00ff66'; ctx.fillRect(player.x - 4, player.y + 12, 4, 4); ctx.fillRect(player.x, player.y + 12, 4, 4);
        }
        ctx.fillStyle = '#ffff00'; bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 12));
        enemies.forEach((e) => {
          if (e.type === 2) ctx.fillStyle = '#ff00ff';
          else if (e.type === 1) ctx.fillStyle = '#ff8800';
          else ctx.fillStyle = '#ff0066';
          ctx.fillRect(e.x + 4, e.y, e.w - 8, e.h);
          ctx.fillRect(e.x, e.y + 8, e.w, e.h - 16);
          if (e.type === 2) { ctx.fillStyle = '#fff'; ctx.fillRect(e.x + e.w / 2 - 4, e.y + 10, 8, 8); }
        });
        ctx.fillStyle = '#ff8800'; eBullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
        particles.forEach((p) => { ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
        ctx.globalAlpha = 1;
        powerups.forEach((p) => {
          ctx.fillStyle = p.type === 'power' ? '#ffff00' : '#00ff66';
          ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
          ctx.fillStyle = '#000'; ctx.font = '10px VT323'; ctx.textAlign = 'center';
          ctx.fillText(p.type === 'power' ? 'P' : '+', p.x, p.y - 6);
        });
        ctx.fillStyle = '#fff'; ctx.font = '12px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 10, 10);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES ${lives}`, W - 10, 10);
      },
      serialize() { return { score, lives, power: player.power, frame, over }; },
    };
  },
};
