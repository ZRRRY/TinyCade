/* ============================================================
   games/sudoku.js — 数独（§5.2 样板衍生 · puzzle）
   - 原版 games.js:2119 — 9x9 + 45 空格 + 数字键填入
   - 决定论：填数生成器用 rng，挖洞也用 rng。
   - [no-mouse-yet]：方向键移动光标，1-9 数字键映射为 BTN.a 重复
     模拟——本格把数字选项内置：BTN.a 顺序填入 1..9，按 b 自动填
     正确答案（演示用）。
   ============================================================ */

export default {
  meta: {
    id: 'sudoku',
    name: '数独',
    desc: '经典 9×9 逻辑填数，独一无二',
    icon: '🔲',
    cat: 'puzzle',
    controls: '点击格子 + 数字键填数 · 空格清空',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 9, CELL = 40, GAP = 0;
    let solution, puzzle, given, cursor, over, win, tickFrame, fillIdx;

    function emptyGrid() { return Array.from({ length: N }, () => Array(N).fill(0)); }
    function findEmpty(g) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) return [x, y];
      return null;
    }
    function isValid(g, x, y, n) {
      for (let i = 0; i < N; i++) if (g[y][i] === n || g[i][x] === n) return false;
      const sx = Math.floor(x / 3) * 3, sy = Math.floor(y / 3) * 3;
      for (let yy = sy; yy < sy + 3; yy++) for (let xx = sx; xx < sx + 3; xx++) if (g[yy][xx] === n) return false;
      return true;
    }
    function fillGrid(g) {
      const e = findEmpty(g);
      if (!e) return true;
      const [x, y] = e;
      // 1..9 按 rng.shuffle
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = nums.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      for (const n of nums) {
        if (isValid(g, x, y, n)) {
          g[y][x] = n;
          if (fillGrid(g)) return true;
          g[y][x] = 0;
        }
      }
      return false;
    }
    function makePuzzle() {
      solution = emptyGrid();
      fillGrid(solution);
      puzzle = solution.map((r) => [...r]);
      given = puzzle.map((r) => r.map((v) => v !== 0));
      const holes = 45;
      let dug = 0;
      while (dug < holes) {
        const x = rng.int(N), y = rng.int(N);
        if (puzzle[y][x] !== 0) { puzzle[y][x] = 0; given[y][x] = false; dug++; }
      }
      cursor = { x: 0, y: 0 };
      fillIdx = 1; // 模拟"按 a 自动填"的下一个数字
      over = false;
    }
    function checkComplete() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (puzzle[y][x] !== solution[y][x]) return false;
      return true;
    }
    function fillNext() {
      if (given[cursor.y][cursor.x]) return;
      // 找下一个空格
      let x = cursor.x, y = cursor.y;
      for (let tries = 0; tries < N * N; tries++) {
        if (!given[y][x] && puzzle[y][x] === 0) break;
        x = (x + 1) % N;
        if (x === 0) y = (y + 1) % N;
      }
      if (!given[y][x] && puzzle[y][x] === 0) {
        puzzle[y][x] = solution[y][x];
        cursor = { x, y };
        api.emit('beep');
        if (checkComplete()) { win = true; over = true; api.emit('win'); }
      }
    }
    function clearCursor() {
      if (!given[cursor.y][cursor.x]) {
        puzzle[cursor.y][cursor.x] = 0;
        api.emit('beep');
      }
    }
    makePuzzle();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame = (tickFrame || 0) + 1;
        if (input.pressed.up) cursor.y = Math.max(0, cursor.y - 1);
        else if (input.pressed.down) cursor.y = Math.min(N - 1, cursor.y + 1);
        else if (input.pressed.left) cursor.x = Math.max(0, cursor.x - 1);
        else if (input.pressed.right) cursor.x = Math.min(N - 1, cursor.x + 1);
        else if (input.pressed.a) fillNext();
        else if (input.pressed.b) clearCursor();
      },
      render(ctx) {
        const w = N * CELL;
        const offX = (400 - w) / 2;
        const offY = 20;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(offX - 4, offY - 4, w + 8, w + 8);
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            const px = offX + x * CELL, py = offY + y * CELL;
            const isSel = cursor.x === x && cursor.y === y;
            const val = puzzle[y][x];
            ctx.fillStyle = isSel ? '#553355' : ((Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? '#2d0050' : '#1a0030');
            ctx.fillRect(px, py, CELL, CELL);
            if (val) {
              const sameAsSol = val === solution[y][x];
              ctx.fillStyle = given[y][x] ? '#00ffff' : sameAsSol ? '#ffffff' : '#ff8800';
              ctx.font = '14px "Press Start 2P", monospace';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(String(val), px + CELL / 2, py + CELL / 2 + 2);
            }
            // 网格
            ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
            ctx.strokeRect(px, py, CELL, CELL);
          }
        // 粗线 3x3 框
        ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 3;
        for (let k = 1; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(offX + k * 3 * CELL, offY); ctx.lineTo(offX + k * 3 * CELL, offY + w); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(offX, offY + k * 3 * CELL); ctx.lineTo(offX + w, offY + k * 3 * CELL); ctx.stroke();
        }
        ctx.strokeRect(offX, offY, w, w);
        // HUD
        let filled = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (puzzle[y][x]) filled++;
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${filled}/${N * N}${win ? '  SOLVED!' : ''}`, 8, 4);
      },
      serialize() {
        const flat = puzzle.flat().join('');
        return { filled: flat.replace(/0/g, '').length, win, over, hash: flat };
      },
    };
  },
};