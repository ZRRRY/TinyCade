/* ============================================================
   games/pac.js — 吃豆人 PAC-LITE（arcade）
   - 原版 games-extra.js:412 — 21×21 固定迷宫 + 鬼怪 + 大力丸
   - 输入：up/down/left/right 设方向；a (空格) 强制设置方向。
   - 60s 时间限制；lives=3。
   ============================================================ */

export default {
  meta: {
    id: 'pac',
    name: '吃豆人',
    desc: '吃光所有豆子，躲避幽灵',
    icon: '🟡',
    cat: 'arcade',
    controls: '方向键移动 · 吃大力丸反追幽灵',
  },
  tickHz: 30,

  create(rng, api) {
    const COLS = 21, ROWS = 21, CELL = 20;
    const W = COLS * CELL, H = ROWS * CELL;
    const MAP = [
      '#####################',
      '#........#.........##',
      '#.##.###.#.###.##..##',
      '#..................##',
      '#.##.#.#####.#.##..##',
      '#....#...#...#....###',
      '####.### # ###.######',
      '   #.#       #.#     ',
      '####.# ##### #.######',
      '.... ....#.........##',
      '####.# ##### #.######',
      '   #.#       #.#     ',
      '####.# ##### #.######',
      '#........#.........##',
      '#.##.###.#.###.##..##',
      '#..#.....P.....#..###',
      '##.#.#.#####.#.#.####',
      '#....#...#...#....###',
      '#.######.#.######..##',
      '#..................##',
      '#####################',
    ];
    let map, dots, pac, ghosts, score, power, lives, timeLeft, frame = 0;
    function resetLevel() {
      map = MAP.map((r) => r.split(''));
      dots = [];
      pac = { x: 9, y: 15, dir: 0 };
      ghosts = [
        { x: 9, y: 9, c: '#ff0000', scared: false },
        { x: 10, y: 9, c: '#ff00ff', scared: false },
        { x: 9, y: 10, c: '#00ffff', scared: false },
      ];
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) if (map[y][x] === '.') dots.push({ x, y, power: false });
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) if (map[y][x] === 'P') { dots.push({ x, y, power: true }); map[y][x] = '.'; }
    }
    function reset() {
      resetLevel(); score = 0; power = 0; lives = 3; timeLeft = 60 * 30;
    }
    function canMove(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false; return map[y][x] !== '#'; }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return lives <= 0 || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (input.pressed.left) pac.dir = 1;
        else if (input.pressed.right) pac.dir = 2;
        else if (input.pressed.up) pac.dir = 3;
        else if (input.pressed.down) pac.dir = 4;
        if (isOver()) return;
        if (pac.dir > 0) {
          const nx = pac.x + [0, -1, 1, 0, 0][pac.dir], ny = pac.y + [0, 0, 0, -1, 1][pac.dir];
          if (canMove(nx, ny)) { pac.x = nx; pac.y = ny; } else pac.dir = 0;
        }
        for (let i = dots.length - 1; i >= 0; i--) {
          if (dots[i].x === pac.x && dots[i].y === pac.y) {
            score += dots[i].power ? 50 : 10;
            if (dots[i].power) { power = 200; ghosts.forEach((g) => g.scared = true); api.emit('powerup'); }
            else api.emit('blip');
            dots.splice(i, 1);
          }
        }
        if (power > 0) { power--; if (power === 0) ghosts.forEach((g) => g.scared = false); }
        ghosts.forEach((g) => {
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          const valid = dirs.filter(([dx, dy]) => canMove(g.x + dx, g.y + dy));
          if (valid.length) { const [dx, dy] = valid[rng.int(valid.length)]; g.x += dx; g.y += dy; }
          if (g.x === pac.x && g.y === pac.y) {
            if (g.scared) { g.x = 9; g.y = 9; g.scared = false; score += 200; api.emit('eat'); }
            else { lives--; api.emit('gameover'); if (lives <= 0) { reset(); return; } resetLevel(); }
          }
        });
        if (dots.length === 0) resetLevel();
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (map[y][x] === '#') { ctx.fillStyle = '#0000ff'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
        }
        ctx.fillStyle = '#ffaa88';
        dots.forEach((d) => {
          if (d.power) { ctx.beginPath(); ctx.arc(d.x * CELL + 10, d.y * CELL + 10, 6, 0, Math.PI * 2); ctx.fill(); }
          else ctx.fillRect(d.x * CELL + 8, d.y * CELL + 8, 4, 4);
        });
        ctx.fillStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(pac.x * CELL + 10, pac.y * CELL + 10, 8, 0.2 * Math.PI, 1.8 * Math.PI); ctx.fill();
        ghosts.forEach((g) => {
          ctx.fillStyle = g.scared ? (power < 60 && power % 20 < 10 ? '#fff' : '#0000ff') : g.c;
          ctx.fillRect(g.x * CELL + 3, g.y * CELL + 3, 14, 14);
        });
      },
      serialize() { return { score, lives: Math.max(0, lives), dotsLeft: dots.length, timeLeft, over: this.over }; },
    };
  },
};
