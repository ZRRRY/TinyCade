/* ============================================================
   games/dotsboxes.js — 点格游戏（策略类）
   5x5. 随机开始玩家. 玩家方向键 + BTN.a 画线（AI 随机）.
   ============================================================ */

export default {
  meta: {
    id: 'dotsboxes',
    name: '点格游戏',
    desc: '画线围出小方块',
    icon: '⬛',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 画线 · BTN.b 重开',
    width: 300,
    height: 300,
  },
  tickHz: 10,

  create(rng, api) {
    const N = 5, CELL = 60, W = N * CELL, H = N * CELL;
    // hLines: [y+1][x] - 水平线
    // vLines: [y][x+1] - 垂直线
    let hLines, vLines, boxes, turn, scores, cursor, over, frame = 0;

    function reset() {
      hLines = Array.from({ length: N + 1 }, () => Array(N).fill(0));
      vLines = Array.from({ length: N }, () => Array(N + 1).fill(0));
      boxes = Array.from({ length: N }, () => Array(N).fill(0));
      turn = 1; scores = [0, 0]; cursor = { x: 0, y: 0, kind: 'h' }; over = false; // kind='h' or 'v'
    }
    function drawH(yy, xx) {
      hLines[yy][xx] = turn;
    }
    function drawV(yy, xx) {
      vLines[yy][xx] = turn;
    }
    function checkBoxesNew() {
      let made = false;
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        if (!boxes[yy][xx] && hLines[yy][xx] && hLines[yy + 1][xx] && vLines[yy][xx] && vLines[yy][xx + 1]) {
          boxes[yy][xx] = turn; scores[turn - 1]++; made = true;
        }
      }
      return made;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        const h = input.held;
        if (p.b) { reset(); return; }
        if (turn === 2) {
          // AI 在一处随机空线
          const empties = [];
          for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) if (!hLines[y][x]) empties.push([y, x, 'h']);
          for (let y = 0; y < N; y++) for (let x = 0; x <= N; x++) if (!vLines[y][x]) empties.push([y, x, 'v']);
          if (empties.length) {
            const [y, x, k] = empties[rng.int(empties.length)];
            if (k === 'h') drawH(y, x); else drawV(y, x);
            api.emit('beep');
            if (!checkBoxesNew()) turn = 1;
          } else {
            over = true;
          }
        } else {
          if (p.left || p.right || p.up || p.down) {
            // 切换线类型用 select 逻辑按下的方式
          }
          // 简单模式: 方向键移动光标
          if (p.up && cursor.kind === 'h' && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.kind === 'h' && cursor.y < N) cursor.y++;
          else if (p.up && cursor.kind === 'v' && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.kind === 'v' && cursor.y < N - 1) cursor.y++;
          else if (p.left && cursor.kind === 'h' && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.kind === 'h' && cursor.x < N - 1) cursor.x++;
          else if (p.left && cursor.kind === 'v' && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.kind === 'v' && cursor.x < N) cursor.x++;
          // select 在 h/v 之间切换
          if (p.select) cursor.kind = cursor.kind === 'h' ? 'v' : 'h';
          if (p.a) {
            if (cursor.kind === 'h' && !hLines[cursor.y][cursor.x]) {
              drawH(cursor.y, cursor.x);
              api.emit('beep');
              if (!checkBoxesNew()) turn = 2;
            } else if (cursor.kind === 'v' && !vLines[cursor.y][cursor.x]) {
              drawV(cursor.y, cursor.x);
              api.emit('beep');
              if (!checkBoxesNew()) turn = 2;
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        // 水平线
        for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) if (hLines[y][x]) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x * CELL + 20, y * CELL - 2, CELL - 40, 4);
        }
        // 垂直线
        for (let y = 0; y < N; y++) for (let x = 0; x <= N; x++) if (vLines[y][x]) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x * CELL - 2, y * CELL + 20, 4, CELL - 40);
        }
        // 完成的方块
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (boxes[y][x]) {
          ctx.fillStyle = boxes[y][x] === 1 ? 'rgba(255,255,0,0.3)' : 'rgba(255,0,0,0.3)';
          ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
        }
        // 节点
        for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) {
          ctx.fillStyle = '#888';
          ctx.beginPath(); ctx.arc(x * CELL, y * CELL, 5, 0, Math.PI * 2); ctx.fill();
        }
        // 光标
        if (turn === 1) {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
          if (cursor.kind === 'h') ctx.strokeRect(cursor.x * CELL + 20 - 4, cursor.y * CELL - 2, CELL - 40 + 8, 4 + 4);
          else ctx.strokeRect(cursor.x * CELL - 2, cursor.y * CELL + 20 - 4, 4 + 4, CELL - 40 + 8);
        }
      },
      serialize() { return { hLines, vLines, boxes, turn, scores, over: false, cursor: { ...cursor } }; },
    };
  },
};
