/* ============================================================
   games/kakuro.js — 数和（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2194 — 5x5 数和填字
   - 简化交互：方向键移动光标，BTN.a 按 ORDER 顺序填入候选数字；
     演示模式（本格内置 SOL 数组用于校验完成）。
   ============================================================ */

import { centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'kakuro',
    name: '数和',
    desc: '填数字使横纵之和等于提示',
    icon: '🧮',
    cat: 'puzzle',
    controls: '点击格子 · 输入 1-9 · 不能重复',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 5, CELL = 70;
    const SOL = [
      [1, 6, 4, 5, 3],
      [5, 3, 2, 7, 6],
      [3, 8, 1, 4, 7],
      [6, 2, 9, 1, 5],
      [4, 5, 7, 8, 2]
    ];

    let board, cursor, errors, over, win, tickFrame, nextDigit;

    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      cursor = { x: 0, y: 0 }; errors = 0; over = false; win = false; tickFrame = 0; nextDigit = 1;
    }
    function check() {
      let ok = true;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (board[y][x] && board[y][x] !== SOL[y][x]) ok = false;
      if (ok) { win = true; over = true; api.emit('win'); }
    }
    function fillNextDigit() {
      // 演示：在当前光标位置按 nextDigit 顺序填入
      if (board[cursor.y][cursor.x] === 0 && nextDigit <= 9) {
        board[cursor.y][cursor.x] = nextDigit;
        api.emit('beep');
        nextDigit++;
        if (nextDigit > 9) nextDigit = 1;
        check();
      }
    }
    function clearCell() {
      if (board[cursor.y][cursor.x] !== 0) {
        board[cursor.y][cursor.x] = 0;
        api.emit('beep');
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
        if (input.pressed.up) cursor.y = Math.max(0, cursor.y - 1);
        else if (input.pressed.down) cursor.y = Math.min(N - 1, cursor.y + 1);
        else if (input.pressed.left) cursor.x = Math.max(0, cursor.x - 1);
        else if (input.pressed.right) cursor.x = Math.min(N - 1, cursor.x + 1);
        else if (input.pressed.a) fillNextDigit();
        else if (input.pressed.b) clearCell();
      },
      render(ctx) {
        const W = N * CELL, H = N * CELL;
        const ox = (400 - W) / 2, oy = (400 - H) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const px = ox + x * CELL, py = oy + y * CELL;
          ctx.fillStyle = (x === cursor.x && y === cursor.y) ? '#ff0066' : '#1a0033';
          ctx.fillRect(px, py, CELL, CELL);
          if (board[y][x]) {
            const numColor = board[y][x] === SOL[y][x] ? '#00ff00' : '#ff0000';
            centerText(ctx, board[y][x], px + CELL / 2, py + CELL / 2 - 14, numColor, 28);
          }
        }
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, W, H);
      },
      serialize() { return { filled: board.flat().filter((v) => v).length, win, over }; },
    };
  },
};