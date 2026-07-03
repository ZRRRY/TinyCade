/* ============================================================
   games/frogjump.js — 青蛙跳（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2858 — 经典 7 格青蛙换位
   - 演示模式：BTN.a 自动选择合法跳，BTN.b 撤销（noop）。
   ============================================================ */

export default {
  meta: {
    id: 'frogjump',
    name: '青蛙跳',
    desc: '经典青蛙过河',
    icon: '🐸',
    cat: 'puzzle',
    controls: '点击青蛙选择 · 再点目标',
  },
  tickHz: 10,

  create(rng, api) {
    const N = 7, CELL = 60;
    let frogs, moves, over, win, tickFrame;

    function reset() {
      frogs = [null, null, null, 'g', 'r', 'r', 'r'];
      moves = 0; over = false; win = false; tickFrame = 0;
    }
    function tryAutoMove() {
      // 优先走 forward：g 向左，r 向右
      for (let i = 0; i < N; i++) {
        if (frogs[i] === 'g') {
          if (i - 1 >= 0 && !frogs[i - 1]) { frogs[i - 1] = 'g'; frogs[i] = null; moves++; api.emit('move'); return true; }
          if (i - 2 >= 0 && !frogs[i - 2] && frogs[i - 1] === 'r') { frogs[i - 2] = 'g'; frogs[i] = null; moves++; api.emit('move'); return true; }
        }
        if (frogs[i] === 'r') {
          if (i + 1 < N && !frogs[i + 1]) { frogs[i + 1] = 'r'; frogs[i] = null; moves++; api.emit('move'); return true; }
          if (i + 2 < N && !frogs[i + 2] && frogs[i + 1] === 'g') { frogs[i + 2] = 'r'; frogs[i] = null; moves++; api.emit('move'); return true; }
        }
      }
      return false;
    }
    function checkWin() {
      return frogs[3] === 'r' && frogs[4] === 'r' && frogs[5] === 'r' && frogs[6] === 'g'
        && frogs.slice(0, 3).every((f) => !f || f === 'r');
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (over) return;
        if (input.pressed.a) {
          if (tryAutoMove()) {
            if (checkWin()) { win = true; over = true; api.emit('win'); }
          }
        }
      },
      render(ctx) {
        const ox = (400 - N * CELL) / 2, oy = 80;
        ctx.fillStyle = '#0a002a'; ctx.fillRect(0, 0, 400, 400);
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = '#1a0033';
          ctx.fillRect(ox + i * CELL + 10, oy, CELL - 20, CELL - 20);
        }
        for (let i = 0; i < N; i++) if (frogs[i]) {
          ctx.fillStyle = frogs[i] === 'g' ? '#00ff00' : '#ff0066';
          ctx.beginPath();
          ctx.arc(ox + i * CELL + CELL / 2, oy + CELL / 2 - 10, 20, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`MOVES ${moves}${win ? ' · WIN' : ''}`, 10, 8);
      },
      serialize() { return { moves, win, over, frogs: frogs.join('') }; },
    };
  },
};