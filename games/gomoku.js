/* ============================================================
   games/gomoku.js — 五子棋（策略类）
   简化:13x13 棋盘, AI 随机落子. 鼠标交互 → 方向键 + BTN.a.
   ============================================================ */

import { strokeGrid } from '../engine/draw.js';

export default {
  meta: {
    id: 'gomoku',
    name: '五子棋',
    desc: '五子连珠，先连成五的一方胜',
    icon: '⚫',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 13, CELL = 30, W = N * CELL, H = N * CELL;
    let board, turn, over, cursor, frame = 0;

    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      turn = 1; over = false; cursor = { x: Math.floor(N / 2), y: Math.floor(N / 2) };
    }
    function checkWin(x, y) {
      const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (const [dx, dy] of dirs) {
        let cnt = 1;
        for (let s = 1; s < 5; s++) {
          const nx = x + dx * s, ny = y + dy * s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N || board[ny][nx] !== turn) break;
          cnt++;
        }
        for (let s = 1; s < 5; s++) {
          const nx = x - dx * s, ny = y - dy * s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N || board[ny][nx] !== turn) break;
          cnt++;
        }
        if (cnt >= 5) return true;
      }
      return false;
    }
    function aiMove() {
      const empty = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push([x, y]);
      return empty.length ? empty[rng.int(empty.length)] : null;
    }
    function isFull() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return false;
      return true;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (over) return;
        if (p.b) { reset(); return; }
        if (turn === 2) {
          const m = aiMove();
          if (m) {
            board[m[1]][m[0]] = 2;
            if (checkWin(m[0], m[1])) { over = true; api.emit('gameover'); return; }
            if (isFull()) { over = true; api.emit('draw'); return; }
            turn = 1;
          } else {
            over = true; api.emit('draw'); return;
          }
        } else {
          if (p.left && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.x < N - 1) cursor.x++;
          else if (p.up && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.y < N - 1) cursor.y++;
          if (p.a && !board[cursor.y][cursor.x]) {
            board[cursor.y][cursor.x] = 1;
            api.emit('place');
            if (checkWin(cursor.x, cursor.y)) { over = true; api.emit('win'); return; }
            if (isFull()) { over = true; api.emit('draw'); return; }
            turn = 2;
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#ddbb77'; ctx.fillRect(0, 0, W, H);
        strokeGrid(ctx, { x: 0, y: 0, cols: N, rows: N, cell: CELL, color: '#553300', lineWidth: 1 });
        // 星位
        ctx.fillStyle = '#553300';
        [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]].forEach(([x, y]) => {
          ctx.beginPath(); ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 3, 0, Math.PI * 2); ctx.fill();
        });
        // 棋子
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!board[y][x]) continue;
          const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
          if (board[y][x] === 1) {
            const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 12);
            grad.addColorStop(0, '#666'); grad.addColorStop(1, '#000');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
          } else {
            const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 12);
            grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#aaa');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (!over) {
          ctx.strokeStyle = '#f00'; ctx.lineWidth = 2;
          ctx.strokeRect(cursor.x * CELL + 2, cursor.y * CELL + 2, CELL - 4, CELL - 4);
        }
      },
      serialize() { return { board, turn, over, cursor: { ...cursor } }; },
    };
  },
};
