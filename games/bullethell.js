/* ============================================================
   games/bullethell.js — 弹幕地狱（action）
   - 原版 games-extra.js:1434 — 在弹幕中求生
   - 输入：方向键移动玩家（鼠标驱动 [no-mouse-yet] 暂用键盘）
   - 决定论：弹幕扇形生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'bullethell',
    name: '弹幕地狱',
    desc: '在弹幕中求生',
    icon: '✨',
    cat: 'action',
    controls: '方向键移动 · 躲避弹幕',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 480;
    let player, bullets, score, over;

    function reset() {
      player = { x: 200, y: 400, r: 6 };
      bullets = []; score = 0; over = false;
    }

    function spawn() {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        bullets.push({ x: 200, y: 100, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 });
      }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 方向键移动玩家
        if (input.held.up) player.y -= 3;
        if (input.held.down) player.y += 3;
        if (input.held.left) player.x -= 3;
        if (input.held.right) player.x += 3;
        player.x = Math.max(0, Math.min(W, player.x));
        player.y = Math.max(0, Math.min(H, player.y));

        // 弹幕生成
        if (rng() < 0.02) spawn();

        bullets.forEach((b) => { b.x += b.vx; b.y += b.vy; });
        bullets = bullets.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

        // 碰撞
        for (const b of bullets) {
          if (Math.abs(b.x - player.x) < 8 && Math.abs(b.y - player.y) < 8) {
            over = true; api.emit('gameover'); return;
          }
        }
        score++;
      },
      render(ctx) {
        ctx.fillStyle = '#000010'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffff00';
        bullets.forEach((b) => {
          ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#00ffff';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${Math.floor(score / 60)}s`, 8, 8);
      },
      serialize() { return { score, x: player.x, y: player.y, over }; },
    };
  },
};