/* ============================================================
   games/fill.js — 颜色填充（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2774 — 同色区域扩展
   - 演示模式：BTN.a 顺序尝试每个候选颜色直到填满。
   ============================================================ */

export default {
  meta: {
    id: 'fill',
    name: '颜色填充',
    desc: '把同色区域扩展到整个棋盘',
    icon: '🎨',
    cat: 'puzzle',
    controls: '点击颜色扩展区域',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 8, CELL = 40;
    const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800'];
    let board, moves, over, win, tickFrame, nextColor;
    function reset() {
      board = [];
      for (let y = 0; y < N; y++) {
        const r = [];
        for (let x = 0; x < N; x++) r.push(rng.int(COLORS.length));
        r.push(r[0]); // for safety
        board.push(r);
      }
      // 让 row0 多一些同色
      for (let i = 0; i < 3; i++) board[rng.int(N)][rng.int(N)] = board[0][0];
      moves = 0; over = false; win = false; tickFrame = 0; nextColor = 0;
    }
    function flood(c) {
      if (c === board[0][0]) return;
      const old = board[0][0];
      const visited = Array.from({ length: N }, () => Array(N).fill(false));
      function f(x, y) {
        if (x < 0 || x >= N || y < 0 || y >= N || visited[y][x] || board[y][x] !== old) return;
        visited[y][x] = true; board[y][x] = c;
        f(x - 1, y); f(x + 1, y); f(x, y - 1); f(x, y + 1);
      }
      f(0, 0);
      moves++; api.emit('swoosh');
      // 检查全填满
      let ok = true;
      for (let y = 0; y < N && ok; y++) for (let x = 0; x < N && ok; x++) if (board[y][x] !== board[0][0]) ok = false;
      if (ok) { win = true; over = true; api.emit('win'); }
    }
    function autoFill() {
      // 顺序试各颜色直到找到不同的
      for (let i = 0; i < COLORS.length; i++) {
        const c = (nextColor + i) % COLORS.length;
        if (c !== board[0][0]) { flood(c); nextColor = (c + 1) % COLORS.length; return; }
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
        if (input.pressed.a) autoFill();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2 - 40, oy = 40;
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = COLORS[board[y][x]];
          ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
        }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.strokeRect(ox, oy, CELL, CELL);
        // 颜色选择条
        COLORS.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.fillRect(20 + i * 60, oy + N * CELL + 20, 40, 40);
        });
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}${win ? ' · WIN' : ''}`, 10, 8);
      },
      serialize() { return { moves, win, over }; },
    };
  },
};