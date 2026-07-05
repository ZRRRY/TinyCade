/* ============================================================
   games/balldrop.js — 弹珠下落（arcade）
   - 原版 games-extra.js:948 — 8 个落点槽, 按 a 发射
   - 输入：BTN.a 发射 · left/right 移动发射器
   - 决定论：vx 由 rng 生成, 落点算 idx
   ============================================================ */

export default {
  meta: {
    id: 'balldrop',
    name: '弹珠下落',
    desc: '点击发射弹珠到下方目标',
    icon: '🔮',
    cat: 'arcade',
    controls: '←→ 移动 · 空格/点击 发射弹珠 · 落点决定得分',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    const ZONES = [100, 50, 20, 80, 200, 50, 20, 100];
    let ball, x, score, over, frame = 0;

    function fire() {
      if (!ball) {
        ball = { x, y: 40, vy: 0, vx: (rng() - 0.5) * 0.5 };
        api.emit('shoot');
      }
    }
    function reset() { ball = null; x = W / 2; score = 0; over = false; }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.held.left) x = Math.max(0, x - 4);
        if (input.held.right) x = Math.min(W, x + 4);
        if (input.pressed.a) fire();
        if (ball) {
          ball.vy += 0.15; ball.y += ball.vy; ball.x += ball.vx;
          if (ball.x < 0 || ball.x > W) { ball = null; frame++; return; }
          if (ball.y > 400) {
            const idx = Math.max(0, Math.min(ZONES.length - 1, Math.floor(ball.x / (W / ZONES.length))));
            score += ZONES[idx];
            api.emit('blip');
            ball = null;
            frame++;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < ZONES.length; i++) {
          ctx.fillStyle = `hsl(${i * 45}, 60%, 50%)`;
          ctx.fillRect(i * (W / ZONES.length), 400, W / ZONES.length, 80);
          ctx.fillStyle = '#fff';
          ctx.font = '12px VT323, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(String(ZONES[i]), i * (W / ZONES.length) + (W / ZONES.length) / 2, 444);
        }
        if (!ball) {
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, 30, 8, 12);
          ctx.fillStyle = '#ff0'; ctx.fillRect(x - 6, 42, 12, 2);
        } else {
          ctx.fillStyle = '#ff0';
          ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, x, frame, over }; },
    };
  },
};
