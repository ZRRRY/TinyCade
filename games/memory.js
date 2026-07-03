/* ============================================================
   games/memory.js — 记忆翻牌(casual)
   4x4 配对, 8 pairs. 方向键 + BTN.a. 限时挑战步数.
   ============================================================ */

export default {
  meta: {
    id: 'memory',
    name: '记忆翻牌',
    desc: '翻开两张相同图案的卡牌，考验记忆',
    icon: '🃏',
    cat: 'casual',
    controls: '方向键移光标 · BTN.a 翻牌 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const N = 4, CELL = 80, W = N * CELL, H = N * CELL;
    const SYMS = ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🥝', '🍍'];
    let cards, flipped, matched, moves, busyUntil, cursor, frame = 0;

    function reset() {
      cards = [];
      for (let i = 0; i < 8; i++) { cards.push(i); cards.push(i); }
      for (let i = cards.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      flipped = []; matched = new Set(); moves = 0; cursor = 0; busyUntil = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return matched.size === 16; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (busyUntil > 0 && frame >= busyUntil) {
          if (flipped.length === 2 && cards[flipped[0]] !== cards[flipped[1]]) flipped = [];
          busyUntil = 0;
        }
        if (busyUntil > 0) { frame++; return; }
        if (p.left && cursor % N !== 0) cursor--;
        else if (p.right && cursor % N !== N - 1) cursor++;
        else if (p.up && cursor >= N) cursor -= N;
        else if (p.down && cursor < N * (N - 1)) cursor += N;
        if (p.a && !matched.has(cursor) && !flipped.includes(cursor) && flipped.length < 2) {
          flipped.push(cursor);
          api.emit('flip');
          if (flipped.length === 2) {
            moves++;
            const [a, b] = flipped;
            if (cards[a] === cards[b]) {
              matched.add(a); matched.add(b);
              api.emit('blip');
              flipped = [];
              if (matched.size === 16) api.emit('win');
            } else {
              busyUntil = frame + 24; // ~0.8s
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < N * N; i++) {
          const x = i % N, y = Math.floor(i / N);
          const show = matched.has(i) || flipped.includes(i);
          if (show) {
            ctx.fillStyle = matched.has(i) ? '#00ff66' : '#aa00ff';
            ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#fff'; ctx.font = '36px serif'; ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(SYMS[cards[i]], x * CELL + CELL / 2, y * CELL + CELL / 2);
          } else {
            ctx.fillStyle = '#2d0050';
            ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#00ffff'; ctx.font = '24px VT323';
            ctx.fillText('?', x * CELL + CELL / 2, y * CELL + CELL / 2);
          }
        }
        const cx = cursor % N, cy = Math.floor(cursor / N);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
        ctx.strokeRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = '#00ffff'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`MOVES ${moves}`, 4, H - 6);
      },
      serialize() { return { cards, moves, matched: matched.size, over: matched.size === 16 }; },
    };
  },
};
