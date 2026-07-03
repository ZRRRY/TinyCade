/* ============================================================
   games/jigsaw.js — 拼图（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:3000 — 3x3 数字拼图 + 随机交换
   - 演示模式：BTN.a 自动做几次随机交换。
   ============================================================ */

export default {
  meta: {
    id: 'jigsaw',
    name: '拼图',
    desc: '拖动拼图块还原图',
    icon: '🧩',
    cat: 'puzzle',
    controls: '点击两个相邻块交换',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 3, CELL = 120;
    let board, moves, over, win, tickFrame;
    function isSolved() {
      let n = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== n++) return false;
      return true;
    }
    function reset() {
      board = [];
      let n = 0;
      for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(n++); board.push(r); }
      for (let i = 0; i < 30; i++) {
        const x1 = rng.int(N), y1 = rng.int(N), x2 = rng.int(N), y2 = rng.int(N);
        [board[y1][x1], board[y2][x2]] = [board[y2][x2], board[y1][x1]];
      }
      moves = 0; over = false; win = false; tickFrame = 0;
    }
    function autoSwap() {
      if (over) return;
      const x1 = rng.int(N), y1 = rng.int(N), x2 = rng.int(N), y2 = rng.int(N);
      [board[y1][x1], board[y2][x2]] = [board[y2][x2], board[y1][x1]];
      moves++; api.emit('move');
      if (isSolved()) { win = true; over = true; api.emit('win'); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) autoSwap();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (v < N * N - 1) {
            const c = (v * 40) % 360;
            ctx.fillStyle = `hsl(${c}, 70%, 50%)`;
            ctx.fillRect(ox + x * CELL + 2, oy + y * CELL + 2, CELL - 4, CELL - 4);
            ctx.fillStyle = '#fff';
            ctx.font = '24px VT323, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(v + 1, ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
          }
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}`, 10, 8);
      },
      serialize() { return { moves, win, over }; },
    };
  },
};