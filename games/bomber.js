/* ============================================================
   games/bomber.js — 炸弹人 BOMBER（arcade）
   - 原版 games-extra.js:497 — 15×15 网格 + 砖块 + 炸弹 + 敌人
   - 输入：方向键移动 + a (空格) 放炸弹
   - 60s 时间限制；消灭敌人或胜出；触火/敌人 = 死亡。
   ============================================================ */

export default {
  meta: {
    id: 'bomber',
    name: '炸弹人',
    desc: '放炸弹炸掉砖块，躲开火焰',
    icon: '💣',
    cat: 'arcade',
    controls: '方向键移动 · 空格放炸弹',
  },
  tickHz: 30,

  create(rng, api) {
    const COLS = 15, ROWS = 15, CELL = 24;
    const W = COLS * CELL, H = ROWS * CELL;
    let map, player, bombs, fires, enemies, score, timeLeft, frame = 0;
    function buildMap() {
      map = [];
      for (let y = 0; y < ROWS; y++) {
        const r = [];
        for (let x = 0; x < COLS; x++) {
          if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || (x % 2 === 0 && y % 2 === 0)) r.push('#');
          else if (rng() < 0.5) r.push('B');
          else r.push(' ');
        }
        map.push(r);
      }
      map[1][1] = ' '; map[1][2] = ' '; map[2][1] = ' '; map[2][2] = ' ';
    }
    function reset() {
      buildMap();
      player = { x: 1, y: 1 };
      bombs = []; fires = []; enemies = [];
      for (let i = 0; i < 5; i++) {
        let ex, ey; let safety = 0;
        do {
          ex = 1 + rng.int(COLS - 2); ey = 1 + rng.int(ROWS - 2);
          safety++;
        } while ((map[ey][ex] !== ' ' || (ex < 3 && ey < 3)) && safety < 200);
        enemies.push({ x: ex, y: ey, t: 0 });
      }
      score = 0; timeLeft = 60 * 30;
    }
    function canMove(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false; const t = map[y][x]; return t === ' ' || t === '.'; }
    function burn(x, y) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
      if (map[y][x] === 'B') { score += 10; api.emit('explode'); }
      if (map[y][x] !== '#') { map[y][x] = '.'; fires.push({ x, y, life: 20 }); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return timeLeft <= 0 || enemies.length === 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (input.held.left && canMove(player.x - 1, player.y)) player.x--;
        if (input.held.right && canMove(player.x + 1, player.y)) player.x++;
        if (input.held.up && canMove(player.x, player.y - 1)) player.y--;
        if (input.held.down && canMove(player.x, player.y + 1)) player.y++;
        if (input.pressed.a && bombs.length < 3 && map[player.y][player.x] === ' ') {
          bombs.push({ x: player.x, y: player.y, age: 0 }); api.emit('drop');
        }
        if (isOver()) return;
        enemies.forEach((e) => {
          e.t += 0.02;
          const newT = Math.floor(e.t);
          if (newT !== Math.floor(e.t - 0.02)) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const ds = dirs.filter(([dx, dy]) => canMove(e.x + dx, e.y + dy));
            if (ds.length) { const [dx, dy] = ds[rng.int(ds.length)]; e.x += dx; e.y += dy; }
          }
        });
        fires.forEach((f) => f.life--);
        fires = fires.filter((f) => f.life > 0);
        enemies.forEach((e, i) => {
          if (fires.some((f) => f.x === e.x && f.y === e.y)) { enemies.splice(i, 1); score += 50; api.emit('explode'); }
          else if (e.x === player.x && e.y === player.y) { api.emit('gameover'); reset(); return; }
        });
        if (fires.some((f) => f.x === player.x && f.y === player.y)) { api.emit('gameover'); reset(); return; }
        bombs.forEach((b) => {
          b.age++;
          if (b.age >= 45) {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            dirs.forEach(([dx, dy]) => burn(b.x + dx, b.y + dy));
            burn(b.x, b.y);
          }
        });
        bombs = bombs.filter((b) => b.age < 45);
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#001100'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (map[y][x] === '#') { ctx.fillStyle = '#444'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
          if (map[y][x] === 'B') { ctx.fillStyle = '#884400'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
        }
        ctx.fillStyle = '#ffaa00'; enemies.forEach((e) => ctx.fillRect(e.x * CELL + 3, e.y * CELL + 3, 18, 18));
        ctx.fillStyle = '#00aaff'; ctx.fillRect(player.x * CELL + 3, player.y * CELL + 3, 18, 18);
        ctx.fillStyle = '#ff8800'; fires.forEach((f) => ctx.fillRect(f.x * CELL, f.y * CELL, CELL, CELL));
        ctx.fillStyle = '#000'; bombs.forEach((b) => { ctx.beginPath(); ctx.arc(b.x * CELL + 12, b.y * CELL + 12, 10, 0, Math.PI * 2); ctx.fill(); });
      },
      serialize() { return { score, timeLeft, enemiesLeft: enemies.length, over: this.over }; },
    };
  },
};
