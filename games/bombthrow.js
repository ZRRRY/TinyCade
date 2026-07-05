/* ============================================================
   games/bombthrow.js — 投炸弹（action）
   - 原版 games-extra.js:1890 — 向远处坦克投炸弹
   - 输入：left/right 调角度 · up/down 调力度 · a 边沿发射
   - 决定论：纯物理模拟，无随机生成
   ============================================================ */

export default {
  meta: {
    id: 'bombthrow',
    name: '投炸弹',
    desc: '向远处坦克投炸弹',
    icon: '💣',
    cat: 'action',
    controls: '← → 调整角度 · ↑ ↓ 调整力度 · 空格投',
    width: 480,
    height: 320,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 480, H = 320;
    let angle, power, bombs, tanks, score, over;

    function reset() {
      angle = -Math.PI / 3;
      power = 7;
      bombs = []; tanks = [];
      score = 0; over = false;
      for (let i = 0; i < 3; i++) tanks.push({ x: 300 + i * 60, y: 270, w: 30, h: 20, alive: true });
    }

    function fire() {
      bombs.push({ x: 50, y: 260, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power });
      api.emit('drop');
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) angle = Math.max(-Math.PI / 2, angle - 0.05);
        if (input.held.right) angle = Math.min(0, angle + 0.05);
        if (input.held.up) power = Math.min(12, power + 0.2);
        if (input.held.down) power = Math.max(2, power - 0.2);
        if (input.pressed.a) fire();

        bombs.forEach((b) => { b.vy += 0.2; b.x += b.vx; b.y += b.vy; });
        bombs = bombs.filter((b) => b.y < H + 20);

        for (let bi = bombs.length - 1; bi >= 0; bi--) {
          const b = bombs[bi];
          for (const t of tanks) {
            if (t.alive && b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) {
              t.alive = false; bombs.splice(bi, 1); score += 20; api.emit('explode');
              break;
            }
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 290, W, 30);
        ctx.fillStyle = '#444'; ctx.fillRect(40, 250, 20, 40);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(50, 260);
        ctx.lineTo(50 + Math.cos(angle) * 30, 260 + Math.sin(angle) * 30); ctx.stroke();
        tanks.forEach((t) => {
          if (t.alive) {
            ctx.fillStyle = '#006400'; ctx.fillRect(t.x, t.y, t.w, t.h);
            ctx.fillRect(t.x + 12, t.y - 10, 6, 12);
          }
        });
        ctx.fillStyle = '#000';
        bombs.forEach((b) => {
          ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, angle, power, over }; },
    };
  },
};