/* ============================================================
   games/stacker.js — 叠叠乐 STACKER（arcade）
   - 原版 games-extra.js:805 — 移动方块对齐堆叠
   - 输入：a (空格/点击) 停止移动方块
   - 堆到顶部 / 方块完全错位即结束。
   ============================================================ */

export default {
  meta: {
    id: 'stacker',
    name: '叠叠乐',
    desc: '移动方块对齐堆叠，对齐越多分越高',
    icon: '📚',
    cat: 'arcade',
    controls: '空格/点击 停止移动的方块',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let stack, current, dir, speed, score, timeLeft, frame = 0;
    function reset() {
      stack = [{ x: 130, y: H - 30, w: 100, h: 20 }];
      current = { x: 0, y: H - 50, w: 100, h: 20 };
      dir = 1; speed = 4; score = 1;
      timeLeft = 60 * 60;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function drop() {
      const top = stack[stack.length - 1];
      const overlap = Math.max(0, Math.min(current.x + current.w, top.x + top.w) - Math.max(current.x, top.x));
      if (overlap === 0) { api.emit('gameover'); reset(); return; }
      if (overlap < top.w) api.emit('hit');
      const nx = Math.max(current.x, top.x);
      const ny = top.y - 20;
      stack.push({ x: nx, y: ny, w: overlap, h: 20 });
      current = { x: 0, y: ny - 20, w: overlap, h: 20 };
      speed += 0.3;
      if (stack.length > score) { score = stack.length; api.emit('blip'); }
      if (current.y < 0) { api.emit('win'); reset(); }
    }
    function isOver() { return score >= 12 || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (this.over) return;
        current.x += dir * speed;
        if (current.x < 0 || current.x + current.w > W) dir = -dir;
        if (input.pressed.a) drop();
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000020'; ctx.fillRect(0, 0, W, H);
        stack.forEach((s, i) => { ctx.fillStyle = `hsl(${i * 20}, 80%, 50%)`; ctx.fillRect(s.x, s.y, s.w, s.h); });
        ctx.fillStyle = '#00ffff'; ctx.fillRect(current.x, current.y, current.w, current.h);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
        ctx.fillText('HEIGHT ' + score + '  TIME ' + Math.ceil(timeLeft / 60), 6, 14);
      },
      serialize() { return { score, timeLeft, over: this.over }; },
    };
  },
};
