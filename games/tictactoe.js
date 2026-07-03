/* ============================================================
   games/tictactoe.js — 井字棋（策略类）
   简化 AI: 随机落子. 玩家用方向键选格 + BTN.a 落子.
   严格按 ENGINE_MIGRATION.md §4.4 契约.
   ============================================================ */

import { strokeGrid } from '../engine/draw.js';

export default {
  meta: {
    id: 'tictactoe',
    name: '井字棋',
    desc: '三连成一线，电脑不算太强',
    icon: '⭕',
    cat: 'strategy',
    controls: '方向键选格 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const SIZE = 120, W = 360, H = 360;
    let board, turn, win, draw, cursor, over, frame = 0;
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    function reset() {
      board = Array(9).fill(0);
      turn = 1; // 1 = player X, 2 = ai O
      win = 0; draw = false; over = false; cursor = 4;
    }
    function checkWin() {
      for (const l of lines) {
        if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) return board[l[0]];
      }
      return board.every((c) => c) ? 3 : 0; // 3 = draw
    }
    function aiMove() {
      // 随机一个空格
      const empty = [];
      for (let i = 0; i < 9; i++) if (!board[i]) empty.push(i);
      return empty.length ? empty[rng.int(empty.length)] : -1;
    }

    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed, h = input.held;
        if (over) return;
        if (p.b) { reset(); return; }
        if (turn === 2) {
          // AI 自动落子（用 rng）
          const idx = aiMove();
          if (idx >= 0) {
            board[idx] = 2;
            const w = checkWin();
            if (w) { over = true; win = w; api.emit(w === 1 ? 'win' : 'gameover'); return; }
            turn = 1;
          }
          return;
        }
        // 玩家轮
        if (!over) {
          if (p.left && cursor % 3 !== 0) cursor--;
          else if (p.right && cursor % 3 !== 2) cursor++;
          else if (p.up && cursor >= 3) cursor -= 3;
          else if (p.down && cursor <= 5) cursor += 3;
        }
        if (p.a && !board[cursor] && turn === 1) {
          board[cursor] = 1;
          api.emit('place');
          const w = checkWin();
          if (w) { over = true; win = w; api.emit(w === 1 ? 'win' : 'beep'); return; }
          turn = 2;
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        // 网格线
        strokeGrid(ctx, { x: 0, y: 0, cols: 3, rows: 3, cell: SIZE, color: '#00ffff', lineWidth: 4 });
        // 棋子
        for (let i = 0; i < 9; i++) {
          const x = (i % 3) * SIZE, y = Math.floor(i / 3) * SIZE;
          if (board[i] === 1) {
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + SIZE - 20, y + SIZE - 20);
            ctx.moveTo(x + SIZE - 20, y + 20); ctx.lineTo(x + 20, y + SIZE - 20);
            ctx.stroke();
          } else if (board[i] === 2) {
            ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.arc(x + SIZE / 2, y + SIZE / 2, SIZE / 2 - 20, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // 玩家光标
        if (!over) {
          const cx = (cursor % 3) * SIZE, cy = Math.floor(cursor / 3) * SIZE;
          ctx.strokeStyle = 'rgba(0,255,255,0.4)'; ctx.lineWidth = 2;
          ctx.strokeRect(cx + 4, cy + 4, SIZE - 8, SIZE - 8);
        }
      },
      serialize() {
        return { board: board.slice(), turn, win, over, cursor };
      },
    };
  },
};
