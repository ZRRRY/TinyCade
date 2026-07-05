/* ============================================================
   games/breakout.js — 打砖块（arcade）
   - 原版 games.js:1655 — 6 行 × 10 列砖块，挡板接球
   - 输入：left/right 移动 · a (空格) 发射球
   - 决定论：挡板碰撞角度由球位置计算，无随机；球初始方向由 a 时刻 rng。
   ============================================================ */

export default {
  meta: {
    id: 'breakout',
    name: '打砖块',
    desc: '弹球打砖块，1976 年雅达利经典',
    icon: '🧱',
    cat: 'arcade',
    controls: '← → 移动挡板 · 空格发射球 · 不让球落地',
    width: 480,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 480;
    let paddle, ball, bricks, score, lives, over, win, attached;
    function buildBricks() {
      bricks = [];
      const colors = ['#ff0066', '#ff8800', '#ffff00', '#00ff66', '#00ffff'];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 10; c++)
          bricks.push({ x: c * 48, y: 50 + r * 24, w: 46, h: 22, color: colors[r % colors.length], alive: true });
    }
    function reset() {
      paddle = { x: W / 2, y: H - 30, w: 80 };
      ball = { x: W / 2, y: H - 50, vx: 0, vy: 0 };
      attached = true;
      score = 0; lives = 3; over = false; win = false;
      buildBricks();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) paddle.x = Math.max(paddle.w / 2, paddle.x - 8);
        if (input.held.right) paddle.x = Math.min(W - paddle.w / 2, paddle.x + 8);
        if (input.pressed.a && attached) {
          ball.vx = (rng() - 0.5) * 4; ball.vy = -5; attached = false;
          api.emit('shoot');
        }
        if (over) return;
        if (attached) { ball.x = paddle.x; ball.y = paddle.y - 10; return; }
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x < 4 || ball.x > W - 4) ball.vx *= -1;
        if (ball.y < 4) ball.vy *= -1;
        if (ball.y > paddle.y - 8 && ball.y < paddle.y + 8 &&
            ball.x > paddle.x - paddle.w / 2 && ball.x < paddle.x + paddle.w / 2) {
          ball.vy = -Math.abs(ball.vy);
          const hit = (ball.x - paddle.x) / (paddle.w / 2);
          ball.vx = hit * 5;
          api.emit('blip');
        }
        bricks.forEach((b) => {
          if (!b.alive) return;
          if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
            b.alive = false; ball.vy *= -1; score += 10; api.emit('hit');
          }
        });
        if (ball.y > H) {
          lives--; api.emit('gameover');
          if (lives <= 0) { over = true; api.emit('gameover'); }
          else { attached = true; ball.x = paddle.x; ball.y = paddle.y - 10; ball.vx = ball.vy = 0; }
        }
        if (bricks.every((b) => !b.alive)) { win = true; over = true; api.emit('win'); }
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00ffff'; ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, 8);
        ctx.fillStyle = '#00aaaa'; ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(ball.x - 4, ball.y - 4, 8, 8);
        bricks.forEach((b) => {
          if (!b.alive) return;
          ctx.fillStyle = b.color; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 3);
        });
        ctx.fillStyle = '#ffff00'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 10, 10);
        ctx.fillStyle = '#ff00ff'; ctx.textAlign = 'right';
        ctx.fillText(`LIVES ${lives}`, W - 10, 10);
      },
      serialize() { return { score, lives, bricksAlive: bricks.filter((b) => b.alive).length, over, win }; },
    };
  },
};
