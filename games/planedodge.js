/* ============================================================
   games/planedodge.js — 飞机躲避（arcade）
   - 原版 games-extra.js:997 — ↑↓ 上下移动, 墙间隙穿过
   - 输入：up/down 移动, 自动前进
   - 决定论：墙生成由 rng 控制
   ============================================================ */

export default {
  meta: {
    id: 'planedodge',
    name: '飞机躲避',
    desc: '驾驶纸飞机躲避障碍',
    icon: '✈️',
    cat: 'arcade',
    controls: '↑↓ 上升下降 · 越久越快',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let plane, walls, score, speed, over, frame = 0;

    function reset() {
      plane = { y: H / 2, x: 60 };
      walls = []; score = 0; speed = 3; over = false;
    }
    function hit() {
      const pw = 30, ph = 12;
      for (const w of walls) {
        if (w.x < plane.x + pw / 2 && w.x + 30 > plane.x - pw / 2) {
          if (plane.y - ph / 2 < w.gapY || plane.y + ph / 2 > w.gapY + w.gap) return true;
        }
      }
      return false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (over) return;
        if (input.held.up) plane.y -= 4;
        if (input.held.down) plane.y += 4;
        plane.y = Math.max(10, Math.min(H - 10, plane.y));
        score++;
        frame++;
        if (score % 100 === 0) speed += 0.3;
        if (score % 50 === 0) {
          const gap = 100 + rng() * 60;
          walls.push({ x: W, gapY: 50 + rng() * (H - gap - 100), gap });
        }
        walls.forEach((w) => { w.x -= speed; });
        walls = walls.filter((w) => w.x > -40);
        if (hit()) { over = true; api.emit('gameover'); }
      },
      render(ctx) {
        ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, H - 30, W, 30);
        ctx.fillStyle = '#444';
        walls.forEach((w) => {
          ctx.fillRect(w.x, 0, 30, w.gapY);
          ctx.fillRect(w.x, w.gapY + w.gap, 30, H);
        });
        ctx.fillStyle = '#fff'; ctx.fillRect(plane.x - 15, plane.y - 6, 30, 12);
        ctx.fillStyle = '#000'; ctx.fillRect(plane.x - 5, plane.y - 2, 4, 4);
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, speed, y: plane.y, frame, over }; },
    };
  },
};
