/* ============================================================
   games/ninja.js — 忍者（action）
   - 原版 games-extra.js:1340 — 跳跃挥刀斩杀飞镖
   - 输入：a/space 边沿跳跃（仅着地时）· down held 持续挥刀
   - 决定论：飞镖生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'ninja',
    name: '忍者',
    desc: '跳跃挥刀斩杀飞来的飞镖',
    icon: '🥷',
    cat: 'action',
    controls: '↑/空格 跳跃 · ↓ 挥刀 · 砍飞镖',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    const GROUND_Y = 380;
    let ninja, shuriken, score, vy, slash, over;

    function reset() {
      ninja = { y: GROUND_Y };
      shuriken = []; score = 0; vy = 0; slash = 0; over = false;
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 跳跃：a 边沿，且仅着地时
        if (input.pressed.a && ninja.y >= GROUND_Y) {
          vy = -10; api.emit('jump');
        }
        // 持续挥刀：down held（保留边沿触发风格：按下时一次性激活 slash=15）
        if (input.pressed.down) { slash = 15; api.emit('swoosh'); }

        vy += 0.5; ninja.y += vy;
        if (ninja.y > GROUND_Y) { ninja.y = GROUND_Y; vy = 0; }

        // 飞镖生成
        if (rng() < 0.04) {
          shuriken.push({
            x: W,
            y: 50 + rng.range(0, 350),
            vx: -3 - rng.range(0, 2),
            alive: true,
          });
        }
        shuriken.forEach((s) => { s.x += s.vx; });
        shuriken = shuriken.filter((s) => s.x > -20);

        // 碰撞 + 砍击
        let dead = false;
        shuriken.forEach((s) => {
          if (s.alive && Math.abs(s.x - 50) < 14 && Math.abs(s.y - ninja.y) < 14) {
            if (slash > 0) { s.alive = false; score++; api.emit('hit'); }
            else { api.emit('gameover'); dead = true; }
          }
        });
        if (dead) { over = true; return; }
        if (slash > 0) slash--;
      },
      render(ctx) {
        ctx.fillStyle = '#001a00'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 410, W, 70);
        // 忍者
        ctx.fillStyle = '#fff'; ctx.fillRect(40, ninja.y - 20, 20, 30);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(45, ninja.y - 16, 10, 4);
        // 挥刀弧线
        if (slash > 0) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(60, ninja.y); ctx.lineTo(110, ninja.y - 30); ctx.stroke();
        }
        // 飞镖
        ctx.fillStyle = '#888';
        shuriken.forEach((s) => {
          if (!s.alive) return;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + 10, s.y - 10);
          ctx.lineTo(s.x + 20, s.y);
          ctx.lineTo(s.x + 10, s.y + 10);
          ctx.closePath(); ctx.fill();
        });
        // HUD
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, slash, y: ninja.y, over }; },
    };
  },
};