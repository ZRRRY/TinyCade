/* ============================================================
   games/laser.js — 激光网格（action）
   - 原版 games-extra.js:2019 — 穿越激光网格到达终点
   - 输入：方向键移动（激光用固定 dt + 三角函数做摆动）
   - 决定论：所有动画由 tick 与 frame 驱动，无 RNG
   ============================================================ */

export default {
  meta: {
    id: 'laser',
    name: '激光网格',
    desc: '穿越激光网格到达终点',
    icon: '🔴',
    cat: 'action',
    controls: '方向键移动 · 别碰激光',
    width: 360,
    height: 480,
  },
  tickHz: 30,

  create(rng, api) {
    const W = 360, H = 480;
    let player, lasers, exit, t, over;

    function reset() {
      player = { x: 20, y: 20 };
      lasers = [];
      t = 0;
      exit = { x: 330, y: 440, w: 24, h: 24 };
      over = false;
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          // 垂直激光：竖条贯穿画布高度，沿 y 轴摆动
          lasers.push({ x: 60 + i * 40, y: 0, w: 4, h: H, phase: i * 0.5, dir: 'v' });
        } else {
          // 水平激光：横条贯穿画布宽度，沿 y 轴摆动
          const y = 80 + i * 60;
          lasers.push({ x: 0, y, w: W, h: 4, phase: i * 0.5, dir: 'h', baseY: y });
        }
      }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        t += 0.05;
        // 玩家移动：方向键 held
        if (input.held.left) player.x -= 5;
        if (input.held.right) player.x += 5;
        if (input.held.up) player.y -= 5;
        if (input.held.down) player.y += 5;

        // 激光摆动
        lasers.forEach((l) => {
          if (l.dir === 'v') l.y = Math.sin(t + l.phase) * 100 + 100;
          if (l.dir === 'h') l.y = Math.sin(t + l.phase) * 60 + l.baseY;
        });

        // 碰撞
        let dead = false;
        lasers.forEach((l) => {
          if (player.x + 8 > l.x && player.x < l.x + l.w &&
              player.y + 8 > l.y && player.y < l.y + l.h) dead = true;
        });
        if (dead) { api.emit('gameover'); reset(); return; }

        // 抵达：完整矩形碰撞检测
        if (player.x + 8 > exit.x && player.x < exit.x + exit.w &&
            player.y + 8 > exit.y && player.y < exit.y + exit.h) {
          api.emit('win'); reset(); return;
        }
      },
      render(ctx) {
        ctx.fillStyle = '#001122'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00ff00'; ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
        ctx.fillStyle = '#ff0000';
        lasers.forEach((l) => ctx.fillRect(l.x, l.y, l.w, l.h));
        ctx.fillStyle = '#00ffff'; ctx.fillRect(player.x, player.y, 8, 8);
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('REACH EXIT', 8, 8);
      },
      serialize() { return { x: player.x, y: player.y, over }; },
    };
  },
};