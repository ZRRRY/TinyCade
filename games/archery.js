/* ============================================================
   games/archery.js — 射箭(casual)
   BTN.a 按住蓄力 (held 计帧数), 松开发射.
   ============================================================ */

export default {
  meta: {
    id: 'archery',
    name: '射箭',
    desc: '点击时机蓄力射箭',
    icon: '🏹',
    cat: 'casual',
    controls: 'BTN.a 按住蓄力 · 松开射箭 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 400, CX = 320, CY = 200;
    let power, holding, hits, shots, arrows, over, frame = 0;

    function reset() {
      power = 0; holding = false; hits = 0; shots = 0; arrows = []; over = false;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return shots >= 10; },
      update(input) {
        const p = input.pressed, h = input.held;
        if (p.b) { reset(); return; }
        if (shots >= 10) { over = true; return; }
        if (p.a) { holding = true; power = 0; }
        if (holding && h.a) {
          power = Math.min(120, power + 2);
        }
        if (!h.a && holding) {
          // shoot
          arrows.push({ x: 50, y: 210, vx: 8, vy: -power / 5 + 1 });
          api.emit('shoot');
          holding = false; power = 0; shots++;
        }
        // 箭物理
        for (const a of arrows) {
          a.x += a.vx; a.y += a.vy; a.vy += 0.1;
          if (a.x > 0 && a.x < W && Math.abs(a.x - CX) < 80 && Math.abs(a.y - CY) < 80) {
            const d = Math.hypot(a.x - CX, a.y - CY);
            if (d < 20) hits += 3;
            else if (d < 40) hits += 2;
            else hits++;
            api.emit('hit');
            a.x = -1000; // remove
          }
          if (a.x > W) a.x = -1000;
        }
        arrows = arrows.filter((a) => a.x > -100);
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 300, W, 100);
        // 靶
        for (let r = 80; r > 0; r -= 20) {
          ctx.fillStyle = r % 40 === 0 ? '#ff0066' : '#000';
          ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(CX, CY, 20, 0, Math.PI * 2); ctx.fill();
        // 箭
        for (const a of arrows) {
          ctx.fillStyle = '#884400'; ctx.fillRect(a.x - 8, a.y, 16, 2);
        }
        // 蓄力
        if (holding) ctx.fillStyle = '#fff', ctx.fillRect(50, 300 - power, 50, power);
        ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`HITS ${hits} | ${shots}/10`, 4, 18);
      },
      serialize() { return { power, hits, shots, holding }; },
    };
  },
};
