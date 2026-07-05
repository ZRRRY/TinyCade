/* ============================================================
   games/jumperp.js — 跳跳人(casual)
   BTN.a 跳 + 方向键改变落点 (基于当前 frog 位置就近前/后跳).
   ============================================================ */

export default {
  meta: {
    id: 'jumperp',
    name: '跳跳人',
    desc: '点击跳到对岸',
    icon: '🦘',
    cat: 'casual',
    controls: 'BTN.left/right 选水平 · BTN.a 跳 · BTN.b 重开',
    width: 360,
    height: 200,
  },
  tickHz: 10,

  create(rng, api) {
    const W = 360, H = 200;
    let frog, target, jumps, won, frame = 0;

    function reset() {
      frog = { x: 30, y: 100 }; target = { x: 330, y: 100 }; jumps = 0; won = false;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return won; },
      update(input) {
        const p = input.pressed;
        if (p.b) { reset(); return; }
        if (p.left && frog.x > 40) frog.x -= 30;
        else if (p.right && frog.x < 320) frog.x += 30;
        if (p.a) {
          frog.x += (rng() < 0.5 ? -10 : 10); // 加点 rng 抖动让重复路径结果不同
          jumps++;
          api.emit('jump');
          if (Math.abs(frog.x - target.x) < 30 && Math.abs(frog.y - target.y) < 30) {
            won = true; api.emit('win');
          }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a002a'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#552200'; ctx.fillRect(0, 80, 20, 40);
        ctx.fillRect(W - 20, 80, 20, 40);
        ctx.fillStyle = '#00ff00';
        ctx.beginPath(); ctx.arc(frog.x, frog.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffff00';
        ctx.beginPath(); ctx.arc(target.x, target.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00ffff'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`JUMPS ${jumps}`, 4, 18);
      },
      serialize() { return { frog, jumps, won }; },
    };
  },
};
