/* ============================================================
   games/slide3.js — 滑块 3x3（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2900 — 3x3 滑块拼图（数字）
   - 决定论：固定初始解，洗牌 50 步用 rng。
   ============================================================ */

export default {
  meta: {
    id: 'slide3',
    name: '滑块 3x3',
    desc: '还原数字顺序',
    icon: '🔢',
    cat: 'puzzle',
    controls: '点击空白旁边的方块',
  },
  tickHz: 15,

  create(rng, api) {
    const N = 3, CELL = 100;
    let board, moves, over, win, tickFrame;
    function findE() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return { x, y }; }
    function isSolved() {
      let n = 1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (y === N - 1 && x === N - 1) { if (board[y][x] !== 0) return false; }
        else if (board[y][x] !== n++) return false;
      }
      return true;
    }
    function reset() {
      board = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
      for (let i = 0; i < 50; i++) {
        const e = findE();
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
          e.x + dx >= 0 && e.x + dx < N && e.y + dy >= 0 && e.y + dy < N);
        const [dx, dy] = dirs[rng.int(dirs.length)];
        board[e.y][e.x] = board[e.y + dy][e.x + dx];
        board[e.y + dy][e.x + dx] = 0;
      }
      moves = 0; over = false; win = false; tickFrame = 0;
    }
    function tryMove(dx, dy) {
      if (over) return;
      const e = findE();
      const tx = e.x + dx, ty = e.y + dy;
      if (tx >= 0 && tx < N && ty >= 0 && ty < N) {
        board[e.y][e.x] = board[ty][tx]; board[ty][tx] = 0;
        moves++; api.emit('move');
        if (isSolved()) { win = true; over = true; api.emit('win'); }
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
        if (input.pressed.up) tryMove(0, 1);
        else if (input.pressed.down) tryMove(0, -1);
        else if (input.pressed.left) tryMove(1, 0);
        else if (input.pressed.right) tryMove(-1, 0);
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = 50;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x]) {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ox + x * CELL + 4, oy + y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#000';
            ctx.font = '40px VT323, monospace';
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