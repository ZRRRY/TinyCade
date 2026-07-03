/* ============================================================
   games/runner.js — 跑步者 RUNNER（arcade）
   - 原版 games-extra.js:607 — 三车道跑步，躲避车辆
   - 输入：left/right 切换车道；a (上箭头) 跳跃
   - 90s 时间限制；lives=3。
   ============================================================ */

export default {
  meta: {
    id: 'runner',
    name: '跑步者',
    desc: '三车道跑步，躲避车辆',
    icon: '🏃',
    cat: 'arcade',
    controls: '← → 切换车道 · ↑ 跳跃',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480, LANE = 120;
    let player, cars, score, jumpT, lives, timeLeft, frame = 0;
    function reset() {
      player = { lane: 1, y: 380 };
      cars = []; score = 0; jumpT = 0; lives = 3;
      timeLeft = 90 * 60;
    }
    function spawn() {
      const lane = rng.int(3);
      cars.push({ lane, y: -40, c: ['#ff00ff', '#00ffff', '#ffff00'][rng.int(3)] });
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return lives <= 0 || timeLeft <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        if (input.pressed.left) player.lane = Math.max(0, player.lane - 1);
        if (input.pressed.right) player.lane = Math.min(2, player.lane + 1);
        if (input.pressed.a && jumpT === 0) { jumpT = 30; api.emit('jump'); }
        score++;
        if (score % 30 === 0) spawn();
        cars.forEach((c) => { c.y += 6; });
        cars = cars.filter((c) => c.y < H + 40);
        for (const c of cars) {
          if (c.lane === player.lane && Math.abs(c.y - player.y) < 30) {
            lives--; api.emit('gameover');
            if (lives <= 0) return;
            cars.splice(cars.indexOf(c), 1);
            break;
          }
        }
        if (jumpT > 0) jumpT--;
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i === player.lane ? '#444' : '#333';
          ctx.fillRect(i * LANE, 0, LANE, H);
          ctx.fillStyle = '#888'; ctx.fillRect(i * LANE + LANE - 2, 0, 2, H);
        }
        cars.forEach((c) => { ctx.fillStyle = c.c; ctx.fillRect(c.lane * LANE + 20, c.y, 80, 40); });
        ctx.fillStyle = '#00ff00';
        const py = player.y - (jumpT > 0 ? 30 : 0);
        ctx.fillRect(player.lane * LANE + 50, py, 20, 40);
      },
      serialize() { return { score, lives: Math.max(0, lives), timeLeft, over: this.over }; },
    };
  },
};
