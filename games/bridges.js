/* ============================================================
   games/bridges.js — 造桥（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2252 — Hashiwokakero 风格
   - [no-mouse-yet]：用方向键在岛之间移动光标 + BTN.a 加桥。
   - 9 个岛屿固定布局；胜负判定：用桥数等于相邻数对解。
   ============================================================ */

export default {
  meta: {
    id: 'bridges',
    name: '造桥',
    desc: '用桥连接所有岛屿',
    icon: '🌉',
    cat: 'puzzle',
    controls: '点击两个相邻岛屿之间建桥',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 5, CELL = 70;
    const ISLANDS = [
      { x: 0, y: 0, n: 3 }, { x: 2, y: 0, n: 4 }, { x: 4, y: 0, n: 2 },
      { x: 0, y: 2, n: 3 }, { x: 2, y: 2, n: 5 }, { x: 4, y: 2, n: 3 },
      { x: 0, y: 4, n: 4 }, { x: 2, y: 4, n: 2 }, { x: 4, y: 4, n: 3 }
    ];
    let bridges, cursor, tickFrame, over;

    function reset() {
      bridges = []; cursor = 0; tickFrame = 0; over = false;
    }
    function existing(a, c) {
      return bridges.filter((b) => b.a === Math.min(a, c) && b.c === Math.max(a, c))
        .reduce((s, b) => s + b.n, 0);
    }
    function addBridge() {
      if (cursor === null) return;
      // 找到与 cursor 相邻的最近岛屿
      const me = ISLANDS[cursor];
      let nearest = -1, bestDist = Infinity;
      for (let i = 0; i < ISLANDS.length; i++) {
        if (i === cursor) continue;
        const o = ISLANDS[i];
        const dx = Math.abs(me.x - o.x), dy = Math.abs(me.y - o.y);
        if ((dx === 0 && dy > 0 && dy <= 2) || (dy === 0 && dx > 0 && dx <= 2)) {
          const d = dx + dy;
          if (d < bestDist) { bestDist = d; nearest = i; }
        }
      }
      if (nearest < 0) return;
      const cur = existing(cursor, nearest);
      if (cur >= 2) return;
      // 检查岛屿度数
      const myDeg = bridges.filter((b) => b.a === cursor || b.c === cursor).reduce((s, b) => s + b.n, 0);
      const otDeg = bridges.filter((b) => b.a === nearest || b.c === nearest).reduce((s, b) => s + b.n, 0);
      if (myDeg + 1 > ISLANDS[cursor].n) return;
      if (otDeg + 1 > ISLANDS[nearest].n) return;
      const a = Math.min(cursor, nearest), c = Math.max(cursor, nearest);
      bridges.push({ a, c, n: 1 });
      api.emit('beep');
      const allMatch = ISLANDS.every((is, i) => {
        const deg = bridges.filter((b) => b.a === i || b.c === i).reduce((s, b) => s + b.n, 0);
        return deg === is.n;
      });
      if (allMatch) { over = true; api.emit('win'); }
    }
    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) cursor = Math.max(0, cursor - 3);
        else if (input.pressed.down) cursor = Math.min(ISLANDS.length - 1, cursor + 3);
        else if (input.pressed.left) cursor = Math.max(0, cursor - 1);
        else if (input.pressed.right) cursor = Math.min(ISLANDS.length - 1, cursor + 1);
        else if (input.pressed.a) addBridge();
      },
      render(ctx) {
        const W = N * CELL, H = N * CELL;
        const ox = (400 - W) / 2, oy = (400 - H) / 2;
        ctx.fillStyle = '#001a33'; ctx.fillRect(0, 0, 400, 400);
        // bridges
        bridges.forEach((b) => {
          const a = ISLANDS[b.a], c = ISLANDS[b.c];
          ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = b.n === 2 ? 8 : 4;
          ctx.beginPath();
          ctx.moveTo(ox + a.x * CELL + CELL / 2, oy + a.y * CELL + CELL / 2);
          ctx.lineTo(ox + c.x * CELL + CELL / 2, oy + c.y * CELL + CELL / 2);
          ctx.stroke();
        });
        // islands
        ISLANDS.forEach((is, i) => {
          ctx.fillStyle = i === cursor ? '#ff0066' : '#00ffff';
          ctx.beginPath();
          ctx.arc(ox + is.x * CELL + CELL / 2, oy + is.y * CELL + CELL / 2, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = '18px VT323, monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(is.n, ox + is.x * CELL + CELL / 2, oy + is.y * CELL + CELL / 2);
        });
      },
      serialize() { return { bridges: bridges.length, cursor, total: ISLANDS.length }; },
    };
  },
};