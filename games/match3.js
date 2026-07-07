/* ============================================================
   games/match3.js — 三消（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2536 — 8x8 宝石 + 交换 + 消除
   - 决定论：初始棋盘用 rng；演示模式：BTN.a 自动做一次随机交换
     + 自动消除（含动画延迟用 tick 计数模拟）。
   ============================================================ */

export default {
  meta: {
    id: 'match3',
    name: '三消',
    desc: '交换相邻宝石，三连消除',
    icon: '💎',
    cat: 'puzzle',
    controls: '点击两个相邻宝石交换',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 8, CELL = 45;
    const GEMS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800'];
    let board, score, busy, over, tickFrame, animTicks;

    function findMatches() {
      const matched = new Set();
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N - 2; x++)
          if (board[y][x] === board[y][x + 1] && board[y][x] === board[y][x + 2]) {
            matched.add(`${x},${y}`);
            matched.add(`${x + 1},${y}`);
            matched.add(`${x + 2},${y}`);
          }
      for (let x = 0; x < N; x++)
        for (let y = 0; y < N - 2; y++)
          if (board[y][x] === board[y + 1][x] && board[y][x] === board[y + 2][x]) {
            matched.add(`${x},${y}`);
            matched.add(`${x},${y + 1}`);
            matched.add(`${x},${y + 2}`);
          }
      return matched;
    }
    function reset() {
      board = [];
      for (let y = 0; y < N; y++) {
        const r = [];
        for (let x = 0; x < N; x++) r.push(rng.int(GEMS.length));
        board.push(r);
      }
      while (findMatches().size) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) board[y][x] = rng.int(GEMS.length);
      }
      score = 0; busy = false; over = false; tickFrame = 0; animTicks = 0;
    }
    function autoSwapAndMatch() {
      if (busy || over) return;
      busy = true;
      // 随机选一个位置，找一个邻居交换，检查 match
      let tries = 0;
      while (tries++ < 20) {
        const x = rng.int(N), y = rng.int(N);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[rng.int(dirs.length)];
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
        [board[y][x], board[ny][nx]] = [board[ny][nx], board[y][x]];
        const m = findMatches();
        if (m.size) {
          score += m.size * 10;
          api.emit('clear');
          // 标记所有匹配格为空
          m.forEach((key) => {
            const [mx, my] = key.split(',').map(Number);
            board[my][mx] = null;
          });
          // 整列下落并补充新宝石
          for (let x = 0; x < N; x++) {
            let write = N - 1;
            for (let y = N - 1; y >= 0; y--) {
              if (board[y][x] !== null) board[write--][x] = board[y][x];
            }
            while (write >= 0) board[write--][x] = rng.int(GEMS.length);
          }
          break;
        } else {
          [board[y][x], board[ny][nx]] = [board[ny][nx], board[y][x]];
        }
      }
      busy = false;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        animTicks++;
        if (input.pressed.a) autoSwapAndMatch();
      },
      render(ctx) {
        const W = N * CELL, ox = (400 - W) / 2, oy = (400 - W) / 2;
        ctx.fillStyle = '#000020'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = GEMS[board[y][x]];
          ctx.fillRect(ox + x * CELL + 2, oy + y * CELL + 2, CELL - 4, CELL - 4);
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 10, 8);
      },
      serialize() { return { score, busy, ticks: tickFrame }; },
    };
  },
};