/* ============================================================
   games/ice.js — 冰面滑动（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2810 — 冰面一直滑到撞墙
   - 决定论：固定地图。
   ============================================================ */

export default {
  meta: {
    id: 'ice',
    name: '冰面滑动',
    desc: '冰面滑行到目标',
    icon: '🧊',
    cat: 'puzzle',
    controls: '方向键滑行 · 撞墙停',
  },
  tickHz: 15,

  create(rng, api) {
    const CELL = 40;
    const MAP = [
      '##########',
      '#P     . #',
      '# ### ## #',
      '# #   #  #',
      '# # # ## #',
      '#   #    #',
      '##### ## #',
      '#     #  #',
      '# ######.#',
      '##########'
    ];
    let map, player, goal, moves, over, win, tickFrame;
    function reset() {
      map = MAP.map((r) => r.split(''));
      player = { x: 1, y: 1 }; goal = { x: 8, y: 8 }; moves = 0; over = false; win = false; tickFrame = 0;
    }
    function step(dx, dy) {
      if (over) return;
      let nx = player.x, ny = player.y;
      while (map[ny + dy][nx + dx] !== '#') {
        nx += dx; ny += dy;
        if (map[ny][nx] === '#') { nx -= dx; ny -= dy; break; }
      }
      if (nx === player.x && ny === player.y) return;
      player.x = nx; player.y = ny;
      moves++; api.emit('move');
      if (map[ny][nx] === '.') { win = true; over = true; api.emit('win'); }
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
        ctx.fillStyle = '#001a33'; ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
          const c = map[y][x];
          const px = ox + x * CELL, py = oy + y * CELL;
          if (c === '#') { ctx.fillStyle = '#444'; ctx.fillRect(px, py, CELL, CELL); }
        }
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(ox + goal.x * CELL, oy + goal.y * CELL, CELL, CELL);
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(ox + player.x * CELL, oy + player.y * CELL, CELL, CELL);
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}`, 10, 8);
      },
      serialize() { return { moves, win, over, px: player.x, py: player.y }; },
    };
  },
};