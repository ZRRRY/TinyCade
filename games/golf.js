/* ============================================================
   games/golf.js — 高尔夫(策略类)
   [no-mouse-yet]: 用 BTN.a 全力度朝洞方向推球. 简化.
   ============================================================ */

export default {
  meta: {
    id: 'golf',
    name: '高尔夫',
    desc: '把球推进洞',
    icon: '⛳',
    cat: 'strategy',
    controls: '方向键调方向 · BTN.a 按住蓄力 · 松开射击 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const W = 400, H = 480;
    let ball, hole, walls, shots, power, charging, dir, over, frame = 0;

    function reset() {
      ball = { x: 30, y: 240, vx: 0, vy: 0 };
      hole = { x: 370, y: 240, r: 12 };
      walls = [
        { x: 100, y: 100, w: 200, h: 8 },
        { x: 100, y: 380, w: 200, h: 8 },
      ];
      shots = 0; power = 0; charging = false; dir = 0; over = false; // 0=右, 1=上右, 2=上, 3=上左, 4=左, 5=下左, 6=下, 7=下右
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed, h = input.held;
        if (p.b) { reset(); return; }
        if (charging) {
          power = Math.min(60, power + 1);
          if (!h.a) {
            // 释放
            const ang = (dir * Math.PI) / 4;
            ball.vx = -Math.cos(ang) * power / 10;
            ball.vy = Math.sin(ang) * power / 10;
            charging = false; power = 0;
            shots++; api.emit('hit');
          }
        } else {
          if (p.a) { charging = true; power = 0; }
          if (p.left) dir = (dir + 7) % 8;
          else if (p.right) dir = (dir + 1) % 8;
        }
        // 移动
        if (ball.vx || ball.vy) {
          ball.x += ball.vx; ball.y += ball.vy;
          ball.vx *= 0.95; ball.vy *= 0.95;
          if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
          if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
          // 墙碰撞
          for (const w of walls) {
            if (ball.x + 6 > w.x && ball.x - 6 < w.x + w.w && ball.y + 6 > w.y && ball.y - 6 < w.y + w.h) {
              ball.vx = 0; ball.vy = 0; api.emit('hit');
            }
          }
          // 进球
          if (Math.abs(ball.x - hole.x) < 10 && Math.abs(ball.y - hole.y) < 10) {
            api.emit('win');
            over = true;
          }
          // 出界重置
          if (ball.x < 0 || ball.x > W || ball.y < 0 || ball.y > H) {
            ball.x = 30; ball.y = 240; ball.vx = ball.vy = 0;
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#666';
        walls.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2); ctx.fill();
        if (charging) {
          // 蓄力指示条
          ctx.fillStyle = '#fff';
          ctx.fillRect(50, 380 + 60 - power, 50, power);
          // 方向箭头
          const cx = 200, cy = 420; const len = 30;
          const ang = (dir * Math.PI) / 4;
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx - Math.cos(ang) * len, cy + Math.sin(ang) * len);
          ctx.stroke();
        }
        ctx.fillStyle = '#000'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`SHOTS ${shots}`, 4, 18);
      },
      serialize() { return { ball: { ...ball }, shots, over, charging, power, dir }; },
    };
  },
};
