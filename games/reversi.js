/* ============================================================
   games/reversi.js — 黑白棋（策略类）
   8x8. AI 随机合法落子. 玩家方向键 + BTN.a.
   ============================================================ */

import { strokeGrid } from '../engine/draw.js';

export default {
  meta: {
    id: 'reversi',
    name: '黑白棋',
    desc: '围吃对方棋子，棋盘占多者胜',
    icon: '◐',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 8, CELL = 50, W = N * CELL, H = N * CELL;
    let board, turn, over, cursor, frame = 0;
    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      board[3][3] = 1; board[4][4] = 1;
      board[3][4] = 2; board[4][3] = 2;
      turn = 1; over = false; cursor = { x: 2, y: 4 };
    }
    function getFlips(x, y, who) {
      if (board[y][x]) return [];
      const opp = who === 1 ? 2 : 1;
      const flips = [];
      for (const [dx, dy] of dirs) {
        const line = [];
        let nx = x + dx, ny = y + dy;
        while (nx >= 0 && nx < N && ny >= 0 && ny < N && board[ny][nx] === opp) {
          line.push([nx, ny]);
          nx += dx; ny += dy;
        }
        if (line.length && nx >= 0 && nx < N && ny >= 0 && ny < N && board[ny][nx] === who) {
          flips.push(...line);
        }
      }
      return flips;
    }
    function hasMove(who) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (getFlips(x, y, who).length) return true;
      return false;
    }
    function count() {
      let b = 0, w = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (board[y][x] === 1) b++; else if (board[y][x] === 2) w++;
      }
      return [b, w];
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
          // AI 随机合法
          const moves = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
            if (getFlips(x, y, 2).length) moves.push([x, y]);
          if (moves.length) {
            const [ax, ay] = moves[rng.int(moves.length)];
            board[ay][ax] = 2;
            for (const [fx, fy] of getFlips(ax, ay, 2)) board[fy][fx] = 2;
            api.emit('blip');
          }
          // 切换 + 跳过
          turn = 1;
          if (!hasMove(1)) {
            turn = 2;
            if (!hasMove(2)) over = true;
          }
          if (over) api.emit('gameover');
        } else {
          if (p.left && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.x < N - 1) cursor.x++;
          else if (p.up && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.y < N - 1) cursor.y++;
          if (p.a && !board[cursor.y][cursor.x]) {
            const flips = getFlips(cursor.x, cursor.y, 1);
            if (flips.length) {
              board[cursor.y][cursor.x] = 1;
              for (const [fx, fy] of flips) board[fy][fx] = 1;
              api.emit('place');
              turn = 2;
              if (!hasMove(2)) {
                turn = 1;
                if (!hasMove(1)) { over = true; api.emit('gameover'); return; }
              }
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#006633'; ctx.fillRect(0, 0, W, H);
        strokeGrid(ctx, { x: 0, y: 0, cols: N, rows: N, cell: CELL, color: '#003300', lineWidth: 1 });
        // 提示可落子位置
        if (!over) {
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (getFlips(x, y, turn).length) {
              ctx.fillStyle = turn === 1 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
              ctx.fillRect(x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 - 4, 8, 8);
            }
          }
        }
        // 棋子
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!board[y][x]) continue;
          const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
          const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 18);
          if (board[y][x] === 1) { grad.addColorStop(0, '#666'); grad.addColorStop(1, '#000'); }
          else { grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#aaa'); }
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
        }
        if (!over) {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
          ctx.strokeRect(cursor.x * CELL, cursor.y * CELL, CELL, CELL);
        }
      },
      serialize() {
        const c = count();
        return { board, turn, over, cursor: { ...cursor }, b: c[0], w: c[1] };
      },
    };
  },
};
