/* ============================================================
   games/sliding.js — 滑块拼图（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2452 — 3x3 数字滑块
   - 决定论：初始洗牌用 rng。
   ============================================================ */

export default {
  meta: {
    id: 'sliding',
    name: '滑块拼图',
    desc: '滑动方块还原图片',
    icon: '🧩',
    cat: 'puzzle',
    controls: '点击空白旁边的方块滑动',
  },
  tickHz: 15,

  create(rng, api) {
    const N = 3, CELL = 120;
    let board, moves, over, win, tickFrame;
    function findEmpty() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return { x, y };
    }
    function reset() {
      board = [];
      let n = 1;
      for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(n++); board.push(r); }
      board[N - 1][N - 1] = 0;
      // 100 步随机洗牌
      for (let i = 0; i < 100; i++) {
        const empty = findEmpty();
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
          empty.x + dx >= 0 && empty.x + dx < N && empty.y + dy >= 0 && empty.y + dy < N);
        const [dx, dy] = dirs[rng.int(dirs.length)];
        board[empty.y][empty.x] = board[empty.y + dy][empty.x + dx];
        board[empty.y + dy][empty.x + dx] = 0;
      }
      moves = 0; over = false; win = false; tickFrame = 0;
    }
    function tryMove(dx, dy) {
      if (over) return;
      const e = findEmpty();
      const tx = e.x + dx, ty = e.y + dy;
      if (tx >= 0 && tx < N && ty >= 0 && ty < N) {
        board[e.y][e.x] = board[ty][tx];
        board[ty][tx] = 0;
        moves++; api.emit('move');
        if (isSolved()) { win = true; over = true; api.emit('win'); }
      }
    }
    function isSolved() {
      let n = 1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (y === N - 1 && x === N - 1) { if (board[y][x] !== 0) return false; }
        else if (board[y][x] !== n++) return false;
      }
      return true;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) tryMove(0, 1);
        else if (input.pressed.down) tryMove(0, -1);
        else if (input.pressed.left) tryMove(1, 0);
        else if (input.pressed.right) tryMove(-1, 0);
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x]) {
            const c = (board[y][x] * 30) % 360;
            ctx.fillStyle = `hsl(${c}, 70%, 50%)`;
            ctx.fillRect(ox + x * CELL + 4, oy + y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#000';
            ctx.font = '36px VT323, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(board[y][x], ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
          }
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}`, 10, 8);
      },
      serialize() { return { moves, win, over }; },
    };
  },
};