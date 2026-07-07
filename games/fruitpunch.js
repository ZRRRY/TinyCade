/* ============================================================
   games/fruitpunch.js — 水果拳（action）
   - 原版 games-extra.js:1935 — 限时点击出现的圆形
   - 输入：a 边沿击中屏幕中点附近所有 target [no-mouse-yet]
   - 决定论：圆形生成 / 倒计时由 rng 与 tick 推进
   ============================================================ */

export default {
  meta: {
    id: 'fruitpunch',
    name: '水果拳',
    desc: '按时点击出现的圆形',
    icon: '🥊',
    cat: 'action',
    controls: 'A/空格 击中 · 越中心分越高',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 400;
    let targets, score, t, over;

    function reset() {
      targets = []; score = 0; t = 30; over = false;
    }

    function spawn() {
      targets.push({ x: 40 + rng.range(0, 320), y: 40 + rng.range(0, 320), r: 30, life: 60 });
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (over) return;
        targets.forEach((tg) => tg.life--);
        targets = targets.filter((tg) => tg.life > 0);
        if (rng() < 0.05) spawn();
        t -= 1 / 60;
        if (t <= 0 && !over) { over = true; api.emit('gameover'); return; }

        // 击中：a 边沿，击中屏幕中心附近的圆 [no-mouse-yet]
        if (input.pressed.a) {
          api.emit('hit');
          const cx = W / 2, cy = H / 2;
          for (let i = targets.length - 1; i >= 0; i--) {
            const tg = targets[i];
            if (Math.abs(tg.x - cx) < tg.r && Math.abs(tg.y - cy) < tg.r) {
              const dist = Math.sqrt((tg.x - cx) ** 2 + (tg.y - cy) ** 2);
              score += Math.max(1, 10 - Math.floor(dist / 4));
              targets.splice(i, 1);
            }
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#1a0033'; ctx.fillRect(0, 0, W, H);
        targets.forEach((tg) => {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ff0';
          ctx.beginPath(); ctx.arc(tg.x, tg.y, 6, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#fff'; ctx.font = '18px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`TIME ${Math.ceil(t)}`, 10, 10);
      },
      serialize() { return { score, t: Math.ceil(t), over }; },
    };
  },
};