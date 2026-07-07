/* ============================================================
   games/dash.js — 滑铲（action）
   - 原版 games-extra.js:1521 — 点击时机滑铲穿过障碍
   - 输入：a 边沿触发滑铲（按下后 20 tick 内变矮）
   - 决定论：障碍物生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'dash',
    name: '滑铲',
    desc: '点击时机滑铲穿过障碍',
    icon: '🌀',
    cat: 'action',
    controls: '点击/空格 滑铲 · 时机要准',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480, GROUND = 380;
    let player, obs, score, slideT, over;

    function reset() {
      player = { x: 80, y: GROUND - 40, h: 40, w: 24 };
      obs = []; score = 0; slideT = 0; over = false;
    }

    function slide() {
      if (slideT <= 0) { slideT = 20; api.emit('swoosh'); }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.pressed.a) slide();
        if (slideT > 0) slideT--;
        score++;

        // 生成障碍：仅 high（高 50），滑铲可躲避
        if (rng() < 0.02) { /* 原 low 障碍已移除，仅推进 rng */ }
        if (rng() < 0.015) obs.push({ x: W, y: GROUND - 70, w: 30, h: 50, t: 'high' });

        obs.forEach((o) => { o.x -= 6; });
        obs = obs.filter((o) => o.x > -40);

        const ph = slideT > 0 ? 20 : 40;
        const py = slideT > 0 ? GROUND - 20 : GROUND - 40;
        for (const o of obs) {
          if (player.x < o.x + o.w && player.x + player.w > o.x &&
              py < o.y + o.h && py + ph > o.y) {
            over = true; api.emit('gameover'); return;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, GROUND, W, 100);
        obs.forEach((o) => {
          ctx.fillStyle = o.t === 'high' ? '#aa0000' : '#aa6600';
          ctx.fillRect(o.x, o.y, o.w, o.h);
        });
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(player.x, slideT > 0 ? GROUND - 20 : GROUND - 40,
                     player.w, slideT > 0 ? 20 : 40);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${Math.floor(score / 10)}M`, 8, 8);
      },
      serialize() { return { score, slideT, x: player.x, over }; },
    };
  },
};