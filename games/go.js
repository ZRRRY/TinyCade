/* ============================================================
   games/go.js — 围棋 9x9（策略类）
   简化 AI 随机. 玩家方向键 + BTN.a. 规则:自杀禁止 + 提子.
   ============================================================ */

import { strokeGrid } from '../engine/draw.js';

export default {
  meta: {
    id: 'go',
    name: '围棋',
    desc: '9x9 围棋入门',
    icon: '⚫',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 9, CELL = 40, W = N * CELL, H = N * CELL;
    let board, turn, captures, cursor, over, frame = 0;

    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      turn = 1; captures = [0, 0]; cursor = { x: Math.floor(N / 2), y: Math.floor(N / 2) }; over = false;
    }
    function neighbors(x, y) {
      return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
        .filter(([nx, ny]) => nx >= 0 && nx < N && ny >= 0 && ny < N);
    }
    function group(x, y) {
      const c = board[y][x];
      const v = Array.from({ length: N }, () => Array(N).fill(false));
      const q = [[x, y]]; const g = [];
      while (q.length) {
        const [cx, cy] = q.pop();
        if (v[cy][cx] || board[cy][cx] !== c) continue;
        v[cy][cx] = true; g.push([cx, cy]);
        for (const [nx, ny] of neighbors(cx, cy)) if (!v[ny][nx] && board[ny][nx] === c) q.push([nx, ny]);
      }
      const libs = g.reduce((s, [gx, gy]) =>
        s + neighbors(gx, gy).filter(([nx, ny]) => board[ny][nx] === 0).length, 0);
      return { c, g, libs };
    }
    function play(x, y, who) {
      if (board[y][x]) return false;
      board[y][x] = who;
      let captured = [];
      const opp = 3 - who;
      for (const [nx, ny] of neighbors(x, y)) {
        if (board[ny][nx] === opp) {
          const grp = group(nx, ny);
          if (grp.libs === 0) captured.push(...grp.g);
        }
      }
      for (const [cx, cy] of captured) { board[cy][cx] = 0; captures[who - 1]++; }
      if (group(x, y).libs === 0) { board[y][x] = 0; return false; } // 自杀
      return true;
    }

    function hasEmpty() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return true;
      return false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (turn === 2) {
          // AI 随机一个空位
          const empty = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push([x, y]);
          if (empty.length) {
            let moved = false;
            // 试一下随机位; 失败就再试
            for (let tries = 0; tries < 20 && !moved; tries++) {
              const [x, y] = empty[rng.int(empty.length)];
              if (play(x, y, 2)) moved = true;
            }
            if (moved) { turn = 1; api.emit('blip'); }
            else { turn = 1; api.emit('pass'); } // 无合法步，pass
          }
        } else {
          if (p.left && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.x < N - 1) cursor.x++;
          else if (p.up && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.y < N - 1) cursor.y++;
          if (p.a) {
            if (play(cursor.x, cursor.y, 1)) {
              api.emit('place');
              turn = 2;
            } else { api.emit('deny'); }
          }
        }
        if (!hasEmpty()) { over = true; api.emit('gameover'); }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#aa6633'; ctx.fillRect(0, 0, W, H);
        strokeGrid(ctx, { x: CELL / 2, y: CELL / 2, cols: N, rows: N, cell: CELL, color: '#000', lineWidth: 1 });
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) {
          ctx.fillStyle = board[y][x] === 1 ? '#000' : '#fff';
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#f00'; ctx.lineWidth = 2;
        ctx.strokeRect(cursor.x * CELL + 4, cursor.y * CELL + 4, CELL - 8, CELL - 8);
      },
      serialize() { return { board, turn, captures, cursor: { ...cursor } }; },
    };
  },
};
