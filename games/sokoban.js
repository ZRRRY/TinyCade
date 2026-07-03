/* ============================================================
   games/sokoban.js — 推箱子（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2354 — 固定地图 + 方向键推动
   - 决定论：地图固定 (#=墙 .=目标 $=箱子 *=到位空格 S=玩家)。
   ============================================================ */

export default {
  meta: {
    id: 'sokoban',
    name: '推箱子',
    desc: '把箱子推到目标位置',
    icon: '📦',
    cat: 'puzzle',
    controls: '方向键移动并推动箱子',
  },
  tickHz: 20,

  create(rng, api) {
    const CELL = 40;
    const MAP_STR = "##########\n# ..  X  #\n#  X SX  #\n#   .  X.#\n#  $     #\n#  $.    #\n##########";
    let map, player, score, total, over, win, tickFrame;
    function reset() {
      map = [];
      const lines = MAP_STR.split('\n');
      let p = null, t = 0;
      for (let y = 0; y < lines.length; y++) {
        const row = [];
        for (let x = 0; x < lines[y].length; x++) {
          const c = lines[y][x];
          row.push(c);
          if (c === 'S') p = { x, y };
          if (c === '.') t++;
        }
        map.push(row);
      }
      player = p; total = t; score = 0; over = false; win = false; tickFrame = 0;
    }
    function step(dx, dy) {
      if (over) return;
      const nx = player.x + dx, ny = player.y + dy;
      if (map[ny][nx] === '#') return;
      if (map[ny][nx] === '$' || map[ny][nx] === '*') {
        const bx = nx + dx, by = ny + dy;
        if (map[by][bx] === '#' || map[by][bx] === '$' || map[by][bx] === '*') return;
        const isGoal = map[by][bx] === '.';
        map[by][bx] = isGoal ? '*' : '$';
        const wasGoal = map[ny][nx] === '*';
        map[ny][nx] = wasGoal ? '.' : ' ';
        api.emit('move');
      }
      player.x = nx; player.y = ny;
      let done = 0;
      for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) if (map[y][x] === '*') done++;
      score = done;
      if (done === total) { win = true; over = true; api.emit('win'); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.up) step(0, -1);
        else if (input.pressed.down) step(0, 1);
        else if (input.pressed.left) step(-1, 0);
        else if (input.pressed.right) step(1, 0);
      },
      render(ctx) {
        const W = map[0].length * CELL, H = map.length * CELL;
        const ox = (400 - W) / 2, oy = (400 - H) / 2;
        ctx.fillStyle = '#001100'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
          const c = map[y][x];
          const px = ox + x * CELL, py = oy + y * CELL;
          if (c === '#') { ctx.fillStyle = '#444'; ctx.fillRect(px, py, CELL, CELL); }
          if (c === '.') {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath(); ctx.arc(px + CELL / 2, py + CELL / 2, 6, 0, Math.PI * 2); ctx.fill();
          }
          if (c === '$' || c === '*') {
            ctx.fillStyle = c === '*' ? '#00ff00' : '#aa4400';
            ctx.fillRect(px + 4, py + 4, CELL - 8, CELL - 8);
          }
        }
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(ox + player.x * CELL + 4, oy + player.y * CELL + 4, CELL - 8, CELL - 8);
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`BOXES ${score}/${total}`, 10, 8);
      },
      serialize() { return { score, total, win, over }; },
    };
  },
};