/* ============================================================
   games/nim.js — 博弈游戏(策略类)
   3 piles [3,5,7]. 取最后一颗者输 (Misère Nim).
   玩家 BTN.a 全取 1 颗, AI 取 1-3. 简化.
   ============================================================ */

export default {
  meta: {
    id: 'nim',
    name: '博弈游戏',
    desc: '取走最后一颗石子者输',
    icon: '🪨',
    cat: 'strategy',
    controls: '← → 选堆 · BTN.a 取 1 颗 · BTN.b 重开',
    width: 360,
    height: 360,
  },
  tickHz: 8,

  create(rng, api) {
    const W = 360, H = 360;
    let piles, turn, cursor, over, frame = 0;

    function reset() {
      piles = [3, 5, 7]; turn = 0; cursor = 0; over = false; // 0=player,1=AI
    }
    function checkEnd() {
      return piles.every((p) => p === 0);
    }
    function aiTake() {
      const opts = [];
      for (let i = 0; i < 3; i++) if (piles[i] > 0) opts.push(i);
      if (!opts.length) return;
      const i = opts[rng.int(opts.length)];
      const n = Math.min(piles[i], 1 + rng.int(3));
      piles[i] -= n;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (over) return;
        if (turn === 0) {
          if (p.left && cursor > 0) cursor--;
          else if (p.right && cursor < 2) cursor++;
          if (p.a && piles[cursor] > 0) {
            piles[cursor]--;
            api.emit('move');
            if (checkEnd()) {
              over = true; api.emit('lose'); // 玩家拿最后一颗 = 输
              return;
            }
            turn = 1;
          }
        }
        // AI 在玩家轮结束后立即走一步
        if (turn === 1 && !over) {
          aiTake();
          api.emit('move');
          if (checkEnd()) { over = true; api.emit('win'); return; }
          turn = 0;
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        piles.forEach((p, i) => {
          ctx.fillStyle = '#ff0066';
          ctx.fillRect(30 + i * 110, 280 - p * 20, 80, Math.max(p * 20, 4));
          ctx.fillStyle = '#fff';
          ctx.font = '20px VT323'; ctx.textAlign = 'center';
          ctx.fillText(String(p), 70 + i * 110, 300 - p * 20);
        });
        if (!over && turn === 0) {
          ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
          ctx.strokeRect(30 + cursor * 110 - 3, 277 - piles[cursor] * 20, 86, piles[cursor] * 20 + 6);
        }
        ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'center';
        ctx.fillText(turn === 0 ? 'YOUR TURN' : 'AI TURN', W / 2, 30);
      },
      serialize() { return { piles: piles.slice(), turn, cursor, over }; },
    };
  },
};
