/* ============================================================
   games/guess.js — 猜数字(casual)
   4 位数字, A 表示位置对, B 表示数字对. 方向键 + BTN 数字 + BTN.a 提交.
   ============================================================ */

import { centerText, pixelText } from '../engine/draw.js';

export default {
  meta: {
    id: 'guess',
    name: '猜数字',
    desc: '4 位数字，A 表示位置对，B 表示数字对',
    icon: '🔐',
    cat: 'casual',
    controls: '方向键 + BTN.up/down 选数字 · BTN.a 加数字 · BTN.b 退格 · BTN.start 提交',
  },
  tickHz: 10,

  create(rng, api) {
    const W = 400, H = 360;
    let target, history, input, cursor, frame = 0;

    function reset() {
      const digits = '0123456789'.split('');
      for (let i = digits.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [digits[i], digits[j]] = [digits[j], digits[i]];
      }
      target = digits.slice(0, 4).join('');
      history = []; input = ['0', '1', '2', '3']; cursor = 0;
    }
    function submit() {
      const guess = input.join('');
      let a = 0, b = 0;
      const tArr = target.split('');
      const usedT = [false, false, false, false];
      const usedG = [false, false, false, false];
      for (let i = 0; i < 4; i++) {
        if (input[i] === tArr[i]) { a++; usedT[i] = true; usedG[i] = true; }
      }
      for (let i = 0; i < 4; i++) {
        if (usedG[i]) continue;
        for (let j = 0; j < 4; j++) {
          if (!usedT[j] && input[i] === tArr[j]) { b++; usedT[j] = true; break; }
        }
      }
      history.unshift({ guess, a, b });
      api.emit('beep');
      if (a === 4) api.emit('win');
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return history.length > 0 && history[0].a === 4; },
      update(input_) {
        const p = input_.pressed;
        if (p.b) { reset(); return; }
        if (p.left && cursor > 0) cursor--;
        else if (p.right && cursor < 3) cursor++;
        // 上/下 改数字
        if (p.up) {
          input[cursor] = String((parseInt(input[cursor], 10) + 1) % 10);
        } else if (p.down) {
          input[cursor] = String((parseInt(input[cursor], 10) + 9) % 10);
        }
        if (p.select) submit(); // select = 提交
        if (p.start) {
          // 重置 input 为下一轮(从 0,1,2,3 开始)
          input = ['0', '1', '2', '3'];
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        centerText(ctx, 'GUESS 4 DIGITS', W / 2, 30, '#00ffff', 24);
        // 显示当前 input
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i === cursor ? '#ff0' : '#1a0030';
          ctx.fillRect(80 + i * 60, 80, 50, 60);
          ctx.fillStyle = '#ffff00'; ctx.font = '36px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(input[i], 105 + i * 60, 110);
        }
        // 历史
        for (let i = 0; i < Math.min(history.length, 8); i++) {
          const h = history[i];
          ctx.fillStyle = '#1a0030';
          ctx.fillRect(60, 170 + i * 22, 280, 20);
          ctx.fillStyle = '#ffff00'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
          ctx.fillText(h.guess.split('').join(' '), 70, 174 + i * 22);
          ctx.fillStyle = '#00ffff';
          ctx.fillText(`${h.a}A${h.b}B`, 240, 174 + i * 22);
        }
        centerText(ctx, `TRIES ${history.length}`, W / 2, 340, '#ff00ff', 14);
      },
      serialize() { return { target, history: history.slice(), input: input.join(''), cursor, over: history[0]?.a === 4 }; },
    };
  },
};
