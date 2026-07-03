/* ============================================================
   games/bowling.js — 保龄球(casual)
   BTN.a 投球. 简单碰撞:球撞倒pin得分.
   ============================================================ */

export default {
  meta: {
    id: 'bowling',
    name: '保龄球',
    desc: '点击时机投球',
    icon: '🎳',
    cat: 'casual',
    controls: 'BTN.a 投球 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 360, H = 480;
    let ball, pins, score, frame, over, frameCount, frameNum = 0;

    function reset() {
      pins = [];
      for (let i = 0; i < 10; i++) {
        pins.push({
          x: 130 + (i % 3) * 30 + Math.floor(i / 3) * 10,
          y: 80 + Math.floor(i / 3) * 30,
          alive: true,
        });
      }
      ball = null; score = 0; frame = 0; over = false; frameCount = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (p.a && !ball) {
          ball = { x: 180, y: 440, vx: 0, vy: -12, alive: true };
          api.emit('drop');
        }
        if (ball) {
          ball.y += ball.vy; ball.x += ball.vx;
          if (ball.y < 100) ball.vy = 0;
          for (const p of pins) {
            if (p.alive && Math.abs(ball.x - p.x) < 20 && Math.abs(ball.y - p.y) < 20) {
              p.alive = false; ball.x = p.x; ball.alive = false;
            }
          }
          if (ball.y < 0 || !ball.alive) {
            const downed = pins.filter((p) => !p.alive).length;
            score += downed; api.emit('hit');
            frame++;
            if (frame >= 2) {
              pins.forEach((p) => (p.alive = true)); frame = 0;
            }
            ball = null;
          }
        }
        frameCount++; if (frameCount > 200) { over = true; }
        frameNum++;
      },
      render(ctx) {
        ctx.fillStyle = '#1a0033'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#0066ff'; ctx.fillRect(150, 400, 60, 80);
        ctx.fillStyle = '#fff';
        pins.forEach((p) => {
          if (p.alive) {
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
          }
        });
        if (ball) {
          ctx.fillStyle = '#ff8800';
          ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 10, 30);
      },
      serialize() { return { ball, pins, score, frame, over }; },
    };
  },
};
