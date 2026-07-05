/* ============================================================
   games/fishing.js — 钓鱼(casual)
   hook 状态机. BTN.a 提竿. fish 用 rng 决定咬钩时机.
   ============================================================ */

export default {
  meta: {
    id: 'fishing',
    name: '钓鱼',
    desc: '等鱼咬钩后及时提竿',
    icon: '🎣',
    cat: 'casual',
    controls: 'BTN.a 提竿 · BTN.b 重开',
    width: 360,
    height: 480,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 360, H = 480;
    let hook, fishes, score, tick, over, frameNum = 0;

    function reset() {
      hook = { y: 50, state: 'wait' };
      fishes = [];
      for (let i = 0; i < 5; i++) {
        fishes.push({ x: rng.int(W), y: 300 + rng.int(100), alive: true, t: rng.int(100) });
      }
      score = 0; tick = 0; over = false;
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
        // 时限:60秒
        tick++;
        if (tick >= 1800) { over = true; return; }
        fishes.forEach((f) => { f.t += 0.5; f.x += Math.sin(f.t) * 0.1; });
        if (hook.state === 'wait') {
          if (rng() < 0.005) hook.state = 'bite';
        } else if (hook.state === 'bite') {
          if (rng() < 0.02) { hook.state = 'gone'; api.emit('deny'); }
        } else if (hook.state === 'pulling') {
          hook.y -= 4;
          const f = fishes.find((f) => f.alive && Math.abs(f.x - 180) < 20 && Math.abs(f.y - hook.y) < 20);
          if (f) {
            f.alive = false; score += 10; api.emit('win');
            hook.state = 'wait'; hook.y = 50;
          }
          if (hook.y < 50) hook.state = 'wait';
        } else if (hook.state === 'gone') {
          hook.state = 'wait'; // 1 秒后回 wait
        }
        if (p.a && hook.state === 'bite') { hook.state = 'pulling'; api.emit('swoosh'); }
        else if (p.a && hook.state === 'gone') hook.state = 'wait';
        frameNum++;
      },
      render(ctx) {
        ctx.fillStyle = '#001a4d'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#0066ff'; ctx.fillRect(0, 250, W, 230);
        fishes.forEach((f) => {
          if (f.alive) {
            ctx.fillStyle = '#aaa';
            ctx.beginPath(); ctx.ellipse(f.x, f.y, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(f.x + 12, f.y); ctx.lineTo(f.x + 18, f.y - 4); ctx.lineTo(f.x + 18, f.y + 4);
            ctx.closePath(); ctx.fill();
          }
        });
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(180, hook.y); ctx.stroke();
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(180, hook.y, 4, 0, Math.PI * 2); ctx.fill();
        if (hook.state === 'bite') {
          ctx.fillStyle = '#f00'; ctx.font = '20px VT323'; ctx.textAlign = 'center';
          ctx.fillText('!', 180, hook.y - 10);
        }
        ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText(`FISH ${score} | ${Math.ceil((1800 - tick) / 30)}s`, 4, 18);
      },
      serialize() { return { score, tick, hookState: hook.state }; },
    };
  },
};
