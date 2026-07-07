/* ============================================================
   games/hex.js — 六角棋（策略类）
   简化:7x7 六角盘,AI 随机. 玩家方向键 + BTN.a.
   ============================================================ */

export default {
  meta: {
    id: 'hex',
    name: '六角棋',
    desc: '六角棋盘上连边',
    icon: '⬡',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 落子 · BTN.b 重开',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 7, R = 25, W = 400, H = 400, CX = W / 2, CY = H / 2;
    const SQRT3 = Math.sqrt(3);
    let board, turn, win, cursor, frame = 0;

    function reset() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      turn = 1; win = 0; cursor = { x: Math.floor(N / 2), y: Math.floor(N / 2) };
    }
    function hexToXY(x, y) {
      return { x: CX + (x - y) * R * SQRT3 / 2, y: CY + (x + y) * R * 3 / 4 };
    }
    function checkWin(p) {
      const v = Array.from({ length: N }, () => Array(N).fill(false));
      const starts = p === 1
        ? Array.from({ length: N }, (_, i) => [i, 0])
        : Array.from({ length: N }, (_, i) => [0, i]);
      for (const [sx, sy] of starts) {
        if (v[sy][sx] || board[sy][sx] !== p) continue;
        const q = [[sx, sy]];
        while (q.length) {
          const [x, y] = q.pop();
          if (v[y][x] || board[y][x] !== p) continue;
          v[y][x] = true;
          if (p === 1 && y === N - 1) return true;
          if (p === 2 && x === N - 1) return true;
          const ns = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x + 1, y - 1], [x - 1, y + 1]]
            .filter(([nx, ny]) => nx >= 0 && nx < N && ny >= 0 && ny < N);
          for (const [nx, ny] of ns) if (!v[ny][nx] && board[ny][nx] === p) q.push([nx, ny]);
        }
      }
      return false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return win !== 0; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (win) return;
        if (turn === 2) {
          const empty = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push([x, y]);
          if (empty.length) {
            const [x, y] = empty[rng.int(empty.length)];
            board[y][x] = 2;
            if (checkWin(2)) { win = 2; api.emit('gameover'); return; }
            turn = 1;
          }
        } else {
          if (p.left && cursor.x > 0) cursor.x--;
          else if (p.right && cursor.x < N - 1) cursor.x++;
          else if (p.up && cursor.y > 0) cursor.y--;
          else if (p.down && cursor.y < N - 1) cursor.y++;
          if (p.a && !board[cursor.y][cursor.x]) {
            board[cursor.y][cursor.x] = 1;
            api.emit('place');
            if (checkWin(1)) { win = 1; api.emit('win'); return; }
            turn = 2;
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const { x: px, y: py } = hexToXY(x, y);
          ctx.fillStyle = board[y][x] === 1 ? '#ff0' : (board[y][x] === 2 ? '#f00' : '#444');
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            const x1 = px + R * Math.cos(a), y1 = py + R * Math.sin(a);
            if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
          }
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        }
        if (!win) {
          const { x: px, y: py } = hexToXY(cursor.x, cursor.y);
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            const x1 = px + (R - 3) * Math.cos(a), y1 = py + (R - 3) * Math.sin(a);
            if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
          }
          ctx.closePath(); ctx.stroke();
        }
      },
      serialize() { return { board, turn, win, cursor: { ...cursor } }; },
    };
  },
};
