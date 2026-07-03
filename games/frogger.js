/* ============================================================
   games/frogger.js — 青蛙过河 FROGGER（arcade）
   - 原版 games-extra.js:289 — 14 行网格 + 车流 + 木筏
   - 输入：up/down/left/right 移动；a 重置 (start)
   - 60 秒倒计时归零即游戏结束；同时计 5 次成功到达顶部为胜利。
   ============================================================ */

export default {
  meta: {
    id: 'frogger',
    name: '青蛙过河',
    desc: '帮助青蛙穿过车流和河流',
    icon: '🐸',
    cat: 'arcade',
    controls: '方向键移动 · 避免被车撞和掉水里',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480, ROW = 30, COLS = 12;
    let frog, cars, logs, frame = 0, winLaps = 0, timeLeft;
    function reset() {
      frog = { x: 6, y: 13, onLog: null };
      cars = []; logs = [];
      for (let r = 0; r < 5; r++)
        for (let i = 0; i < 2; i++)
          cars.push({ x: i * 6 + (r % 2 ? 0 : 3), y: 11 - r, vx: (r % 2 ? 1 : -1) * (0.5 + r * 0.15), c: ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#88ff00'][r] });
      for (let r = 0; r < 5; r++)
        for (let i = 0; i < 2; i++)
          logs.push({ x: i * 6 + (r % 2 ? 2 : 0), y: r, vx: (r % 2 ? -1 : 1) * (0.3 + r * 0.1), len: 2 + rng.int(2) });
    }
    function fullReset() {
      reset();
      winLaps = 0;
      timeLeft = 60 * 60;
    }
    fullReset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return timeLeft <= 0 || winLaps >= 5; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        let nx = frog.x, ny = frog.y;
        if (input.pressed.up) ny--;
        else if (input.pressed.down) ny++;
        else if (input.pressed.left) nx--;
        else if (input.pressed.right) nx++;
        if (nx !== frog.x || ny !== frog.y) { frog.x = nx; frog.y = ny; api.emit('move'); }
        frog.x = Math.max(0, Math.min(11, frog.x));
        frog.y = Math.max(0, Math.min(13, frog.y));
        cars.forEach((c) => { c.x += c.vx * 0.05; if (c.x < -2) c.x = 13; if (c.x > 13) c.x = -2; });
        logs.forEach((l) => { l.x += l.vx * 0.05; if (l.x < -4) l.x = 13; if (l.x > 14) l.x = -4; });
        if (frog.y < 5) {
          const log = logs.find((l) => l.y === frog.y && frog.x >= l.x && frog.x <= l.x + l.len);
          if (log) { frog.x += log.vx * 0.05; frog.onLog = log; }
          else { api.emit('hit'); reset(); }
          if (frog.x < 0 || frog.x > COLS) { api.emit('hit'); reset(); }
        } else { frog.onLog = null; }
        for (const c of cars) {
          if (c.y === frog.y && Math.abs(c.x - frog.x) < 1) { api.emit('hit'); reset(); break; }
        }
        if (frog.y === 0) { api.emit('win'); winLaps++; reset(); }
        timeLeft--;
      },
      render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < 14; y++) {
          ctx.fillStyle = y === 0 ? '#88ff00' : (y < 5 ? '#003366' : (y === 12 ? '#444' : '#1a3'));
          ctx.fillRect(0, y * ROW, W, ROW);
        }
        cars.forEach((c) => { ctx.fillStyle = c.c; ctx.fillRect(c.x * 30, c.y * ROW, 30, 28); });
        logs.forEach((l) => { ctx.fillStyle = '#884400'; ctx.fillRect(l.x * 30, l.y * ROW, l.len * 30, 28); });
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(frog.x * 30 + 8, frog.y * ROW + 6, 14, 18);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
        ctx.fillText('LAPS ' + winLaps + '/5  TIME ' + Math.ceil(timeLeft / 60), 6, 14);
      },
      serialize() { return { frogX: frog.x, frogY: frog.y, winLaps, timeLeft, over: this.over }; },
    };
  },
};
