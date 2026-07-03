/* ============================================================
   games/battleship.js — 战舰（策略类）
   8x8. 方向键移光标 + BTN.a 射击. 随机布置 3 艘船.
   ============================================================ */

export default {
  meta: {
    id: 'battleship',
    name: '战舰',
    desc: '寻找并击沉敌方战舰',
    icon: '🚢',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 射击 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 8, CELL = 45, W = N * CELL, H = N * CELL;
    let board, ships, hits, score, done, cursor, frame = 0;

    function placeShips() {
      // 简单放置:每个船从随机点开始,沿 0/45/90/135 朝向扫;冲突就再试
      const b = Array.from({ length: N }, () => Array(N).fill(0));
      const sizes = [3, 2, 1];
      for (let idx = 0; idx < sizes.length; idx++) {
        const sz = sizes[idx];
        let placed = false;
        for (let tries = 0; tries < 200 && !placed; tries++) {
          const horiz = rng() < 0.5;
          const x = rng.int(N - (horiz ? sz - 1 : 0));
          const y = rng.int(N - (horiz ? 0 : sz - 1));
          let ok = true;
          for (let i = 0; i < sz; i++) {
            const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i);
            if (b[cy][cx]) { ok = false; break; }
          }
          if (!ok) continue;
          for (let i = 0; i < sz; i++) {
            const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i);
            b[cy][cx] = idx + 1;
          }
          placed = true;
        }
      }
      return b;
    }
    function reset() {
      board = placeShips();
      ships = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) ships.push([x, y]);
      hits = Array.from({ length: N }, () => Array(N).fill(0));
      score = 0; done = false; cursor = { x: 0, y: 0 };
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return done; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (done) return;
        if (p.left && cursor.x > 0) cursor.x--;
        else if (p.right && cursor.x < N - 1) cursor.x++;
        else if (p.up && cursor.y > 0) cursor.y--;
        else if (p.down && cursor.y < N - 1) cursor.y++;
        if (p.a && !hits[cursor.y][cursor.x]) {
          if (board[cursor.y][cursor.x]) {
            hits[cursor.y][cursor.x] = 1; score++; api.emit('hit');
          } else {
            hits[cursor.y][cursor.x] = 2; api.emit('splash');
          }
          if (score === ships.length) { done = true; api.emit('win'); }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a4d'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = '#000033';
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          if (hits[y][x]) {
            ctx.fillStyle = hits[y][x] === 1 ? '#ff0' : '#888';
            ctx.beginPath();
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (!done) {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
          ctx.strokeRect(cursor.x * CELL + 2, cursor.y * CELL + 2, CELL - 4, CELL - 4);
        }
      },
      serialize() { return { board, hits, score, done, cursor: { ...cursor } }; },
    };
  },
};
