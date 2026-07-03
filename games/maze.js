/* ============================================================
   games/maze.js — 迷宫（§5.2 样板衍生 · puzzle）
   - 原版 games.js:1921 — 21x21 随机迷宫 + 方向键移动 + 终点
   - 决定论：递归回溯 + rng.shuffle；R 重开即重新生成。
   ============================================================ */

export default {
  meta: {
    id: 'maze',
    name: '迷宫',
    desc: '随机生成的迷宫，从起点走到终点',
    icon: '🌀',
    cat: 'puzzle',
    controls: '方向键/WASD 移动 · R 重新生成',
  },
  tickHz: 20, // 移动响应要快

  create(rng, api) {
    const COLS = 21, ROWS = 21, CELL = 400 / COLS;
    let grid, player, end, moves, over, win, tickFrame;

    function generate() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
      function carve(x, y) {
        grid[y][x] = 0;
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
        // Fisher-Yates shuffle
        for (let i = dirs.length - 1; i > 0; i--) {
          const j = rng.int(i + 1);
          [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && grid[ny][nx] === 1) {
            grid[y + dy / 2][x + dx / 2] = 0;
            carve(nx, ny);
          }
        }
      }
      carve(1, 1);
      player = { x: 1, y: 1 };
      end = { x: COLS - 2, y: ROWS - 2 };
      moves = 0; over = false; win = false;
    }
    function move(dx, dy) {
      if (over) return;
      const nx = player.x + dx, ny = player.y + dy;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] === 0) {
        player.x = nx; player.y = ny; moves++; api.emit('move');
        if (player.x === end.x && player.y === end.y) { win = true; over = true; api.emit('win'); }
      }
    }
    generate();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame = (tickFrame || 0) + 1;
        if (input.pressed.up) move(0, -1);
        else if (input.pressed.down) move(0, 1);
        else if (input.pressed.left) move(-1, 0);
        else if (input.pressed.right) move(1, 0);
        else if (input.pressed.a) { generate(); api.emit('start'); }
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) {
            const px = x * CELL, py = y * CELL;
            if (grid[y][x] === 1) {
              ctx.fillStyle = (x + y) % 2 ? '#553388' : '#7744aa';
              ctx.fillRect(px, py, CELL, CELL);
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.fillRect(px, py, CELL, 2);
              ctx.fillRect(px, py, 2, CELL);
            } else {
              ctx.fillStyle = '#1a0030';
              ctx.fillRect(px, py, CELL, CELL);
            }
          }
        // 终点
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(end.x * CELL + 2, end.y * CELL + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = '#000';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('END', end.x * CELL + CELL / 2, end.y * CELL + CELL / 2);
        // 玩家
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(player.x * CELL + 2, player.y * CELL + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x * CELL + CELL / 2 - 2, player.y * CELL + CELL / 2 - 2, 2, 2);
        ctx.fillRect(player.x * CELL + CELL / 2 + 2, player.y * CELL + CELL / 2 - 2, 2, 2);
        // HUD
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}`, 8, 8);
      },
      serialize() { return { moves, win, over, px: player.x, py: player.y }; },
    };
  },
};