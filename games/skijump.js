/* ============================================================
   games/skijump.js — 跳台滑雪（arcade）
   - 原版 games-extra.js:1101 — 按 a 蓄力 + 释放跳
   - 阶段：charge（蓄力）→ fly（飞行）→ land（落地）
   - 决定论：物理 + 蓄力由 frame 累加, 不使用非种子 API
   ============================================================ */

export default {
  meta: {
    id: 'skijump',
    name: '跳台滑雪',
    desc: '把握角度与速度飞最远',
    icon: '🎿',
    cat: 'arcade',
    controls: '按住蓄力 · 松开跳跃 · 飞行中 ←→ 调整',
    width: 480,
    height: 360,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 360;
    let phase, power, skier, vx, vy, dist, frame = 0;
    let prevA = false;

    function reset() {
      phase = 'charge'; power = 0; skier = { x: 60, y: 250 };
      vx = 0; vy = 0; dist = 0; prevA = false;
    }
    function jump() {
      if (phase === 'charge') {
        phase = 'fly';
        vx = 3 + power * 5; vy = -4 - power * 3;
        api.emit('swoosh');
      }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; },
      update(input) {
        frame++;
        if (phase === 'charge') {
          // 蓄力: a held 时递增, released 触发 jump
          if (input.held.a) power = Math.min(1, power + 0.02);
          if (input.pressed.a === false && input.held.a === false && power > 0) {
            // 边沿释放 (a 从 held 变为 false)
            if (prevA) jump();
          }
          prevA = input.held.a;
        } else if (phase === 'fly') {
          if (input.held.left) vx -= 0.05;
          if (input.held.right) vx += 0.05;
          vy += 0.2; skier.x += vx; skier.y += vy;
          if (skier.x > dist) dist = skier.x;
          if (skier.y > 350) { phase = 'land'; api.emit('hit'); }
        } else if (phase === 'land') {
          // 落地后: 按 a 重置
          if (input.pressed.a) reset();
        }
      },
      render(ctx) {
        ctx.fillStyle = '#aaccff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 280, W, 80);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, 100, 80);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 280, 100, 5);
        if (phase === 'charge') {
          ctx.fillStyle = '#000'; ctx.fillRect(skier.x - 6, skier.y, 12, 24);
          ctx.fillStyle = `rgb(${Math.floor(255 * power)}, 0, 0)`;
          ctx.fillRect(60, 320, 200 * power, 16);
        }
        if (phase === 'fly' || phase === 'land') {
          ctx.fillStyle = '#000'; ctx.save();
          ctx.translate(skier.x, skier.y);
          ctx.rotate(Math.atan2(vy, vx));
          ctx.fillRect(-6, -12, 12, 24);
          ctx.restore();
        }
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        const hud = (phase === 'fly' || phase === 'land') ? `${Math.floor(dist - 60)}M` : 'CHARGE';
        ctx.fillText(hud, 8, 8);
      },
      serialize() { return { phase, power, dist, frame, over: false }; },
    };
  },
};
