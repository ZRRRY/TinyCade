/* ============================================================
   games/gunslinger.js — 枪手（action）
   - 原版 games-extra.js:1801 — 西部决斗先拔枪者胜
   - 输入：a 边沿射击（替代空格/点击）
   - 决定论：等待时间由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'gunslinger',
    name: '枪手',
    desc: '西部决斗先拔枪者胜',
    icon: '🤠',
    cat: 'action',
    controls: '等 BANG! 显示后立刻按 A/空格',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    let state, t, score, over;

    function reset() {
      state = 'wait'; t = 60 + rng.range(0, 120); score = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        if (state === 'wait') {
          t--;
          if (t <= 0) { state = 'bang'; api.emit('shoot'); }
        }

        if (input.pressed.a) {
          if (state === 'wait') {
            api.emit('gameover'); reset(); return;
          }
          if (state === 'bang') {
            score++; api.emit('win'); reset(); return;
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#aa4400'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 160);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 200, W, 120);
        if (state === 'wait') {
          ctx.fillStyle = '#fff'; ctx.fillRect(200, 100, 30, 80);
          ctx.fillStyle = '#000'; ctx.fillRect(205, 100, 20, 8);
        } else if (state === 'bang') {
          ctx.fillStyle = '#ff0'; ctx.font = '80px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('BANG!', W / 2, H / 2);
        }
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`WINS ${score}`, 8, 8);
      },
      serialize() { return { score, state, t, over }; },
    };
  },
};