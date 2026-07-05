/* ============================================================
   games/mazeball.js — 旋转迷宫（arcade）
   - 原版 games-extra.js:1047 — 倾斜迷宫让小球到目标
   - 输入：方向键持续倾斜（左/右给 gx, 上/下给 gy）
   - 决定论：固定墙壁, 球物理由 vx/vy 推进
   ============================================================ */

export default {
  meta: {
    id: 'mazeball',
    name: '旋转迷宫',
    desc: '倾斜迷宫让小球到达目标',
    icon: '🧭',
    cat: 'arcade',
    controls: '方向键/WASD 倾斜 · 球到金色方块',
    width: 360,
    height: 360,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 360;
    const WALLS = [
      [0, 0, 360, 8], [0, 0, 8, 360], [0, 352, 360, 8], [352, 0, 8, 360],
      [50, 50, 80, 8], [50, 50, 8, 80], [170, 30, 8, 80], [170, 30, 80, 8],
      [50, 170, 80, 8], [50, 170, 8, 80], [170, 150, 8, 80], [170, 150, 80, 8],
      [270, 50, 8, 150], [110, 250, 140, 8], [50, 290, 8, 40],
    ];
    let ball, goal, gx, gy, score, frame = 0;

    function reset() {
      ball = { x: 30, y: 30, vx: 0, vy: 0, r: 6 };
      goal = { x: 320, y: 320 };
      gx = 0; gy = 0; score = 0;
    }
    function hitWall(x, y) {
      for (const w of WALLS) {
        if (x + 6 > w[0] && x - 6 < w[0] + w[2] && y + 6 > w[1] && y - 6 < w[1] + w[3]) return true;
      }
      return false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; }, // 到达目标后重置, 不结束
      update(input) {
        // 持续倾斜: 按住时给重力
        gx = (input.held.left || input.held.a) ? -1 : (input.held.right || input.held.d) ? 1 : 0;
        gy = (input.held.up || input.held.b) ? -1 : (input.held.down) ? 1 : 0;
        ball.vx += gx * 0.15; ball.vy += gy * 0.15;
        ball.vx *= 0.95; ball.vy *= 0.95;
        if (!hitWall(ball.x + ball.vx, ball.y)) ball.x += ball.vx; else ball.vx = 0;
        if (!hitWall(ball.x, ball.y + ball.vy)) ball.y += ball.vy; else ball.vy = 0;
        frame++;
        if (Math.abs(ball.x - goal.x) < 12 && Math.abs(ball.y - goal.y) < 12) {
          score++; api.emit('win'); reset();
        }
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#666'; WALLS.forEach((w) => ctx.fillRect(w[0], w[1], w[2], w[3]));
        ctx.fillStyle = '#ffaa00'; ctx.fillRect(goal.x - 8, goal.y - 8, 16, 16);
        ctx.fillStyle = '#00ffff';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x: ball.x, y: ball.y, frame, over: false }; },
    };
  },
};
