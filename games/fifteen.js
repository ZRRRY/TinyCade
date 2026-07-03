/* ============================================================
   games/fifteen.js — 数字华容道（§5.2 样板衍生 · puzzle）
   - 原版 games.js:1229 — 4x4 滑块拼图 + 方向键移动
   - 决定论：shuffle 用 rng；可解性检查保留。
   ============================================================ */

export default {
  meta: {
    id: 'fifteen',
    name: '数字华容道',
    desc: '滑动数字 1-15 还原顺序',
    icon: '🔢',
    cat: 'puzzle',
    controls: '点击/方向键移动数字方块',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 4, CELL = 80, GAP = 6, PAD = 8;
    let board, moves, over, tickFrame;

    function isSolved(b) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (x === N - 1 && y === N - 1) continue;
        if (b[y][x] !== y * N + x + 1) return false;
      }
      return true;
    }
    function isSolvable(b) {
      let inv = 0;
      const flat = b.flat();
      for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++)
        if (flat[i] && flat[j] && flat[i] > flat[j]) inv++;
      let emptyRow = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!b[y][x]) emptyRow = N - y;
      if (N % 2 === 1) return inv % 2 === 0;
      return (inv + emptyRow) % 2 === 1;
    }
    function findEmpty() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return { x, y };
    }
    function shuffle() {
      do {
        const arr = Array.from({ length: N * N - 1 }, (_, i) => i + 1).concat(0);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = rng.int(i + 1);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        board = [];
        for (let y = 0; y < N; y++) board.push(arr.slice(y * N, (y + 1) * N));
      } while (!isSolvable(board) || isSolved(board));
    }
    function reset() {
      shuffle(); moves = 0; over = false; tickFrame = 0;
    }
    function tryMove(x, y) {
      const e = findEmpty();
      if (Math.abs(e.x - x) + Math.abs(e.y - y) === 1) {
        board[e.y][e.x] = board[y][x]; board[y][x] = 0;
        moves++; api.emit('move');
        if (isSolved(board)) { over = true; api.emit('win'); }
      }
    }
    function step(dx, dy) {
      const e = findEmpty();
      const tx = e.x + dx, ty = e.y + dy;
      if (tx >= 0 && tx < N && ty >= 0 && ty < N) tryMove(tx, ty);
    }
    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.left) step(-1, 0);
        else if (input.pressed.right) step(1, 0);
        else if (input.pressed.up) step(0, -1);
        else if (input.pressed.down) step(0, 1);
      },
      render(ctx) {
        const w = N * CELL + (N + 1) * GAP;
        const offX = (400 - w) / 2;
        const offY = 40;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(offX - PAD, offY - PAD, w + PAD * 2, w + PAD * 2 + 30);
        // HUD
        ctx.fillStyle = '#00ffff'; ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}`, offX, 12);
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            const v = board[y][x];
            const px = offX + GAP + x * (CELL + GAP);
            const py = offY + GAP + y * (CELL + GAP);
            ctx.fillStyle = v ? '#aa00ff' : '#000';
            ctx.fillRect(px, py, CELL, CELL);
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
            ctx.strokeRect(px, py, CELL, CELL);
            if (v) {
              ctx.fillStyle = '#fff';
              ctx.font = '20px "Press Start 2P", monospace';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(String(v), px + CELL / 2, py + CELL / 2);
            }
          }
      },
      serialize() { return { moves, solved: isSolved(board), over }; },
    };
  },
};