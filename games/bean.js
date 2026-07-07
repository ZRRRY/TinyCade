/* ============================================================
   games/bean.js — 吃豆子（arcade, snake 变体）
   - 原版 games-extra.js:1199 — 30x30 网格蛇形吃豆
   - 输入：方向键转向
   - 决定论：食物生成由 rng.int
   ============================================================ */

export default {
  meta: {
    id: 'bean',
    name: '吃豆子',
    desc: '经典吃豆子变体，靠吃光升级',
    icon: '🫘',
    cat: 'arcade',
    controls: '方向键移动 · 不能撞墙和自己',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 30, CELL = 12, W = N * CELL, H = N * CELL;
    let snake, dir, food, score, alive, over, frame = 0;

    function spawn() {
      let a = 0, p;
      do { p = { x: rng.int(N), y: rng.int(N) }; a++; }
      while (snake.some((s) => s.x === p.x && s.y === p.y) && a < 1000);
      return p;
    }
    function reset() {
      snake = [{ x: 15, y: 15 }, { x: 14, y: 15 }, { x: 13, y: 15 }];
      dir = { x: 1, y: 0 }; food = spawn(); score = 0; alive = true; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (!alive) return;
        if (input.pressed.left && dir.x !== 1) dir = { x: -1, y: 0 };
        else if (input.pressed.right && dir.x !== -1) dir = { x: 1, y: 0 };
        else if (input.pressed.up && dir.y !== 1) dir = { x: 0, y: -1 };
        else if (input.pressed.down && dir.y !== -1) dir = { x: 0, y: 1 };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
            snake.some((s) => s.x === head.x && s.y === head.y)) {
          alive = false; over = true; api.emit('gameover'); return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) { score++; food = spawn(); api.emit('eat'); }
        else snake.pop();
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0030'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);
        snake.forEach((s, i) => {
          ctx.fillStyle = i === 0 ? '#ffff00' : '#00ff00';
          ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL);
        });
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 4, 4);
      },
      serialize() { return { score, len: snake.length, head: snake[0], frame, over }; },
    };
  },
};
