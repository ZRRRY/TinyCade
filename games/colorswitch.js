/* ============================================================
   games/colorswitch.js — 颜色切换 COLOR SWITCH（arcade）
   - 原版 games-extra.js:653 — 小球穿过匹配颜色的扇形
   - 输入：a (空格/点击) 跳跃
   - 90s 时间限制。跳跃时球变随机颜色 (rng)。
   ============================================================ */

export default {
  meta: {
    id: 'colorswitch',
    name: '颜色切换',
    desc: '小球穿过匹配颜色的扇形',
    icon: '🎨',
    cat: 'arcade',
    controls: '点击/空格 跳跃 · 颜色匹配才安全',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66'];
    let ball, obs, score, vy, color, timeLeft, frame = 0;
    function reset() {
      ball = { x: W / 2, y: H - 40, r: 10 };
      obs = []; score = 0; vy = 0;
      color = COLORS[0];
      timeLeft = 60 * 60;
      spawn();
    }
    function spawn() {
      const cx = W / 2, cy = H * 0.4;
      const segs = 4;
      const gap = 1;
      const arr = [];
      for (let i = 0; i < segs; i++) {
        arr.push({
          color: COLORS[i],
          a0: (i * Math.PI * 2 / segs) + (rng() * 0.3 - 0.15),
          a1: (i * Math.PI * 2 / segs) + (Math.PI * 2 / segs) - gap,
        });
      }
      obs.push({ x: cx, y: cy, r: 80, segs: arr, color: COLORS[rng.int(COLORS.length)] });
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        vy += 0.4; ball.y += vy;
        if (ball.y < H * 0.4 - 90) {
          obs.forEach((o) => { o.y += 6; });
          if (obs[0].y > H + 100) { obs.shift(); score++; spawn(); }
        }
        if (ball.y > H - 20) { ball.y = H - 20; vy = 0; }
        if (input.pressed.a) { vy = -8; color = COLORS[rng.int(COLORS.length)]; api.emit('jump'); }
        obs.forEach((o) => {
          if (Math.abs(ball.x - o.x) < o.r + 8 && Math.abs(ball.y - o.y) < o.r + 8) {
            const dx = ball.x - o.x, dy = ball.y - o.y;
            const a = Math.atan2(dy, dx); const ad = (a + Math.PI * 2) % (Math.PI * 2);
            if (Math.sqrt(dx * dx + dy * dy) > o.r - 14) {
              const seg = o.segs.find((s) => ad >= s.a0 && ad <= s.a1);
              if (!seg || seg.color !== color) { api.emit('gameover'); reset(); }
            }
          }
        });
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        obs.forEach((o) => {
          o.segs.forEach((s) => {
            ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.arc(o.x, o.y, o.r, s.a0, s.a1); ctx.closePath(); ctx.fill();
          });
        });
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText('SCORE ' + score + '  TIME ' + Math.ceil(timeLeft / 60), 6, 14);
      },
      serialize() { return { score, timeLeft, over: this.over }; },
    };
  },
};
