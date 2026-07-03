/* ============================================================
   games/timing.js — 时机点击(casual)
   指针转圈. BTN.a 在绿区加分. 角度由 frame 决定.
   ============================================================ */

export default {
  meta: {
    id: 'timing',
    name: '时机点击',
    desc: '指针转一圈 · 时机越准分越高',
    icon: '⏱️',
    cat: 'casual',
    controls: 'BTN.a 停在绿区 · BTN.b 重开',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 400, CX = 200, CY = 200;
    let angle, score, frame = 0;

    function reset() {
      angle = 0; score = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        angle += 0.05;
        if (p.a) {
          const greenA = -Math.PI / 2;
          const diff = Math.abs(angle - greenA) % (Math.PI * 2);
          if (diff < 0.3 || Math.PI * 2 - diff < 0.3) { score += 10; api.emit('win'); }
          else api.emit('deny');
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, 180, 0, Math.PI * 2); ctx.stroke();
        // 绿区
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(CX, CY, 180, -Math.PI / 2, -Math.PI / 2 + 0.3);
        ctx.lineTo(CX, CY);
        ctx.fill();
        // 指针
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -180); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#00ffff'; ctx.font = '30px VT323'; ctx.textAlign = 'center';
        ctx.fillText(`SCORE ${score}`, CX, 350);
      },
      serialize() { return { score, angle }; },
    };
  },
};
