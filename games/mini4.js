/* ============================================================
   games/mini4.js — 迷你数独（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2666 — 4x4 数独（拉丁方）
   - 演示模式：BTN.a 自动按 SOL 解填到下一个空格。
   ============================================================ */

export default {
  meta: {
    id: 'mini4',
    name: '迷你数独',
    desc: '4x4 数独入门版',
    icon: '🔢',
    cat: 'puzzle',
    controls: '点击格子 · 输入 1-4',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 4, CELL = 80;
    const SOL = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
    let board, given, cursor, over, win, tickFrame;

    function reset() {
      board = SOL.map((r) => [...r]);
      given = [];
      const placed = new Set();
      for (let i = 0; i < 6; i++) {
        for (let tries = 0; tries < 100; tries++) {
          const x = rng.int(N), y = rng.int(N);
          const k = `${x},${y}`;
          if (!placed.has(k)) {
            placed.add(k);
            given.push({ x, y });
            break;
          }
        }
      }
      for (const g of given) board[g.y][g.x] = SOL[g.y][g.x];
      cursor = { x: 0, y: 0 }; over = false; win = false; tickFrame = 0;
    }
    function checkWin() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== SOL[y][x]) return false;
      return true;
    }
    function fillNext() {
      if (given.some((g) => g.x === cursor.x && g.y === cursor.y)) {
        api.emit('deny');
        return;
      }
      board[cursor.y][cursor.x] = SOL[cursor.y][cursor.x];
      api.emit('beep');
      if (checkWin()) { win = true; over = true; api.emit('win'); }
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
        else if (input.pressed.a) fillNext();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const isCursor = x === cursor.x && y === cursor.y;
          ctx.fillStyle = isCursor ? '#ff0066' : '#1a0033';
          ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
          if (board[y][x]) {
            const isGiven = given.some((g) => g.x === x && g.y === y);
            ctx.fillStyle = isGiven ? '#00ffff' : '#ffff00';
            ctx.font = '36px VT323, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(board[y][x], ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
          }
        }
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4;
        ctx.strokeRect(ox, oy, W, W);
        ctx.beginPath();
        ctx.moveTo(ox + W / 2, oy); ctx.lineTo(ox + W / 2, oy + W);
        ctx.moveTo(ox, oy + W / 2); ctx.lineTo(ox + W, oy + W / 2);
        ctx.stroke();
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(win ? 'SOLVED!' : 'BTN.A: FILL NEXT', 10, 8);
      },
      serialize() { return { filled: board.flat().filter((v) => v).length, win, over }; },
    };
  },
};