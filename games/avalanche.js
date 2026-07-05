/* ============================================================
   games/avalanche.js — 雪崩（arcade）
   - 原版 games-extra.js:1242 — 玩家底部左右移动, 躲上落雪球
   - 输入：left/right 移动
   - 决定论：雪球生成由 rng, 速度大小由 rng
   ============================================================ */

export default {
  meta: {
    id: 'avalanche',
    name: '雪崩',
    desc: '躲避上方的雪球',
    icon: '❄️',
    cat: 'arcade',
    controls: '←→ 移动 · 雪球越大越慢',
    width: 360,
    height: 480,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 360, H = 480;
    let player, balls, score, over, frame = 0;

    function reset() {
      player = { x: 180, y: 440 }; balls = []; score = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) player.x -= 6;
        if (input.held.right) player.x += 6;
        player.x = Math.max(10, Math.min(350, player.x));
        if (rng() < 0.05) {
          balls.push({
            x: rng() * 360, y: -20,
            r: 5 + rng() * 15,
            v: 1 + rng() * 3,
          });
        }
        balls.forEach((b) => { b.y += b.v; });
        balls = balls.filter((b) => b.y < H + 30);
        for (const b of balls) {
          if (Math.abs(b.x - player.x) < b.r + 8 && Math.abs(b.y - player.y) < b.r + 8) {
            over = true; api.emit('gameover'); return;
          }
        }
        score++; frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a33'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88ccff';
        balls.forEach((b) => {
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#ffaa00'; ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: player.x, frame, over }; },
    };
  },
};
