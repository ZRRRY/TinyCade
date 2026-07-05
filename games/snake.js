/* ============================================================
   games/snake.js — 贪吃蛇（引擎化样板，§5.2）
   - 严格按 ENGINE_MIGRATION.md §5.2 实现，零依赖、原生 ESM。
   - 纯逻辑 update + 副作用 render；确定性来自注入 rng + frame 计数。
   - 视觉细节保留旧版：HSL 渐变蛇身、网格、蛇头眼睛（render 内只读 state）。
   - 不发明新接口：meta / tickHz / create(rng, api) → { events, over, update, render, serialize }。
   ============================================================ */

import { strokeGrid } from '../engine/draw.js';

export default {
  meta: {
    id: 'snake',
    name: '贪吃蛇',
    desc: '经典永不褪色，吃到果实变大但别撞墙',
    icon: '🐍',
    cat: 'arcade',
    controls: '方向键/WASD 移动 · P 暂停 · R 重开',
    width: 400,
    height: 400,
  },
  tickHz: 10, // 与旧版 tickLoop(…,100) 一致

  create(rng, api) {
    const COLS = 20, ROWS = 20, CELL = 20;
    let snake, dir, nextDir, food, score, over, frame = 0;

    function spawnFood() {
      if (snake.length >= COLS * ROWS) { over = true; api.emit('win'); return; }
      let a = 0;
      do { food = { x: rng.int(COLS), y: rng.int(ROWS) }; a++; }
      while (snake.some((s) => s.x === food.x && s.y === food.y) && a < 1000);
    }

    function reset() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 }; nextDir = dir; score = 0; over = false;
      spawnFood();
    }
    reset();

    const events = [];
    api.emit = (s) => events.push(s); // 收敛到事件队列（与 §4.4 / §5.2 一致）

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (p.up && dir.y !== 1) nextDir = { x: 0, y: -1 };
        else if (p.down && dir.y !== -1) nextDir = { x: 0, y: 1 };
        else if (p.left && dir.x !== 1) nextDir = { x: -1, y: 0 };
        else if (p.right && dir.x !== -1) nextDir = { x: 1, y: 0 };
        if (p.start) return; // 暂停由外壳处理（§5.4），不进 update，保确定性
        if (over) return;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
            snake.some((s) => s.x === head.x && s.y === head.y)) {
          over = true; api.emit('gameover'); return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10; api.emit('eat'); spawnFood();
        } else {
          snake.pop();
        }
        frame++;
      },
      render(ctx) {
        // 背景
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        // 网格（视觉细节，保留旧版）
        strokeGrid(ctx, { x: 0, y: 0, cols: COLS, rows: ROWS, cell: CELL, color: '#00ffff', alpha: 0.06 });
        // 食物（脉动改用 frame 计数，保持纯视觉 / 确定性）
        const pulse = Math.sin(frame / 3) * 2;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(food.x * CELL + 2 - pulse / 2, food.y * CELL + 2 - pulse / 2,
                     CELL - 4 + pulse, CELL - 4 + pulse);
        // 蛇身（HSL 渐变 + 蛇头眼睛）
        snake.forEach((s, i) => {
          const isHead = i === 0;
          ctx.fillStyle = isHead ? '#00ffff' : `hsl(${(180 + i * 4) % 360},100%,50%)`;
          ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
          if (isHead) {
            ctx.fillStyle = '#000';
            const ex = s.x * CELL + (dir.x === 1 ? 14 : dir.x === -1 ? 6 : 10);
            const ey = s.y * CELL + (dir.y === 1 ? 14 : dir.y === -1 ? 6 : 10);
            ctx.fillRect(ex, ey, 3, 3);
          }
        });
      },
      serialize() { return { score, len: snake.length, head: snake[0], over }; },
    };
  },
};
