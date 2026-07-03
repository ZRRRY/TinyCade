/* ============================================================
   games/ringtoss.js — 套圈 RING TOSS（arcade）
   - 原版 games-extra.js:761 — 抛出圆圈套到柱子上
   - 输入：a (空格/点击) 抛出（一次只能一个在飞）
   - 10 圈结束；按命中得分。
   ============================================================ */

export default {
  meta: {
    id: 'ringtoss',
    name: '套圈',
    desc: '把圆圈套到柱子上得分',
    icon: '🎯',
    cat: 'arcade',
    controls: '点击/空格 抛出圆圈 · 时机要准',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let ring, score, pegs, throwsLeft, timeLeft, frame = 0;
    function reset() {
      pegs = [80, 200, 320].map((x) => ({ x, y: 380, hit: false }));
      ring = null; score = 0; throwsLeft = 10;
      timeLeft = 60 * 60;
    }
    function throwR() { ring = { x: W / 2, y: H - 20, vy: -12, r: 30 }; api.emit('swoosh'); throwsLeft--; }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return (throwsLeft <= 0 && ring === null) || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        if (input.pressed.a && !ring) throwR();
        if (ring) {
          ring.vy += 0.5; ring.y += ring.vy;
          if (ring.y > H) ring = null;
          else if (ring.y > 350) {
            for (const p of pegs) {
              if (!p.hit && Math.abs(ring.x - p.x) < 30) { p.hit = true; score += 10; api.emit('win'); ring = null; }
            }
          }
        }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        pegs.forEach((p) => { ctx.fillStyle = p.hit ? '#ff00ff' : '#ffaa00'; ctx.fillRect(p.x - 6, p.y - 30, 12, 60); });
        if (ring) {
          ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4; ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'left';
        ctx.fillText('SCORE ' + score + '  THROWS ' + throwsLeft + '  TIME ' + Math.ceil(timeLeft / 60), 6, 24);
      },
      serialize() { return { score, throwsLeft, timeLeft, over: this.over }; },
    };
  },
};
