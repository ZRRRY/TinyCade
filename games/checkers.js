/* ============================================================
   games/checkers.js — 西洋跳棋（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2580 — 8x8 国际跳棋 + 简单走子
   - 演示模式：AI 简化为本地随机；BTN.a 走一步（白子）。
   ============================================================ */

export default {
  meta: {
    id: 'checkers',
    name: '西洋跳棋',
    desc: '经典跳棋，吃光对方',
    icon: '🟫',
    cat: 'puzzle',
    controls: '点击选子 · 点击目标位置移动',
  },
  tickHz: 5,

  create(rng, api) {
    const N = 8, CELL = 45;
    let board, sel, turn, score, over, win, tickFrame;
    function reset() {
      board = [];
      for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(null); board.push(r); }
      for (let y = 0; y < 3; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = 'b';
      for (let y = 5; y < 8; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = 'w';
      sel = null; turn = 'w'; score = 0; over = false; win = null; tickFrame = 0;
    }
    function whiteAutoStep() {
      // 简化：找一个白子走一步斜向空位
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (board[y][x] === 'w') {
          // 优先吃子
          for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
            const nx = x + dx, ny = y + dy;
            const mx = x + dx / 2, my = y + dy / 2;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && !board[ny][nx]
                && board[my][mx] && board[my][mx][0] !== 'w') {
              board[ny][nx] = 'w'; board[y][x] = null; board[my][mx] = null;
              score += 10; api.emit('eat');
              return true;
            }
          }
          // 普通走
          for (const [dx, dy] of [[-1, -1], [1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && !board[ny][nx]) {
              board[ny][nx] = 'w'; board[y][x] = null; api.emit('move');
              return true;
            }
          }
        }
      }
      return false;
    }
    function blackAutoStep() {
      for (let y = N - 1; y >= 0; y--) for (let x = 0; x < N; x++) {
        if (board[y][x] === 'b') {
          for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
            const nx = x + dx, ny = y + dy;
            const mx = x + dx / 2, my = y + dy / 2;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && !board[ny][nx]
                && board[my][mx] && board[my][mx][0] !== 'b') {
              board[ny][nx] = 'b'; board[y][x] = null; board[my][mx] = null;
              api.emit('eat');
              return true;
            }
          }
          for (const [dx, dy] of [[-1, 1], [1, 1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && !board[ny][nx]) {
              board[ny][nx] = 'b'; board[y][x] = null; api.emit('move');
              return true;
            }
          }
        }
      }
      return false;
    }
    function isOver() {
      let w = 0, b = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (board[y][x] === 'w') w++;
        if (board[y][x] === 'b') b++;
      }
      if (w === 0) { win = 'b'; return true; }
      if (b === 0) { win = 'w'; return true; }
      return false;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (over) return;
        if (turn === 'w') {
          if (input.pressed.a) {
            if (whiteAutoStep()) {
              if (isOver()) { over = true; api.emit('win'); return; }
              turn = 'b';
            }
          }
        } else {
          // AI 自动黑子：每 tick 走一步
          if (blackAutoStep()) {
            if (isOver()) { over = true; api.emit('gameover'); return; }
            turn = 'w';
          }
        }
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#aa6633' : '#552200';
          ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x]) {
            ctx.fillStyle = board[y][x] === 'w' ? '#fff' : '#000';
            ctx.beginPath();
            ctx.arc(ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`TURN ${turn === 'w' ? 'WHITE' : 'BLACK'} · SCORE ${score}`, 8, 8);
      },
      serialize() { return { turn, score, win, over }; },
    };
  },
};