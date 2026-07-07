/* ============================================================
   games/fruitninja.js — 切水果 FRUIT NINJA（arcade）
   - 原版 games-extra.js:112 — 鼠标/触屏挥动切水果
   - 引擎输入约束：BTN 只有有限按钮；a 键单点切一刀（命中半径内的水果）。
   - 游戏结束条件：60 秒倒计时归零 或 lives=0（切到炸弹）。
   ============================================================ */

export default {
  meta: {
    id: 'fruitninja',
    name: '切水果',
    desc: '挥剑切开飞起的水果，别切到炸弹',
    icon: '🍉',
    cat: 'arcade',
    controls: '鼠标/触屏挥动切水果 · 别切炸弹',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    let fruits, score, lives, timeLeft, frame = 0;
    function spawn() {
      const types = ['🍉', '🍎', '🍊', '🍋', '🍌', '🍇'];
      const isBomb = rng() < 0.15;
      const x = 60 + rng() * (W - 120);
      fruits.push({
        x, y: H + 20,
        vx: (W / 2 - x) * 0.012 + (rng() - 0.5) * 2,
        vy: -14 - rng() * 3,
        g: 0.4, r: 24,
        type: isBomb ? 'bomb' : types[rng.int(types.length)],
        rot: 0,
      });
    }
    function reset() {
      fruits = []; score = 0; lives = 3; timeLeft = 60 * 60; // 60s @ 60Hz
      spawn();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    return {
      events,
      get over() { return lives <= 0 || timeLeft <= 0; },
      update(input) {
        frame++;
        if (this.over) return;
        fruits.forEach((f) => { f.vy += f.g; f.x += f.vx; f.y += f.vy; f.rot += 0.05; });
        fruits = fruits.filter((f) => f.y < H + 40);
        if (rng() < 0.025) spawn();
        if (input.pressed.a) {
          const sx = W * 0.6, sy = H * 0.3;
          fruits = fruits.filter((f) => {
            const dx = f.x - sx, dy = f.y - sy;
            if (dx * dx + dy * dy < f.r * f.r) {
              if (f.type === 'bomb') { lives--; api.emit('explode'); if (lives <= 0) api.emit('gameover'); return false; }
              score += f.type === '🍉' ? 3 : 1; api.emit('swoosh'); return false;
            }
            return true;
          });
        }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#1a0030'; ctx.fillRect(0, 0, W, H);
        fruits.forEach((f) => {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.type, 0, 0);
          ctx.restore();
        });
        for (let i = 0; i < lives; i++) {
          ctx.font = '24px serif'; ctx.textAlign = 'left';
          ctx.fillText('❤', 8 + i * 28, 12);
        }
        ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText('SCORE ' + score, W - 100, 8);
        ctx.fillText('TIME ' + Math.ceil(timeLeft / 60), W - 100, 28);
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, over: this.over }; },
    };
  },
};
