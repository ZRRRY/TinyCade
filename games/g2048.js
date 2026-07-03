/* ============================================================
   games/g2048.js — 2048（§5.2 样板衍生 · puzzle）
   - 原版 games.js:629 — 4x4 棋盘 + 方向键合并 + 随机新块
   - 决定论：随机源全部走注入的 rng；状态机 + 序列化 → board + score。
   ============================================================ */

export default {
  meta: {
    id: 'g2048',
    name: '2048',
    desc: '合并数字挑战极限，2014 年火爆全球',
    icon: '🔢',
    cat: 'puzzle',
    controls: '方向键移动方块 · 同数合并 · 达到 2048 获胜',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 4, CELL = 80, GAP = 8, PAD = 8;
    const COLORS = {
      0: '#2d0050', 2: '#553388', 4: '#7744aa', 8: '#ff8800', 16: '#ff6600',
      32: '#ff4400', 64: '#ff0066', 128: '#ffff00', 256: '#ffee00',
      512: '#ffdd00', 1024: '#ffcc00', 2048: '#ffbb00'
    };

    let board, score, won, over, tickFrame;

    function emptyBoard() { return Array.from({ length: N }, () => Array(N).fill(0)); }
    function addRandom() {
      const empty = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push({ x, y });
      if (!empty.length) return false;
      const c = empty[rng.int(empty.length)];
      board[c.y][c.x] = rng() < 0.9 ? 2 : 4;
      return true;
    }
    function reset() {
      board = emptyBoard(); score = 0; won = false; over = false; tickFrame = 0;
      addRandom(); addRandom();
    }
    function move(dir) {
      if (over) return false;
      const old = JSON.stringify(board);
      const lines = [];
      for (let i = 0; i < N; i++) {
        const line = [];
        for (let j = 0; j < N; j++) {
          const y = dir === 'up' ? j : dir === 'down' ? N - 1 - j : i;
          const x = dir === 'left' ? j : dir === 'right' ? N - 1 - j : i;
          if (board[y][x]) line.push(board[y][x]);
        }
        for (let k = 0; k < line.length - 1; k++) {
          if (line[k] === line[k + 1]) {
            line[k] *= 2;
            score += line[k];
            if (line[k] === 2048 && !won) { won = true; api.emit('win'); }
            line.splice(k + 1, 1);
          }
        }
        while (line.length < N) line.push(0);
        if (dir === 'right' || dir === 'down') line.reverse();
        lines.push(line);
      }
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const y = dir === 'left' || dir === 'right' ? i : j;
          const x = dir === 'up' || dir === 'down' ? i : j;
          board[y][x] = lines[i][j];
        }
      if (JSON.stringify(board) === old) return false;
      api.emit('move');
      addRandom();
      if (isOver()) { over = true; api.emit('gameover'); }
      return true;
    }
    function isOver() {
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!board[y][x]) return false;
          if (x < N - 1 && board[y][x] === board[y][x + 1]) return false;
          if (y < N - 1 && board[y][x] === board[y + 1][x]) return false;
        }
      return true;
    }
    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) move('up');
        else if (input.pressed.down) move('down');
        else if (input.pressed.left) move('left');
        else if (input.pressed.right) move('right');
      },
      render(ctx) {
        // 背景框
        const w = N * CELL + (N + 1) * GAP;
        const offX = (400 - w) / 2;
        const offY = 40;
        ctx.fillStyle = '#1a0030'; ctx.fillRect(offX - PAD, offY - PAD, w + PAD * 2, w + PAD * 2 + 30);
        ctx.fillStyle = '#0a0014'; ctx.fillRect(offX, offY, w, w);
        // score
        ctx.fillStyle = '#00ffff'; ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, offX, 8);
        // 网格
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            const v = board[y][x];
            ctx.fillStyle = COLORS[v] || '#ff00ff';
            ctx.fillRect(offX + GAP + x * (CELL + GAP), offY + GAP + y * (CELL + GAP), CELL, CELL);
            if (v) {
              ctx.fillStyle = v >= 8 ? '#000' : '#fff';
              ctx.font = (v >= 1000 ? 14 : v >= 100 ? 16 : 22) + 'px "Press Start 2P", monospace';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(String(v), offX + GAP + x * (CELL + GAP) + CELL / 2, offY + GAP + y * (CELL + GAP) + CELL / 2);
            }
          }
      },
      serialize() { return { score, won, over, max: maxTile() }; },
    };

    function maxTile() {
      let m = 0;
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) if (board[y][x] > m) m = board[y][x];
      return m;
    }
  },
};