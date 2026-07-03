/* ============================================================
   games/path.js — 路径规划（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2929 — 6 个点一笔画连接
   - 演示模式：BTN.a 自动按 rng 顺序把点连入 path 直到全连。
   ============================================================ */

export default {
  meta: {
    id: 'path',
    name: '路径规划',
    desc: '一笔画连所有点',
    icon: '✏️',
    cat: 'puzzle',
    controls: '拖动连接所有点',
  },
  tickHz: 10,

  create(rng, api) {
    let points, path, over, win, tickFrame;
    function reset() {
      points = [];
      for (let i = 0; i < 6; i++) points.push({ x: 50 + rng.range(0, 260), y: 50 + rng.range(0, 260) });
      path = []; over = false; win = false; tickFrame = 0;
    }
    function step() {
      if (path.length === points.length) return;
      const remain = points.filter((p) => !path.includes(p));
      if (!remain.length) return;
      const next = remain[rng.int(remain.length)];
      path.push(next);
      if (path.length === points.length) { win = true; over = true; api.emit('win'); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) step();
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, 400, 400);
        for (let i = 0; i < path.length - 1; i++) {
          ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(path[i].x + 20, path[i].y + 20);
          ctx.lineTo(path[i + 1].x + 20, path[i + 1].y + 20);
          ctx.stroke();
        }
        points.forEach((p) => {
          ctx.fillStyle = '#ff0';
          ctx.beginPath(); ctx.arc(p.x + 20, p.y + 20, 8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${path.length}/${points.length}${win ? ' · WIN' : ''}`, 10, 8);
      },
      serialize() { return { pathLen: path.length, total: points.length, win, over }; },
    };
  },
};