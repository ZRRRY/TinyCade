/* ============================================================
   games/glider.js — 滑翔机（action）
   - 原版 games-extra.js:1847 — 滑翔下降，穿越狭道
   - 输入：left/right 微调方向
   - 决定论：墙体生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'glider',
    name: '滑翔机',
    desc: '滑翔下降，穿越狭道',
    icon: '🪂',
    cat: 'action',
    controls: '← → 微调方向 · 持续下降',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let glider, walls, vy, over;

    function reset() {
      glider = { x: 180, y: 60 };
      walls = []; vy = 1.5; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) glider.x -= 3;
        if (input.held.right) glider.x += 3;
        glider.y += vy;

        // 生成墙体
        if (rng() < 0.02) walls.push({ x: rng.range(0, W - 80), y: -50, w: 60 + rng.range(0, 60), h: 16 });
        walls.forEach((w) => { w.y += vy; });
        walls = walls.filter((w) => w.y < H + 30);

        // 碰撞
        let dead = false;
        walls.forEach((w) => {
          if (glider.x + 20 > w.x && glider.x < w.x + w.w &&
              glider.y + 4 > w.y && glider.y - 4 < w.y + w.h) dead = true;
        });
        if (dead) { over = true; api.emit('gameover'); return; }
        if (glider.y > H) { over = true; api.emit('win'); return; }
      },
      render(ctx) {
        ctx.fillStyle = '#aaccff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44';
        walls.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));
        ctx.fillStyle = '#ff0000'; ctx.fillRect(glider.x, glider.y - 4, 20, 8);
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`ALT ${Math.floor((H - glider.y) / 10)}`, 8, 8);
      },
      serialize() { return { x: glider.x, y: glider.y, over }; },
    };
  },
};