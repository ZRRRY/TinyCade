/* ============================================================
   games/swordslash.js — 剑斩（action）
   - 原版 games-extra.js:1746 — 点击屏幕上飞来的物体斩断
   - 输入：a 边沿斩击屏幕中点 [no-mouse-yet]（鼠标点击改成 a 键，砍中点附近所有 item）
   - 决定论：物品生成由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'swordslash',
    name: '剑斩',
    desc: '点击屏幕上飞来的物体斩断',
    icon: '🗡️',
    cat: 'action',
    controls: 'A/空格 斩切',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 480;
    let items, score, combo, over;

    function reset() {
      items = []; score = 0; combo = 0; over = false;
    }

    function spawn() {
      items.push({
        x: rng.range(0, W),
        y: -20,
        vy: 1 + rng.range(0, 3),
        type: rng() < 0.15 ? 'bomb' : 'fruit',
        rot: 0,
      });
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        items.forEach((it) => { it.y += it.vy; it.rot += 0.05; });
        items = items.filter((it) => it.y < H + 30);
        if (rng() < 0.04) spawn();

        // 斩击：a 边沿，砍中屏幕中点附近所有 item（[no-mouse-yet] 简化策略）
        if (input.pressed.a) {
          const cx = W / 2, cy = H / 2;
          items = items.filter((it) => {
            if (Math.abs(it.x - cx) < 30 && Math.abs(it.y - cy) < 30) {
              if (it.type === 'bomb') { api.emit('explode'); combo = 0; return false; }
              else { api.emit('swoosh'); score += 10; combo++; return false; }
            }
            return true;
          });
        }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        items.forEach((it) => {
          ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
          ctx.fillStyle = it.type === 'bomb' ? '#000' : '#ff0066';
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = it.type === 'bomb' ? '#ff0000' : '#ffaa00';
          ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.type === 'bomb' ? '💣' : '🍎', 0, 0);
          ctx.restore();
        });
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score} | COMBO ${combo}`, 8, 8);
      },
      serialize() { return { score, combo, items: items.length, over }; },
    };
  },
};