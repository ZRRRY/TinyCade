/* ============================================================
   games/letters.js — 拼字游戏（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:3030 — 用字母拼出目标单词
   - 演示模式：BTN.a 自动猜下一个字母（按字母顺序）；BTN.b 提交猜词。
   ============================================================ */

export default {
  meta: {
    id: 'letters',
    name: '拼字游戏',
    desc: '用字母拼出目标单词',
    icon: '🔤',
    cat: 'puzzle',
    controls: '点击字母拼写',
  },
  tickHz: 10,

  create(rng, api) {
    const WORDS = ['CODE', 'GAME', 'PIXEL', 'ARCADE', 'FUN', 'WIN', 'JUMP', 'STAR'];
    let target, guess, score, over, win, tickFrame, guessIdx;

    function reset() {
      target = WORDS[rng.int(WORDS.length)];
      guess = ''; score = 0; over = false; win = false; tickFrame = 0; guessIdx = 0;
    }
    function stepGuess() {
      if (guess.length >= target.length) {
        if (guess === target) { score++; win = true; over = true; api.emit('win'); }
        else { api.emit('deny'); }
        reset();
        return;
      }
      const ch = target[guessIdx];
      if (ch) guess += ch;
      guessIdx++;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) stepGuess();
        else if (input.pressed.b) { guess = ''; guessIdx = 0; api.emit('beep'); }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#00ffff';
        ctx.font = '32px VT323, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(target, 200, 60);
        ctx.fillText(guess, 200, 110);
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}${win ? ' · WIN' : ''}`, 10, 8);
      },
      serialize() { return { score, target, guess, win, over }; },
    };
  },
};