/* ============================================================
   games/dots.js — 点连线(策略类)
   5 个随机点. 鼠标拖拽 → 用 BTN 替代: 4方向键移光标, BTN.a 添加 path 点.
   [no-mouse-yet]
   ============================================================ */

export default {
  meta: {
    id: 'dots',
    name: '点连线',
    desc: '用一笔画连接所有点',
    icon: '🟢',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 添加点 · BTN.select 撤销 · BTN.b 重开',
    width: 360,
    height: 360,
  },
  tickHz: 10,

  create(rng, api) {
    const W = 360, H = 360;
    let points, path, done, cursor, frame = 0;

    function reset() {
      points = [];
      for (let i = 0; i < 5; i++) {
        points.push({ x: 60 + rng.int(240), y: 60 + rng.int(240) });
      }
      path = []; done = false; cursor = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return done; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (done) return;
        if (p.left && cursor > 0) cursor--;
        else if (p.right && cursor < points.length - 1) cursor++;
        if (p.select && path.length) path.pop();
        if (p.a) {
          const cur = points[cursor];
          if (!path.length || path[path.length - 1] !== cur) {
            if (!path.length || isAdjacent(path[path.length - 1], cur)) {
              path.push(cur);
              if (path.length === points.length && !done) { done = true; api.emit('win'); }
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a002a'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < path.length - 1; i++) {
          ctx.strokeStyle = done ? '#00ff00' : '#ff00ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(path[i].x, path[i].y);
          ctx.lineTo(path[i + 1].x, path[i + 1].y);
          ctx.stroke();
        }
        points.forEach((p, i) => {
          ctx.fillStyle = i === cursor ? '#ff0' : '#00ffff';
          ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        });
      },
      serialize() { return { points, path: [...path], done, cursor }; },
    };
  },
};

function isAdjacent(a, b) {
  // 简单:距离 < 80 即视为可连接
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d < 80;
}
