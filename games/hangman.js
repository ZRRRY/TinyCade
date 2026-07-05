/* ============================================================
   games/hangman.js — 猜单词（§5.2 样板衍生 · puzzle）
   - 原版 games.js:1453 — 26 字母 + 6 次机会 + 鼠标点击字母
   - [no-mouse-yet]：键盘 a-z 直接猜（keymap 已在 input.js 里只暴露
     BTN.a/b，无法表达字母。本格把字母铺在 render 里，update 只识别
     BTN.a/b 模拟"翻牌"——按 a 自动按概率猜下一个字母）。
     简化：用 BTN.a 顺序猜字母，按出现频率高的优先。
   ============================================================ */

export default {
  meta: {
    id: 'hangman',
    name: '猜单词',
    desc: '经典 Hangman，猜单词拯救小人',
    icon: '🪢',
    cat: 'puzzle',
    controls: '点击字母猜 · 6 次机会',
    width: 480,
    height: 320,
  },
  tickHz: 6, // 不需要快

  create(rng, api) {
    const WORDS = ['PIXEL', 'ARCADE', 'RETRO', 'NINTENDO', 'MARIO', 'TETRIS', 'SNAKE',
                   'SONIC', 'KIRBY', 'ZELDA', 'METROID', 'POKEMON', 'MINECRAFT',
                   'CANNON', 'FOLDER', 'GAMING', 'COMPUTER', 'KEYBOARD'];
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    // 英文常用字母顺序（高频优先），让按 a 自动猜有节奏
    const ORDER = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U',
                   'M', 'W', 'F', 'G', 'Y', 'P', 'B', 'V', 'K', 'J', 'X', 'Q', 'Z'];

    let word, guessed, wrong, over, win, tickFrame, nextGuessIdx;

    function pickNext() {
      for (let i = nextGuessIdx; i < ORDER.length; i++) {
        const l = ORDER[i];
        if (!guessed.has(l)) { nextGuessIdx = i + 1; return l; }
      }
      return null;
    }
    function reset() {
      word = WORDS[rng.int(WORDS.length)];
      guessed = new Set(); wrong = 0; over = false; win = false; tickFrame = 0;
      nextGuessIdx = 0;
    }
    function guess(letter) {
      if (over || guessed.has(letter)) return;
      guessed.add(letter);
      if (!word.includes(letter)) { wrong++; api.emit('error'); }
      else api.emit('blip');
      const solved = word.split('').every((c) => guessed.has(c));
      if (solved) { win = true; over = true; api.emit('win'); }
      else if (wrong >= 6) { over = true; api.emit('gameover'); }
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        // 简化交互：按 a 自动按 ORDER 顺序试下一个字母（按 b 试剩余字母中随机）
        if (input.pressed.a) {
          const l = pickNext();
          if (l) guess(l);
        } else if (input.pressed.b) {
          // 从未猜的字母里随机挑
          const remain = ALPHA.filter((l) => !guessed.has(l));
          if (remain.length) guess(rng.pick(remain));
        }
      },
      render(ctx) {
        const W = 480, H = 320;
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        // 绞架
        ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(50, 280); ctx.lineTo(150, 280); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(100, 280); ctx.lineTo(100, 60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(100, 60); ctx.lineTo(200, 60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(200, 60); ctx.lineTo(200, 100); ctx.stroke();
        // 人
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        if (wrong > 0) { ctx.beginPath(); ctx.arc(200, 120, 20, 0, Math.PI * 2); ctx.stroke(); }
        if (wrong > 1) { ctx.beginPath(); ctx.moveTo(200, 140); ctx.lineTo(200, 220); ctx.stroke(); }
        if (wrong > 2) { ctx.beginPath(); ctx.moveTo(200, 160); ctx.lineTo(170, 190); ctx.stroke(); }
        if (wrong > 3) { ctx.beginPath(); ctx.moveTo(200, 160); ctx.lineTo(230, 190); ctx.stroke(); }
        if (wrong > 4) { ctx.beginPath(); ctx.moveTo(200, 220); ctx.lineTo(170, 260); ctx.stroke(); }
        if (wrong > 5) { ctx.beginPath(); ctx.moveTo(200, 220); ctx.lineTo(230, 260); ctx.stroke(); }
        // 单词显示
        const masked = word.split('').map((c) => guessed.has(c) ? c : '_').join(' ');
        ctx.fillStyle = '#ffff00';
        ctx.font = '24px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(masked, 280, 80);
        // 字母键盘
        ctx.font = '12px "Press Start 2P", monospace';
        for (let i = 0; i < ALPHA.length; i++) {
          const l = ALPHA[i];
          const x = 280 + (i % 9) * 22, y = 160 + Math.floor(i / 9) * 30;
          let color;
          if (!guessed.has(l)) color = '#00ffff';
          else color = word.includes(l) ? '#00aa00' : '#aa0000';
          ctx.fillStyle = color;
          ctx.fillText(l, x, y);
        }
        // HUD
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(`LEFT ${6 - wrong}/6`, 10, 10);
        ctx.fillText(win ? `YOU WIN! ${word}` : over ? `GAME OVER: ${word}` : '', 10, 28);
      },
      serialize() { return { word, wrong, guessed: [...guessed].sort().join(''), win, over }; },
    };
  },
};