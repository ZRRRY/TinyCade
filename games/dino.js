/* ============================================================
   games/dino.js — 恐龙跳 DINO（arcade）
   - 原版 games-extra.js:8 — 横版跑酷，跳跃躲避仙人掌
   - 输入：a (空格/上箭头) 跳跃；b (下箭头) 蹲；start 重开
   - 决定论：云位置 / 障碍物生成都用 rng；score 由 tick 计。
   ============================================================ */

export default {
  meta: {
    id: 'dino',
    name: '恐龙跳',
    desc: '像素小恐龙跳过仙人掌',
    icon: '🦖',
    cat: 'arcade',
    controls: '空格/上箭头 跳跃 · 下蹲躲避飞行物',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 240, GROUND = 200;
    let dino, obs, cloud, score, speed, duck, over, frame = 0;
    function reset() {
      dino = { x: 60, y: GROUND - 40, vy: 0, h: 40, w: 36 };
      obs = []; cloud = [];
      for (let i = 0; i < 3; i++) cloud.push({ x: rng() * W, y: 30 + rng() * 60 });
      score = 0; speed = 5; duck = false; over = false;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return over; },
      update(input) {
        frame++;
        if (input.pressed.a) {
          if (dino.y >= GROUND - dino.h) { dino.vy = -12; api.emit('jump'); }
        }
        if (input.held.b) duck = true; else duck = false;
        if (over) return;
        dino.vy += 0.6; dino.y += dino.vy;
        if (dino.y > GROUND - dino.h) { dino.y = GROUND - dino.h; dino.vy = 0; }
        if (score > 0 && score % 80 === 0) speed += 0.4;
        score++;
        if (score % 60 === 0) {
          const tall = rng() < 0.3;
          obs.push({ x: W, w: 12 + Math.floor(rng() * 10), h: tall ? 48 : 28, fly: rng() < 0.2 && score > 50 });
        }
        obs.forEach((o) => { o.x -= speed; });
        obs = obs.filter((o) => o.x + o.w > 0);
        cloud.forEach((c) => { c.x -= speed * 0.3; });
        cloud.forEach((c) => { if (c.x < -20) { c.x = W + 20; c.y = 30 + rng() * 60; } });
        const me = { x: dino.x, y: dino.y, w: dino.w, h: duck ? 24 : dino.h };
        for (const o of obs) {
          const oy = o.h >= 36 && o.fly ? GROUND - 70 : GROUND - o.h;
          if (me.x < o.x + o.w && me.x + me.w > o.x && me.y < oy + o.h && me.y + me.h > oy) {
            over = true; api.emit('gameover'); return;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#888'; cloud.forEach((c) => { ctx.fillRect(c.x, c.y, 30, 6); ctx.fillRect(c.x + 8, c.y - 4, 14, 4); });
        ctx.fillStyle = '#000';
        ctx.fillRect(0, GROUND, W, 2);
        ctx.fillRect(dino.x + 4, dino.y + 8, 8, 8);
        ctx.fillRect(dino.x + 12, dino.y, 12, 8);
        ctx.fillRect(dino.x + 20, dino.y + 8, 8, 8);
        ctx.fillRect(dino.x + 28, dino.y + 16, 8, 8);
        ctx.fillRect(dino.x, dino.y + 24, 8, 16);
        if (!duck) ctx.fillRect(dino.x, dino.y + 8, 4, 8);
        obs.forEach((o) => {
          ctx.fillStyle = '#000';
          if (o.h >= 36 && !o.fly) {
            ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
            ctx.fillRect(o.x - 2, GROUND - o.h - 4, 4, 4);
          } else { ctx.fillRect(o.x, GROUND - o.h, o.w, o.h); }
        });
        ctx.fillStyle = '#888'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText('SCORE ' + score, W - 120, 8);
        ctx.fillText('HI 0', W - 120, 26);
      },
      serialize() { return { score, over }; },
    };
  },
};
