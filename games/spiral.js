/* ============================================================
   games/spiral.js — 螺旋 SPIRAL（arcade）
   - 原版 games-extra.js:902 — 点击时机反弹螺旋
   - 输入：a (空格/点击) 反弹
   - 60s 时间限制。每次撞到自己 = 死亡（lives=3）。
   ============================================================ */

export default {
  meta: {
    id: 'spiral',
    name: '螺旋',
    desc: '点击时机反弹出螺旋',
    icon: '🌀',
    cat: 'arcade',
    controls: '点击/空格 跳跃 · 别撞自己',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let ball, trail, score, lives, timeLeft, frame = 0;
    function reset() {
      ball = { x: W / 2, y: H / 2, vx: 3, vy: 0, r: 6 };
      trail = []; score = 0; lives = 3;
      timeLeft = 60 * 60;
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
        if (isOver()) return;
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x < 0 || ball.x > W) ball.vx *= -1;
        if (ball.y < 0 || ball.y > H) ball.vy *= -1;
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 200) trail.shift();
        for (let i = 0; i < trail.length - 20; i++) {
          if (Math.abs(trail[i].x - ball.x) < 6 && Math.abs(trail[i].y - ball.y) < 6) {
            lives--; api.emit('hit');
            if (lives <= 0) api.emit('gameover');
            ball.x = W / 2; ball.y = H / 2; ball.vx = 3; ball.vy = 0; trail = [];
            return;
          }
        }
        if (input.pressed.a) { ball.vy = -ball.vy; api.emit('jump'); }
        score++;
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#0a002a'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < trail.length; i++) {
          ctx.fillStyle = `hsl(${(i * 5) % 360}, 80%, 50%)`;
          ctx.fillRect(trail[i].x - 2, trail[i].y - 2, 4, 4);
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText('SCORE ' + score + '  LIVES ' + lives, 6, 24);
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, over: this.over }; },
    };
  },
};
