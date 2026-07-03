/* ============================================================
   games/killer.js — 杀手数独（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2742 — 6x6 数独变体
   - 演示模式：BTN.a 自动按 SOL 解填到光标位置。
   ============================================================ */

export default {
  meta: {
    id: 'killer',
    name: '杀手数独',
    desc: '数独变体，笼内之和提示',
    icon: '🔪',
    cat: 'puzzle',
    controls: '点击格子 · 输入 1-9',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 6, CELL = 60;
    const SOL = [
      [1, 2, 3, 4, 5, 6], [4, 5, 6, 1, 2, 3], [2, 3, 1, 5, 6, 4],
      [5, 6, 4, 2, 3, 1], [3, 1, 2, 6, 4, 5], [6, 4, 5, 3, 1, 2]
    ];
    let board, cursor, over, win, tickFrame;

    function reset() {
      board = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => rng() < 0.4 ? SOL[y][x] : 0));
      cursor = { x: 0, y: 0 }; over = false; win = false; tickFrame = 0;
    }
    function checkWin() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== SOL[y][x]) return false;
      return true;
    }
    function fillCursor() {
      board[cursor.y][cursor.x] = SOL[cursor.y][cursor.x];
      api.emit('beep');
      if (checkWin()) { win = true; over = true; api.emit('win'); }
    }
    function clearCursor() {
      board[cursor.y][cursor.x] = 0;
      api.emit('beep');
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) cursor.y = Math.max(0, cursor.y - 1);
        else if (input.pressed.down) cursor.y = Math.min(N - 1, cursor.y + 1);
        else if (input.pressed.left) cursor.x = Math.max(0, cursor.x - 1);
        else if (input.pressed.right) cursor.x = Math.min(N - 1, cursor.x + 1);
        else if (input.pressed.a) fillCursor();
        else if (input.pressed.b) clearCursor();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x === cursor.x && y === cursor.y) ? '#ff0066' : '#1a0033';
          ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
          if (board[y][x]) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '28px VT323, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(board[y][x], ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
          }
        }
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, W, W);
      },
      serialize() { return { filled: board.flat().filter((v) => v).length, win, over }; },
    };
  },
};