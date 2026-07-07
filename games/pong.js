/* ============================================================
   games/pong.js — 反弹球（arcade）
   - 原版 games.js:931 — 双挡板对打 + WASD/方向键控制
   - 输入约束（W/Up 共享 BTN.up，按 KEYMAP engine/input.js:13-17）：
     1P 控制左挡板（up/down）+ 右挡板走 AI（rng）。
   - 球反弹随机性来自注入的 rng；计分 21 分一局。
   ============================================================ */

export default {
  meta: {
    id: 'pong',
    name: '反弹球',
    desc: '经典街机，两边挡板对打',
    icon: '🏓',
    cat: 'arcade',
    controls: '↑/↓ 移动左挡板 · 右挡板由电脑控制 · 21 分一局',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    let ball, p1, p2, score1, score2, over, frame = 0;
    function newBall(dir) { ball = { x: 240, y: 160, vx: dir * 3, vy: 2 }; }
    function reset() {
      p1 = { y: 130 }; p2 = { y: 130 };
      score1 = 0; score2 = 0; over = false;
      newBall(1);
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return over; },
      update(input) {
        frame++;
        if (input.held.up) p1.y = Math.max(0, Math.min(260, p1.y - 5));
        if (input.held.down) p1.y = Math.max(0, Math.min(260, p1.y + 5));
        if (over) return;
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.y <= 4 || ball.y >= 316) ball.vy *= -1;
        if (ball.x - 4 <= 14 && ball.x + 4 >= 4 && ball.y >= p1.y && ball.y <= p1.y + 60) {
          ball.vx = Math.abs(ball.vx); ball.vy += (rng() - 0.5) * 2; api.emit('blip');
        }
        if (ball.x + 4 >= 466 && ball.x - 4 <= 476 && ball.y >= p2.y && ball.y <= p2.y + 60) {
          ball.vx = -Math.abs(ball.vx); ball.vy += (rng() - 0.5) * 2; api.emit('blip');
        }
        if (ball.x < 0) { score2++; api.emit('score'); newBall(1); }
        if (ball.x > 480) { score1++; api.emit('score'); newBall(-1); }
        ball.vy = Math.max(-6, Math.min(6, ball.vy));
        // AI: 慢慢追球中心（弱）
        if (ball.vx > 0) {
          const target = ball.y - 30;
          if (p2.y < target) p2.y = Math.min(260, p2.y + 1);
          else if (p2.y > target) p2.y = Math.max(0, p2.y - 1);
        }
        if (score1 >= 21 || score2 >= 21) { over = true; api.emit('gameover'); }
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#444'; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(240, 0); ctx.lineTo(240, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00ffff'; ctx.fillRect(4, p1.y, 10, 60);
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(466, p2.y, 10, 60);
        ctx.fillStyle = '#ffff00'; ctx.fillRect(ball.x - 4, ball.y - 4, 8, 8);
        ctx.fillStyle = '#00ffff'; ctx.font = '32px VT323'; ctx.textAlign = 'center';
        ctx.fillText(String(score1), 200, 20);
        ctx.fillStyle = '#ff00ff'; ctx.fillText(String(score2), 280, 20);
      },
      serialize() { return { score1, score2, ballY: ball.y, p1Y: p1.y, p2Y: p2.y, over }; },
    };
  },
};
