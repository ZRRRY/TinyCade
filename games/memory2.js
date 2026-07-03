/* ============================================================
   games/memory2.js — 记忆配对(策略类)
   4x4 cards. 方向键 + BTN.a. 限时 30 秒倒计时.
   两张翻开 N 帧后自动翻回(用 frame 计数,确保确定).
   ============================================================ */

export default {
  meta: {
    id: 'memory2',
    name: '记忆配对',
    desc: '翻开两张相同卡',
    icon: '🎴',
    cat: 'strategy',
    controls: '方向键移光标 · BTN.a 翻牌 · BTN.b 重开',
  },
  tickHz: 30,

  create(rng, api) {
    const N = 4, CELL = 80, W = N * CELL, H = N * CELL;
    const SYMS = ['♠', '♥', '♦', '♣', '★', '☆', '●', '○'];
    let cards, flipped, matched, score, time, busyUntil, cursor, frame = 0;

    function reset() {
      cards = [];
      for (let i = 0; i < (N * N) / 2; i++) { cards.push(i); cards.push(i); }
      for (let i = cards.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      flipped = []; matched = new Set(); score = 0; time = 1800; // 60s @ 30Hz
      cursor = 0; busyUntil = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return score === 8 || time <= 0; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (score === 8) return;
        // 倒计时:每 tick -1
        if (time > 0) time--;
        // 处理两卡翻开后的延时(用 frame 计数替代 setTimeout)
        if (busyUntil > 0 && frame >= busyUntil) {
          if (flipped.length === 2 && cards[flipped[0]] !== cards[flipped[1]]) {
            flipped = [];
          }
          busyUntil = 0;
        }
        if (busyUntil > 0) { frame++; return; }
        // 移动
        if (p.left && cursor % N !== 0) cursor--;
        else if (p.right && cursor % N !== N - 1) cursor++;
        else if (p.up && cursor >= N) cursor -= N;
        else if (p.down && cursor < N * (N - 1)) cursor += N;
        if (p.a && !matched.has(cursor) && !flipped.includes(cursor) && flipped.length < 2) {
          flipped.push(cursor);
          api.emit('flip');
          if (flipped.length === 2) {
            const [a, b] = flipped;
            if (cards[a] === cards[b]) {
              matched.add(a); matched.add(b); score++;
              api.emit('blip');
              flipped = [];
            } else {
              busyUntil = frame + 30; // 1 秒后翻回
            }
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < N * N; i++) {
          const x = i % N, y = Math.floor(i / N);
          const show = matched.has(i) || flipped.includes(i);
          if (show) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#000'; ctx.font = '32px VT323'; ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(SYMS[cards[i]], x * CELL + CELL / 2, y * CELL + CELL / 2);
          } else {
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
            ctx.fillStyle = '#fff'; ctx.font = '24px VT323';
            ctx.fillText('?', x * CELL + CELL / 2, y * CELL + CELL / 2);
          }
        }
        const cx = cursor % N, cy = Math.floor(cursor / N);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
        ctx.strokeRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = '#00ffff'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`PAIRS ${score}/8 · TIME ${(time / 30).toFixed(1)}s`, 4, H - 6);
      },
      serialize() {
        return { cards, flipped: [...flipped], matched: [...matched], score, time, over: score === 8 || time <= 0 };
      },
    };
  },
};
