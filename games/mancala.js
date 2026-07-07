/* ============================================================
   games/mancala.js — 曼卡拉（策略类）
   6 pits per side. 方向键选 pit + BTN.a 播撒. 玩家 vs 简单 AI.
   简化规则:每轮播撒,跳过对方基地.
   ============================================================ */

import { centerText, pixelText } from '../engine/draw.js';

export default {
  meta: {
    id: 'mancala',
    name: '曼卡拉',
    desc: '播撒种子到对方基地',
    icon: '🌰',
    cat: 'strategy',
    controls: '← → 选坑 · BTN.a 播撒 · BTN.b 重开',
  },
  tickHz: 5,

  create(rng, api) {
    const PITS = 6, W = 480, H = 240;
    let pits, turn, cursor, over, frame = 0;
    // pits[0..5]=top, pits[6]=topBase, pits[7..12]=bottom, pits[13]=bottomBase

    function reset() {
      pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
      turn = 1; cursor = 0; over = false; // 玩家底部 pit 7..12, 用 cursor 0..5 表示
    }
    function validPlayer(i) { return pits[7 + i] > 0; }
    function pickAi() {
      const opts = [];
      for (let i = 0; i < 6; i++) if (pits[i] > 0) opts.push(i);
      return opts.length ? opts[rng.int(opts.length)] : -1;
    }
    function sow(start) {
      let pos = start;
      const owner = start >= 7 ? 1 : 0;
      const skip = owner === 1 ? 6 : 13;
      const n = pits[start]; pits[start] = 0;
      for (let k = 0; k < n; k++) {
        pos = (pos + 1) % 14;
        if (pos === skip) pos = (pos + 1) % 14;
        pits[pos]++;
      }
      // 落对方最后一粒且为空 → 捕获(简化版,无)
      return pos;
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
        if (turn === 2) {
          const ai = pickAi();
          if (ai < 0) { over = true; return; }
          const end = sow(ai);
          api.emit('place');
          // AI 最后一粒落回自己基地 → 再走
          if (end !== 6) turn = 1;
        } else {
          if (p.left && cursor > 0) cursor--;
          else if (p.right && cursor < 5) cursor++;
          if (p.a && validPlayer(cursor)) {
            sow(7 + cursor);
            api.emit('place');
            // 检查结束
            const topEmpty = [0, 1, 2, 3, 4, 5].every((i) => !pits[i]);
            const botEmpty = [0, 1, 2, 3, 4, 5].every((i) => !pits[7 + i]);
            if (topEmpty && botEmpty) {
              over = true; api.emit('gameover');
            } else turn = 2;
          }
        }
        // 简单结束条件:一列全空
        const topEmpty = [0, 1, 2, 3, 4, 5].every((i) => !pits[i]);
        const botEmpty = [0, 1, 2, 3, 4, 5].every((i) => !pits[7 + i]);
        if (topEmpty || botEmpty) over = true;
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        // 顶部 6 pit (从右到左,显示 pits[0..5])
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#552200' : '#884400';
          ctx.fillRect(40 + i * 60, 30, 50, 70);
          centerText(ctx, String(pits[i]), 65 + i * 60, 50, '#fff', 24);
        }
        // 底部 6 pit
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#552200' : '#884400';
          ctx.fillRect(40 + i * 60, 140, 50, 70);
          centerText(ctx, String(pits[7 + i]), 65 + i * 60, 160, '#fff', 24);
          // 玩家光标
          if (turn === 1 && cursor === i) {
            ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
            ctx.strokeRect(40 + i * 60 - 3, 140 - 3, 56, 76);
          }
        }
        // 底部基地 (玩家) pits[13]
        ctx.fillStyle = '#000088'; ctx.fillRect(400, 30, 60, 180);
        centerText(ctx, String(pits[13]), 430, 100, '#fff', 32);
        // 顶部基地 pits[6]
        ctx.fillStyle = '#000088'; ctx.fillRect(20, 30, 60, 180);
        centerText(ctx, String(pits[6]), 50, 100, '#fff', 32);
      },
      serialize() { return { pits: pits.slice(), turn, cursor, over }; },
    };
  },
};
