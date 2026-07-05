/* ============================================================
   games/runnerplat.js — 跑酷（action）
   - 原版 games-extra.js:1976 — 无尽跑步，跳过陷阱
   - 输入：a 边沿跳跃（双击二段跳：jumps 计数限制为 2）
   - 决定论：障碍生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'runnerplat',
    name: '跑酷',
    desc: '无尽跑步，跳过陷阱',
    icon: '🏃',
    cat: 'action',
    controls: '空格/点击 跳跃 · 双击二段跳',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480, GROUND_Y = 380;
    let player, obs, score, vy, jumps, over;

    function reset() {
      player = { x: 60, y: GROUND_Y };
      obs = []; score = 0; vy = 0; jumps = 0; over = false;
    }

    function jump() {
      if (jumps < 2) { vy = -10; jumps++; api.emit('jump'); }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (input.pressed.a) jump();

        vy += 0.6; player.y += vy;
        if (player.y > GROUND_Y) { player.y = GROUND_Y; vy = 0; jumps = 0; }

        score++;
        if (rng() < 0.02) obs.push({ x: W, y: 360, w: 20, h: 40 });
        obs.forEach((o) => { o.x -= 6; });
        obs = obs.filter((o) => o.x > -40);

        for (const o of obs) {
          if (player.x < o.x + o.w && player.x + 20 > o.x &&
              player.y < o.y + o.h && player.y + 30 > o.y) {
            api.emit('gameover'); reset(); return;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 410, W, 70);
        ctx.fillStyle = '#aa4400';
        obs.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));
        ctx.fillStyle = '#00ff00'; ctx.fillRect(player.x, player.y, 20, 30);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, y: player.y, jumps, over }; },
    };
  },
};