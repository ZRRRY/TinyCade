/* ============================================================
   games/dart.js — 飞镖(casual)
   靶子. [no-mouse-yet]: BTN.a 投,半径随机.
   ============================================================ */

export default {
  meta: {
    id: 'dart',
    name: '飞镖',
    desc: '投掷飞镖命中靶心',
    icon: '🎯',
    cat: 'casual',
    controls: 'BTN.a 投掷 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const W = 400, H = 400, CX = 200, CY = 200;
    let score, shots, over, frame = 0;

    function reset() {
      score = 0; shots = 0; over = false;
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
        if (shots >= 10) { over = true; return; }
        if (p.a && shots < 10) {
          // 随机半径 (rng)
          const d = rng.int(100);
          let pts;
          if (d < 20) pts = 100;
          else if (d < 40) pts = 50;
          else if (d < 60) pts = 30;
          else if (d < 80) pts = 20;
          else if (d < 100) pts = 10;
          else pts = 0;
          score += pts; shots++;
          api.emit('hit');
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        for (let r = 100; r > 0; r -= 20) {
          ctx.fillStyle = r % 40 === 0 ? '#ff0066' : '#000';
          ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(CX, CY, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score} | ${shots}/10`, 4, 18);
        if (shots >= 10) {
          ctx.fillStyle = '#fff'; ctx.font = '24px VT323'; ctx.textAlign = 'center';
          ctx.fillText(`FINAL ${score}`, W / 2, H - 30);
        }
      },
      serialize() { return { score, shots, over }; },
    };
  },
};
