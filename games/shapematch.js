/* ============================================================
   games/shapematch.js — 形状匹配（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2618 — 拖拽形状到对应阴影
   - [no-mouse-yet]：演示模式 — BTN.a 循环尝试每个形状到下一个目标；
     成功就 +10 并生成新目标。
   ============================================================ */

export default {
  meta: {
    id: 'shapematch',
    name: '形状匹配',
    desc: '选择正确形状填到阴影中',
    icon: '🔷',
    cat: 'puzzle',
    controls: '点击形状拖到对应阴影',
  },
  tickHz: 5,

  create(rng, api) {
    const SHAPES = ['square', 'circle', 'triangle', 'diamond'];
    let targets, current, score, tickFrame, over;
    function reset() {
      targets = [];
      for (let i = 0; i < 3; i++) targets.push({ x: 30 + i * 110, y: 200, type: SHAPES[rng.int(SHAPES.length)] });
      current = { type: SHAPES[rng.int(SHAPES.length)], idx: 0 };
      score = 0; over = false; tickFrame = 0;
    }
    function tryMatch() {
      if (!targets.length) return;
      // 当前持有的形状应独立于目标，仅按 A 时与目标比较
      const i = current.idx % targets.length;
      const t = targets[i];
      if (t.type === current.type) {
        score += 10;
        api.emit('win');
        targets.splice(i, 1);
        if (!targets.length) { reset(); return; }
        current.type = SHAPES[rng.int(SHAPES.length)];
        current.idx = 0;
      } else {
        api.emit('deny');
        // 跳到下一个目标，持有的形状不变
        current.idx = (current.idx + 1) % targets.length;
      }
    }
    function drawShape(ctx, x, y, t, filled) {
      ctx.fillStyle = filled ? '#00ff00' : 'rgba(255,255,255,0.1)';
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
      if (t === 'square') { ctx.beginPath(); ctx.rect(x, y, 40, 40); if (filled) ctx.fill(); ctx.stroke(); }
      if (t === 'circle') { ctx.beginPath(); ctx.arc(x + 20, y + 20, 20, 0, Math.PI * 2); if (filled) ctx.fill(); ctx.stroke(); }
      if (t === 'triangle') {
        ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x, y + 40); ctx.lineTo(x + 40, y + 40); ctx.closePath();
        if (filled) ctx.fill(); ctx.stroke();
      }
      if (t === 'diamond') {
        ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x + 20, y + 40); ctx.lineTo(x, y + 20); ctx.closePath();
        if (filled) ctx.fill(); ctx.stroke();
      }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) tryMatch();
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        targets.forEach((t) => drawShape(ctx, t.x, t.y, t.type, false));
        drawShape(ctx, 50, 350, current.type, true);
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score} · type=${current.type}`, 10, 10);
      },
      serialize() { return { score, current: current.type, remain: targets.length }; },
    };
  },
};