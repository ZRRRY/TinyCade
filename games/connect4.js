/* ============================================================
   games/connect4.js — 四子棋（策略类）
   7列6行. 玩家方向键选列 + BTN.a 落子. AI 随机.
   ============================================================ */

export default {
  meta: {
    id: 'connect4',
    name: '四子棋',
    desc: '经典四子连珠',
    icon: '🟡',
    cat: 'strategy',
    controls: '← → 选列 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const COLS = 7, ROWS = 6, CELL = 60, W = COLS * CELL, H = ROWS * CELL;
    let board, turn, hover, win, over, frame = 0;

    function reset() {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      turn = 1; hover = 3; win = null; over = false;
    }
    function checkWin(r, c) {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dx, dy] of dirs) {
        let count = 1;
        for (let s = 1; s < 4 && r + s * dy < ROWS && c + s * dx < COLS && board[r + s * dy][c + s * dx] === board[r][c]; s++) count++;
        for (let s = 1; s < 4 && r - s * dy >= 0 && c - s * dx >= 0 && board[r - s * dy][c - s * dx] === board[r][c]; s++) count++;
        if (count >= 4) return board[r][c];
      }
      return 0;
    }
    function drop(c, who) {
      for (let r = ROWS - 1; r >= 0; r--) if (!board[r][c]) {
        board[r][c] = who;
        const w = checkWin(r, c);
        if (w) { win = w; return true; }
        return false;
      }
      return false;
    }
    function aiPickCol() {
      const valid = [];
      for (let c = 0; c < COLS; c++) if (!board[0][c]) valid.push(c);
      return valid.length ? valid[rng.int(valid.length)] : -1;
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
        if (over) return;
        if (turn === 2) {
          const c = aiPickCol();
          if (c >= 0) {
            const w = drop(c, 2);
            api.emit('drop');
            if (w) { over = true; api.emit('gameover'); return; }
            turn = 1;
          }
        } else {
          if (p.left && hover > 0) hover--;
          else if (p.right && hover < COLS - 1) hover++;
          if (p.a && !board[0][hover]) {
            const w = drop(hover, 1);
            api.emit('drop');
            if (w) { over = true; api.emit('win'); return; }
            turn = 2;
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a4d'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#000088'; ctx.fillRect(0, 0, W, ROWS * CELL);
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = board[r][c] === 1 ? '#ff0' : (board[r][c] === 2 ? '#f00' : '#fff');
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!win) {
          ctx.fillStyle = turn === 1 ? '#ff0' : '#f00';
          ctx.beginPath();
          ctx.arc(hover * CELL + CELL / 2, -20, CELL / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      serialize() { return { board, turn, hover, win, over }; },
    };
  },
};
