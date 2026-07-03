/* ============================================================
   games/jetpack.js — 喷气背包（action）
   - 原版 games-extra.js:1650 — 按住向上飞，控制高度
   - 输入：a held 推进（向上推力）
   - 决定论：管道生成 / 高度 / 重力由固定 dt 与 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'jetpack',
    name: '喷气背包',
    desc: '按住向上飞，控制高度',
    icon: '🚀',
    cat: 'action',
    controls: '空格/点击 推进 · 撞到刺就完',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let player, walls, score, over;

    function reset() {
      player = { x: 60, y: 240, vy: 0 };
      walls = []; score = 0; over = false;
    }

    function spawn() {
      walls.push({ x: W, top: 30 + rng.range(0, 200), gap: 120 + rng.range(0, 40) });
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 推进：a held
        if (input.held.a) player.vy = -5; else player.vy += 0.4;
        player.y += player.vy;
        score++;
        if (rng() < 0.02) spawn();
        walls.forEach((w) => { w.x -= 3; });
        walls = walls.filter((w) => w.x > -40);
        // 碰撞
        let dead = false;
        walls.forEach((w) => {
          if (player.x + 12 > w.x && player.x < w.x + 30) {
            if (player.y < w.top || player.y > w.top + w.gap) dead = true;
          }
        });
        if (player.y < 0 || player.y > H) dead = true;
        if (dead) { over = true; api.emit('gameover'); return; }
      },
      render(ctx) {
        ctx.fillStyle = '#001a33'; ctx.fillRect(0, 0, W, H);
        walls.forEach((w) => {
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(w.x, 0, 30, w.top);
          ctx.fillRect(w.x, w.top + w.gap, 30, H);
        });
        ctx.fillStyle = '#ffaa00'; ctx.fillRect(player.x - 4, player.y - 8, 8, 16);
        if (input && input.held && input.held.a) {
          ctx.fillStyle = '#ff8800';
          for (let i = 0; i < 3; i++) ctx.fillRect(player.x - 4, player.y + 8 + i * 4, 8, 2);
        }
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${Math.floor(score / 10)}M`, 8, 8);
      },
      serialize() { return { score, y: player.y, over }; },
    };
  },
};