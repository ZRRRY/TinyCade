/* ============================================================
   games/minesweeper.js — 扫雷（§5.2 样板衍生 · puzzle）
   - 原版 games.js:503 — 10x10 + 15 雷 + 左键翻开/右键标记/R 重开
   - [no-mouse-yet]：本格"翻开"由方向键移动光标 + pressed.a 触发；
     标记(右键)暂留 TODO。雷区生成用 rng，保证首点安全（避开周围）。
   ============================================================ */

export default {
  meta: {
    id: 'minesweeper',
    name: '扫雷',
    desc: 'Windows 经典，找出所有地雷',
    icon: '💣',
    cat: 'puzzle',
    controls: '方向键移光标 · BTN.a 翻开 · BTN.b 标记 · BTN.select 重开',
    width: 400,
    height: 400,
  },
  tickHz: 10, // 逻辑很简单，慢一点省电

  create(rng, api) {
    const W = 10, H = 10, MINES = 15, SIZE = 40;
    let board, revealed, flagged, cursor, over, win, firstClick, tickFrame;

    function reset() {
      board = Array.from({ length: H }, () => Array(W).fill(0));
      revealed = Array.from({ length: H }, () => Array(W).fill(false));
      flagged = Array.from({ length: H }, () => Array(W).fill(false));
      cursor = { x: 0, y: 0 }; over = false; win = false; firstClick = true; tickFrame = 0;
    }
    function placeMines(sx, sy) {
      let placed = 0;
      while (placed < MINES) {
        const x = rng.int(W), y = rng.int(H);
        if (board[y][x] === -1) continue;
        if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue;
        board[y][x] = -1; placed++;
      }
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (board[y][x] === -1) continue;
          let n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H && board[ny][nx] === -1) n++;
            }
          board[y][x] = n;
        }
    }
    function reveal(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H || revealed[y][x] || flagged[y][x]) return;
      revealed[y][x] = true;
      if (board[y][x] === 0) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) reveal(x + dx, y + dy);
      }
    }
    function checkWin() {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (board[y][x] !== -1 && !revealed[y][x]) return false;
      return true;
    }
    function toggleFlag() {
      if (over) return;
      if (!revealed[cursor.y][cursor.x]) {
        flagged[cursor.y][cursor.x] = !flagged[cursor.y][cursor.x];
        api.emit('blip');
      }
    }
    function doReveal() {
      if (over) return;
      if (flagged[cursor.y][cursor.x]) return;
      if (firstClick) { placeMines(cursor.x, cursor.y); firstClick = false; }
      reveal(cursor.x, cursor.y);
      if (board[cursor.y][cursor.x] === -1) {
        over = true; api.emit('explode');
        for (let yy = 0; yy < H; yy++)
          for (let xx = 0; xx < W; xx++)
            if (board[yy][xx] === -1) revealed[yy][xx] = true;
      } else {
        api.emit('blip');
        if (checkWin()) { win = true; over = true; api.emit('win'); }
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
        if (input.pressed.left) cursor.x = Math.max(0, cursor.x - 1);
        else if (input.pressed.right) cursor.x = Math.min(W - 1, cursor.x + 1);
        else if (input.pressed.up) cursor.y = Math.max(0, cursor.y - 1);
        else if (input.pressed.down) cursor.y = Math.min(H - 1, cursor.y + 1);
        else if (input.pressed.a) doReveal();
        else if (input.pressed.b) toggleFlag();
        else if (input.pressed.select) { reset(); return; }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        const colors = ['#0000ff', '#008800', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const px = x * SIZE, py = y * SIZE;
            const isCursor = x === cursor.x && y === cursor.y;
            if (revealed[y][x]) {
              ctx.fillStyle = isCursor ? '#553355' : '#2a2a4a';
              ctx.fillRect(px + 1, py + 1, SIZE - 2, SIZE - 2);
              if (board[y][x] === -1) {
                ctx.fillStyle = '#ff0066'; ctx.fillRect(px + 8, py + 8, SIZE - 16, SIZE - 16);
              } else if (board[y][x] > 0) {
                ctx.fillStyle = colors[board[y][x] - 1];
                ctx.font = '24px "Press Start 2P", monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(board[y][x]), px + SIZE / 2, py + SIZE / 2 + 2);
              }
            } else {
              ctx.fillStyle = isCursor ? '#7a7aaa' : '#4a4a8a';
              ctx.fillRect(px + 1, py + 1, SIZE - 2, SIZE - 2);
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.fillRect(px + 1, py + 1, SIZE - 2, 3);
              ctx.fillRect(px + 1, py + 1, 3, SIZE - 2);
              if (flagged[y][x]) {
                ctx.fillStyle = '#ff0000';
                ctx.font = '20px "Press Start 2P", monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('F', px + SIZE / 2, py + SIZE / 2 + 2);
              }
            }
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(px, py, SIZE, SIZE);
          }
      },
      serialize() {
        const flags = flagged.flat().filter((f) => f).length;
        return { flags, mines: MINES, win, over, firstClick };
      },
    };
  },
};