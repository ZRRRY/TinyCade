/* ============================================================
   games/pipes.js — 管道连接（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2411 — 5x5 管道 + 旋转 + 流到终点
   - 决定论：初始网格用 rng；BTN.a 旋转当前光标管道。
   ============================================================ */

export default {
  meta: {
    id: 'pipes',
    name: '管道连接',
    desc: '旋转管道让水流通',
    icon: '🚰',
    cat: 'puzzle',
    controls: '点击管道旋转 · 连接到水源',
  },
  tickHz: 5,

  create(rng, api) {
    const N = 5, CELL = 70;
    const TYPES = ['│', '─', '┘', '└', '┐', '┌', '┤', '┴', '├', '┬', '┼'];
    let grid, flow, solved, cursor, tickFrame;

    function reset() {
      grid = [];
      flow = Array.from({ length: N }, () => Array(N).fill(false));
      for (let y = 0; y < N; y++) {
        const r = [];
        for (let x = 0; x < N; x++) {
          let t;
          if (x === 0 && y === 2) t = '┌';
          else if (x === N - 1 && y === 2) t = '┐';
          else t = TYPES[rng.int(TYPES.length)];
          r.push({ t, r: rng.int(4) });
        }
        grid.push(r);
      }
      solved = false; cursor = { x: 2, y: 2 }; tickFrame = 0;
      check();
    }
    function check() {
      flow = Array.from({ length: N }, () => Array(N).fill(false));
      function dfs(x, y, from) {
        if (x < 0 || x >= N || y < 0 || y >= N) return;
        if (flow[y][x]) return;
        flow[y][x] = true;
        const t = grid[y][x].t, r = grid[y][x].r;
        // 简化：原始字符方向定义 + 旋转 90 度
        // 这里只判断 │ ─ ┼ 等的连通性；为简化只检竖直横直
        if (t === '│' || t === '┌' || t === '┐' || t === '├' || t === '┤' || t === '┼' || t === '┬' || t === '┴') {
          if (from !== 'u') dfs(x, y - 1, 'd');
          if (from !== 'd') dfs(x, y + 1, 'u');
        }
        if (t === '─' || t === '┘' || t === '└' || t === '├' || t === '┤' || t === '┼' || t === '┬' || t === '┴') {
          if (from !== 'l') dfs(x - 1, y, 'r');
          if (from !== 'r') dfs(x + 1, y, 'l');
        }
      }
      dfs(0, 2, 'l');
      if (flow[2][N - 1] && !solved) { solved = true; api.emit('win'); }
    }
    function rotate() {
      grid[cursor.y][cursor.x].r = (grid[cursor.y][cursor.x].r + 1) % 4;
      api.emit('click');
      check();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return solved; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) cursor.y = Math.max(0, cursor.y - 1);
        else if (input.pressed.down) cursor.y = Math.min(N - 1, cursor.y + 1);
        else if (input.pressed.left) cursor.x = Math.max(0, cursor.x - 1);
        else if (input.pressed.right) cursor.x = Math.min(N - 1, cursor.x + 1);
        else if (input.pressed.a) rotate();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = flow[y][x] ? '#00ffff' : '#333';
          ctx.fillRect(ox + x * CELL + 4, oy + y * CELL + 4, CELL - 8, CELL - 8);
          if (x === cursor.x && y === cursor.y) {
            ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
            ctx.strokeRect(ox + x * CELL + 2, oy + y * CELL + 2, CELL - 4, CELL - 4);
          }
          ctx.save();
          ctx.translate(ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
          ctx.rotate((grid[y][x].r || 0) * Math.PI / 2);
          ctx.fillStyle = flow[y][x] ? '#000' : '#888';
          ctx.font = '40px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(grid[y][x].t, 0, 0);
          ctx.restore();
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(solved ? 'SOLVED!' : 'ROTATE PIPES · BTN.A', 10, 8);
      },
      serialize() { return { solved, cursor: `${cursor.x},${cursor.y}`, flowCount: flow.flat().filter(Boolean).length }; },
    };
  },
};