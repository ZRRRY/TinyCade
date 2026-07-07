/* ============================================================
   games/whackamole.js — 打地鼠（§5.2 样板衍生 · arcade）
   - 原版 games.js:755 — 9 洞口 + 60s 限时 + 点击地鼠
   - update: 点击经由 input.pressed.a 触发 (键盘空格当点击不可行，
     改用 input.pressed.a 模拟鼠标点击 + render 时记录"当前按下点";
     简化模型：a 边沿生成一个虚拟 mallet 围绕屏幕扫一圈)
   - 决定论：地鼠出生/退出都基于 tick; 计时器浮点改为 tick 计数。
   ============================================================ */

export default {
  meta: {
    id: 'whackamole',
    name: '打地鼠',
    desc: '9 个洞口，地鼠乱窜，锤它！',
    icon: '🔨',
    cat: 'arcade',
    controls: '方向键移动光标 · A 敲击 · 限时 60 秒',
  },
  tickHz: 30, // 原版 1000/30 ≈ 33Hz

  create(rng, api) {
    const SIZE = 130;
    // 计算击中位置：从 input.pressed.a 衍生"全局点击"，对全 9 格各检查一次
    // 简化：input.held.left/right/up 用于移动光标，pressed.a 触发点击。
    let moles, score, timeTicks, tickFrame, cursor;
    function reset() {
      moles = Array.from({ length: 9 }, () => ({ up: false, born: 0 }));
      score = 0; timeTicks = 60 * 30; tickFrame = 0; cursor = 4; // 60s @ 30Hz，光标起始于中心
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return timeTicks <= 0; },
      update(input) {
        tickFrame++;
        if (tickFrame % 21 === 0) { // ≈ 每 700ms 出生一只（30Hz 下 21 ticks）
          const idx = rng.int(9);
          moles[idx].up = true; moles[idx].born = tickFrame;
        }
        moles.forEach((m) => {
          if (m.up && tickFrame - m.born > 45) m.up = false; // ~1.5s 后躲回
        });
        // 方向键移动光标，A 键敲击光标所在洞
        if (input.pressed.left && cursor % 3 > 0) cursor--;
        if (input.pressed.right && cursor % 3 < 2) cursor++;
        if (input.pressed.up && cursor >= 3) cursor -= 3;
        if (input.pressed.down && cursor < 6) cursor += 3;
        if (input.pressed.a) {
          const i = cursor;
          if (moles[i].up) { moles[i].up = false; score += 10; api.emit('hit'); }
        }
        if (timeTicks > 0) timeTicks--;
      },
      render(ctx) {
        ctx.fillStyle = '#553300'; ctx.fillRect(0, 0, 400, 400);
        for (let i = 0; i < 9; i++) {
          const x = (i % 3) * SIZE + 20, y = Math.floor(i / 3) * SIZE + 20;
          // 土堆
          ctx.fillStyle = '#332200';
          ctx.beginPath(); ctx.ellipse(x + SIZE / 2, y + SIZE - 20, SIZE / 2 - 10, 30, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#221100'; ctx.fillRect(x + 10, y + SIZE - 30, SIZE - 20, 30);
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.ellipse(x + SIZE / 2, y + SIZE - 20, SIZE / 2 - 20, 22, 0, 0, Math.PI); ctx.fill();
          const m = moles[i];
          if (m.up) {
            const t = Math.min(1, (tickFrame - m.born) / 6);
            const dy = (1 - t) * 50;
            ctx.save();
            ctx.translate(x + SIZE / 2, y + SIZE - 20 + dy);
            ctx.fillStyle = '#aa6633'; ctx.fillRect(-30, -40, 60, 50);
            ctx.fillStyle = '#cc8855'; ctx.fillRect(-25, -55, 50, 30);
            ctx.fillStyle = '#fff'; ctx.fillRect(-15, -50, 8, 8); ctx.fillRect(7, -50, 8, 8);
            ctx.fillStyle = '#000'; ctx.fillRect(-12, -48, 4, 4); ctx.fillRect(10, -48, 4, 4);
            ctx.fillStyle = '#ff00ff'; ctx.fillRect(-3, -38, 6, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(-6, -32, 4, 8); ctx.fillRect(2, -32, 4, 8);
            ctx.restore();
          }
        }
        // 光标框
        {
          const x = (cursor % 3) * SIZE + 20, y = Math.floor(cursor / 3) * SIZE + 20;
          ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 4;
          ctx.strokeRect(x + 4, y + 4, SIZE - 8, SIZE - 8);
        }
      },
      serialize() { return { score, timeTicks: Math.max(0, timeTicks), over: this.over }; },
    };
  },
};
