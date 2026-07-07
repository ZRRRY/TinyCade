/* ============================================================
   games/platformer.js — 平台跳跃（action）
   - 原版 games-extra.js:1381 — 横版平台动作
   - 输入：left/right 移动 · up/space 边沿跳跃（着地时）
   - 决定论：金币 / 敌人位置由 rng 初始化；物理用固定 dt（每次 update 一格）
   ============================================================ */

export default {
  meta: {
    id: 'platformer',
    name: '平台跳跃',
    desc: '经典横版平台动作',
    icon: '🏃',
    cat: 'action',
    controls: '← → 移动 · ↑ 跳跃 · 收集金币',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320, TILE = 20;
    let cam, player, vy, coins, enemies, platforms, score, over;

    function reset() {
      cam = 0;
      player = { x: 50, y: 200, w: 16, h: 24, vx: 0 };
      vy = 0;
      coins = []; enemies = []; platforms = []; score = 0; over = false;
      for (let i = 0; i < 8; i++) platforms.push({ x: i * 100, y: 280, w: 80, h: 12 });
      for (let i = 0; i < 20; i++) coins.push({ x: 100 + i * 50 + rng.range(0, 30), y: 150 + rng.range(0, 100) });
      for (let i = 0; i < 4; i++) enemies.push({ x: 300 + i * 200, y: 256, w: 16, h: 24, vx: 1 });
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (over) return;
        // 移动
        player.vx = (input.held.right ? 3 : 0) - (input.held.left ? 3 : 0);
        // 跳跃：up/space 边沿
        if ((input.pressed.up || input.pressed.space) && vy === 0) { vy = -10; api.emit('jump'); }
        vy += 0.5;
        player.x += player.vx;
        player.y += vy;

        // 摄像机
        if (player.x > cam + W / 2) cam = player.x - W / 2;
        if (player.x < cam) player.x = cam;

        // 平台碰撞（从上落到平台顶）
        platforms.forEach((p) => {
          if (player.x + player.w > p.x && player.x < p.x + p.w &&
              player.y + player.h >= p.y && player.y + player.h < p.y + p.h + 10 &&
              vy >= 0) {
            player.y = p.y - player.h;
            vy = 0;
          }
        });

        // 金币
        for (let i = coins.length - 1; i >= 0; i--) {
          const c = coins[i];
          if (Math.abs(c.x - player.x) < 14 && Math.abs(c.y - player.y) < 14) {
            coins.splice(i, 1); score += 5; api.emit('blip');
          }
        }

        // 敌人
        enemies.forEach((e) => {
          e.x += e.vx;
          if (e.x < cam || e.x > cam + W) e.vx = -e.vx;
          if (Math.abs(e.x - player.x) < 16 && Math.abs(e.y - player.y) < 24) {
            api.emit('hit'); over = true;
          }
        });
        if (over) return;

        if (player.y > H) { api.emit('gameover'); over = true; }
      },
      render(ctx) {
        ctx.fillStyle = '#88ccff'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(-cam, 0);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(cam, 300, W, 20);
        ctx.fillStyle = '#884400';
        platforms.forEach((p) => ctx.fillRect(p.x, p.y, p.w, p.h));
        ctx.fillStyle = '#ffaa00';
        coins.forEach((c) => {
          ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#ff0066';
        enemies.forEach((e) => ctx.fillRect(e.x, e.y, e.w, e.h));
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.restore();
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: player.x, y: player.y, over }; },
    };
  },
};