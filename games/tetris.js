/* ============================================================
   games/tetris.js — 俄罗斯方块（§5.2 样板衍生 · puzzle）
   - 原版 games.js:210 — 10x20 棋盘 + 7 种方块 + 旋转/移动/硬降/消行
   - 决定论：随机源全部走注入的 rng；下落计时改用 tick 计数。
   - 键盘：方向键移动/旋转、空格硬降、start 暂停（外壳处理）。
   ============================================================ */

export default {
  meta: {
    id: 'tetris',
    name: '俄罗斯方块',
    desc: '消方块的永恒经典，叠高高看你能撑多久',
    icon: '🧱',
    cat: 'puzzle',
    controls: '←→ 移动 · ↑/X 旋转 · ↓ 加速 · 空格硬降 · P 暂停',
  },
  tickHz: 30, // 原 tickLoop 30ms ≈ 33Hz

  create(rng, api) {
    const W = 300, H = 600, COLS = 10, ROWS = 20, SIZE = 30;
    const COLORS = ['#000', '#00ffff', '#ffff00', '#aa00ff', '#ff8800', '#00ff66', '#ff0066', '#0088ff'];
    const SHAPES = [
      [[1, 1, 1, 1]], // I
      [[2, 2], [2, 2]], // O
      [[0, 3, 0], [3, 3, 3]], // T
      [[0, 4, 4], [4, 4, 0]], // S
      [[5, 5, 0], [0, 5, 5]], // Z
      [[6, 0, 0], [6, 6, 6]], // J
      [[0, 0, 7], [7, 7, 7]], // L
    ];

    let board, current, next, score, lines, dropTimer, tickFrame, over;
    function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
    function spawn() {
      const shape = SHAPES[rng.int(SHAPES.length)];
      current = {
        shape,
        color: SHAPES.indexOf(shape) + 1,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0,
      };
      if (collide(current.x, current.y, current.shape)) { over = true; api.emit('gameover'); }
    }
    function collide(px, py, shape) {
      for (let y = 0; y < shape.length; y++)
        for (let x = 0; x < shape[y].length; x++)
          if (shape[y][x]) {
            const nx = px + x, ny = py + y;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
      return false;
    }
    function merge() {
      current.shape.forEach((row, y) => row.forEach((v, x) => {
        if (v) {
          const ny = current.y + y;
          if (ny >= 0) board[ny][current.x + x] = current.color;
        }
      }));
    }
    function rotate(shape) {
      const r = [];
      for (let x = 0; x < shape[0].length; x++) {
        r.push([]);
        for (let y = shape.length - 1; y >= 0; y--) r[x].push(shape[y][x]);
      }
      return r;
    }
    function tryRotate() {
      const r = rotate(current.shape);
      if (!collide(current.x, current.y, r)) { current.shape = r; api.emit('blip'); }
      else if (!collide(current.x - 1, current.y, r)) { current.shape = r; current.x--; api.emit('blip'); }
      else if (!collide(current.x + 1, current.y, r)) { current.shape = r; current.x++; api.emit('blip'); }
    }
    function clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every((v) => v)) {
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          cleared++; y++;
        }
      }
      if (cleared) {
        const pts = [0, 100, 300, 500, 800][cleared];
        score += pts; lines += cleared; api.emit('line');
      }
    }
    function tickDrop() {
      if (over) return;
      const speed = Math.max(100, 800 - Math.floor(lines / 5) * 50);
      dropTimer += 1000 / 30;
      while (dropTimer >= speed) {
        dropTimer -= speed;
        if (!collide(current.x, current.y + 1, current.shape)) current.y++;
        else { merge(); clearLines(); spawn(); }
        if (over) return;
      }
    }
    function hardDrop() {
      while (!collide(current.x, current.y + 1, current.shape)) current.y++;
      merge(); clearLines(); spawn();
      api.emit('drop');
    }
    function reset() {
      board = emptyBoard(); score = 0; lines = 0; over = false;
      dropTimer = 0; tickFrame = 0; spawn();
    }
    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        tickDrop();
        if (over) return;
        if (input.pressed.left && !collide(current.x - 1, current.y, current.shape)) { current.x--; api.emit('move'); }
        else if (input.pressed.right && !collide(current.x + 1, current.y, current.shape)) { current.x++; api.emit('move'); }
        else if (input.pressed.down && !collide(current.x, current.y + 1, current.shape)) { current.y++; api.emit('move'); }
        else if (input.pressed.up || input.pressed.b) tryRotate();
        else if (input.pressed.a) hardDrop();
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        // 网格
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * SIZE, 0); ctx.lineTo(x * SIZE, H); ctx.stroke(); }
        for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * SIZE); ctx.lineTo(W, y * SIZE); ctx.stroke(); }
        // 已落方块
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++)
            if (board[y][x]) drawCell(ctx, x, y, COLORS[board[y][x]]);
        // 当前方块
        if (current && !over) current.shape.forEach((row, y) => row.forEach((v, x) => {
          if (v) drawCell(ctx, current.x + x, current.y + y, COLORS[current.color]);
        }));
        // 边框
        ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, W, H);
        // HUD
        ctx.fillStyle = '#00ffff'; ctx.font = '14px VT323, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`LINES ${lines}`, 10, 10);
        ctx.fillText(`SCORE ${score}`, 10, 28);
      },
      serialize() { return { score, lines, over }; },
    };

    function drawCell(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x * SIZE + 1, y * SIZE + 1, SIZE - 2, SIZE - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x * SIZE + 1, y * SIZE + 1, SIZE - 2, 3);
      ctx.fillRect(x * SIZE + 1, y * SIZE + 1, 3, SIZE - 2);
    }
  },
};