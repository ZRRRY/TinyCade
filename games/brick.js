/* ============================================================
   games/brick.js — 砖块射手 BRICK SHOOTER（arcade）
   - 原版 games-extra.js:855 — 底部炮台射击顶部砖块
   - 输入：left/right 移动；a (空格) 射击
   - 90s 时间限制；lives=3，掉球 (砖到底) 失一命。
   ============================================================ */

export default {
  meta: {
    id: 'brick',
    name: '砖块射手',
    desc: '底部炮台射击顶部砖块',
    icon: '🧱',
    cat: 'arcade',
    controls: '← → 移动 · 空格射击 · 鼠标瞄准',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let paddle, balls, bricks, score, lives, timeLeft, frame = 0;
    function reset() {
      paddle = { x: 150, y: 440, w: 60, h: 10 };
      balls = [{ x: 180, y: 430, vx: 2, vy: -3 }];
      bricks = [];
      score = 0; lives = 3;
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 8; c++)
          bricks.push({ x: c * 45, y: r * 22, w: 42, h: 18, c: ['#ff00ff', '#00ffff', '#ffff00', '#88ff00', '#ff8800', '#ff0066'][r], alive: true });
      timeLeft = 90 * 60;
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
        if (input.held.left) paddle.x = Math.max(0, paddle.x - 15);
        if (input.held.right) paddle.x = Math.min(W - paddle.w, paddle.x + 15);
        if (input.pressed.a) {
          balls.push({ x: paddle.x + paddle.w / 2, y: paddle.y - 5, vx: 2, vy: -3 });
          api.emit('shoot');
        }
        if (isOver()) return;
        balls.forEach((b) => {
          b.x += b.vx; b.y += b.vy;
          if (b.x < 0 || b.x > W) b.vx *= -1;
          if (b.y < 0) b.vy *= -1;
          if (b.y > H) { b.x = 180; b.y = 430; b.vx = 2; b.vy = -3; api.emit('hit'); lives--; if (lives <= 0) return; }
        });
        balls.forEach((b) => {
          if (b.x > paddle.x && b.x < paddle.x + paddle.w && b.y > paddle.y && b.y < paddle.y + paddle.h) {
            b.vy = -Math.abs(b.vy); api.emit('blip');
          }
        });
        bricks.forEach((br, i) => {
          balls.forEach((b) => {
            if (b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) {
              b.vy *= -1; bricks.splice(i, 1); score += 10; api.emit('hit');
            }
          });
        });
        if (bricks.length === 0) { api.emit('win'); reset(); }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000010'; ctx.fillRect(0, 0, W, H);
        bricks.forEach((b) => { ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h); });
        ctx.fillStyle = '#00ffff'; ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
        ctx.fillStyle = '#ffaa00'; balls.forEach((b) => ctx.fillRect(b.x - 4, b.y - 4, 8, 8));
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, over: this.over }; },
    };
  },
};
