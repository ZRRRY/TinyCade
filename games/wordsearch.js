/* ============================================================
   games/wordsearch.js — 单词搜索（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2491 — 10x10 字母矩阵 + 拖动选单词
   - [no-mouse-yet]：本格简化为 BTN.a 标记一个随机找到的单词
     （演示型）。字母矩阵 + 单词列表保留原行为。
   ============================================================ */

export default {
  meta: {
    id: 'wordsearch',
    name: '单词搜索',
    desc: '在字母矩阵中找到所有单词',
    icon: '🔤',
    cat: 'puzzle',
    controls: '拖动选择字母 · 找到目标单词',
  },
  tickHz: 5,

  create(rng, api) {
    const N = 10, CELL = 40;
    const WORDS = ['CODE', 'PIXEL', 'GAME', 'ARCADE', 'NINJA', 'FUN'];
    let grid, found, over, win, tickFrame;

    function reset() {
      grid = Array.from({ length: N }, () => Array(N).fill(''));
      found = [];
      for (const w of WORDS) {
        let placed = false;
        for (let tries = 0; tries < 100 && !placed; tries++) {
          const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
          const dir = dirs[rng.int(dirs.length)];
          const x = rng.int(N), y = rng.int(N);
          const ex = x + dir[0] * (w.length - 1), ey = y + dir[1] * (w.length - 1);
          if (ex < 0 || ex >= N || ey < 0 || ey >= N) continue;
          let ok = true;
          for (let i = 0; i < w.length; i++) {
            const cx = x + dir[0] * i, cy = y + dir[1] * i;
            const ch = grid[cy][cx];
            if (ch && ch !== w[i]) { ok = false; break; }
          }
          if (!ok) continue;
          for (let i = 0; i < w.length; i++) {
            const cx = x + dir[0] * i, cy = y + dir[1] * i;
            grid[cy][cx] = w[i];
          }
          placed = true;
        }
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (!grid[y][x]) grid[y][x] = String.fromCharCode(65 + rng.int(26));
      over = false; win = false; tickFrame = 0;
    }
    function findRandomWord() {
      const remain = WORDS.filter((w) => !found.includes(w));
      if (!remain.length) return null;
      const w = remain[rng.int(remain.length)];
      // 反查网格（演示：直接记录）
      found.push(w);
      return w;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) {
          const w = findRandomWord();
          if (w) {
            api.emit('win');
            if (found.length === WORDS.length) { win = true; over = true; api.emit('win'); }
          }
        }
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = '#1a0033'; ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
          ctx.fillStyle = '#00ffff';
          ctx.font = '20px VT323, monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(grid[y][x], ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2);
        }
        // found 列表
        ctx.fillStyle = '#00ff66';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${found.length}/${WORDS.length}`, 10, 8);
      },
      serialize() { return { found: found.length, total: WORDS.length, win, over }; },
    };
  },
};