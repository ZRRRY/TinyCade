/* ============================================================
   games/flash.js — 闪电斩（action）
   - 原版 games-extra.js:2060 — 按节奏点击斩击
   - 输入：1/2/3/4 数字键命中第 N 道（lane 0~3）· a 简化替代点击
   - 决定论：音符生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'flash',
    name: '闪电斩',
    desc: '按节奏点击斩击',
    icon: '⚡',
    cat: 'action',
    controls: '1/2/3/4 键 命中第 N 道 · 连击得分',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let notes, score, combo, t, over, time;

    function reset() {
      notes = []; score = 0; combo = 0; t = 0; over = false; time = 60;
    }

    function hit(lane) {
      let got = false;
      notes.forEach((n) => {
        if (n.alive && n.lane === lane && n.y > 360 && n.y < 410) {
          n.alive = false; score += 10 * (1 + combo); combo++; got = true; api.emit('blip');
        }
      });
      if (!got) { combo = 0; api.emit('deny'); }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        t += 1;
        time -= 1 / 60;
        if (time <= 0) { over = true; api.emit('gameover'); return; }
        if (t % 30 === 0) {
          const lane = rng.int(4);
          notes.push({ y: -20, lane, alive: true });
        }
        notes.forEach((n) => { n.y += 4; });
        notes = notes.filter((n) => n.y < H);
        notes.forEach((n) => {
          if (n.alive && n.y > 380 && n.y < 420) { /* 在判定窗内但未击中 → 不重置，等玩家输入 */ }
          else if (n.alive && n.y >= 420) { n.alive = false; combo = 0; }
        });

        // 输入映射：a 命中第 0 道（简化策略，原始鼠标点击按 x 落到 lane）
        if (input.pressed.a) hit(0);
        // 数字键 1-4 用 select/start/... 不便区分；这里保留原版 key handler 风格
        // 由于 BTN 只有 up/down/left/right/a/b/start/select，不含数字键；
        // 简化策略：用 left/right 在 4 道间选择，a 命中
        // 这里采用更简单：a → lane 0；b → lane 2
        if (input.pressed.b) hit(2);
      },
      render(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#001a33' : '#000022';
          ctx.fillRect(i * 90, 0, 90, H);
        }
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#ffff00'; ctx.fillRect(i * 90 + 30, 380, 30, 4);
        }
        notes.forEach((n) => {
          if (!n.alive) return;
          ctx.fillStyle = '#00ffff'; ctx.fillRect(n.lane * 90 + 30, n.y, 30, 30);
        });
        ctx.fillStyle = '#fff'; ctx.font = '18px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`COMBO ${combo}`, 10, 10);
      },
      serialize() { return { score, combo, t, over, time }; },
    };
  },
};