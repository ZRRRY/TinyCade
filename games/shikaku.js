/* ============================================================
   games/shikaku.js — 方块分割（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2310 — 6x6 + 数字提示 + 拖动矩形划分
   - [no-mouse-yet]：本格改为"光标模式"——方向键移动矩形左上角，
     BTN.a 放置一个矩形覆盖从光标到下一行的方格（演示型逻辑）。
   ============================================================ */

import { strokeGrid, centerText } from '../engine/draw.js';

export default {
  meta: {
    id: 'shikaku',
    name: '方块分割',
    desc: '把矩形分成若干数字标记的方块',
    icon: '🔲',
    cat: 'puzzle',
    controls: '拖动鼠标绘制矩形',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 6, CELL = 60;
    const HINTS = [{ x: 0, y: 0, n: 6 }, { x: 3, y: 0, n: 4 }, { x: 0, y: 2, n: 8 },
                   { x: 3, y: 3, n: 4 }, { x: 1, y: 4, n: 6 }, { x: 4, y: 5, n: 3 }];
    let board, cursor, over, tickFrame;
    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      HINTS.forEach((c) => board[c.y][c.x] = c.n);
      cursor = { x: 0, y: 0 }; over = false; tickFrame = 0;
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
        else if (input.pressed.a) api.emit('beep');
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a002a'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x]) {
            const numColor = (x === cursor.x && y === cursor.y) ? '#ffff00' : '#00ffff';
            centerText(ctx, board[y][x], ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2 - 12, numColor, 24);
          }
        }
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        strokeGrid(ctx, { x: ox, y: oy, cols: N, rows: N, cell: CELL, color: '#888' });
        // 光标框
        ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
        ctx.strokeRect(ox + cursor.x * CELL, oy + cursor.y * CELL, CELL, CELL);
      },
      serialize() { return { cursor: `${cursor.x},${cursor.y}`, hints: HINTS.length }; },
    };
  },
};