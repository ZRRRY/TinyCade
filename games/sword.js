/* ============================================================
   games/sword.js — 剑客对决（action）
   - 原版 games-extra.js:1280 — 快速反应格挡
   - 输入：方向键 held 设 block；a 边沿触发反击（仅 counter 阶段）
   - 决定论：敌人出招时机 / 方向 / 反击命中均由 rng 推进
   ============================================================ */

export default {
  meta: {
    id: 'sword',
    name: '剑客对决',
    desc: '快速反应格挡，斩击对手',
    icon: '⚔️',
    cat: 'action',
    controls: '↑↓←→ 防御方向 · 空格反击 · 时机要准',
    width: 480,
    height: 320,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    const DIRS = ['up', 'down', 'left', 'right'];
    let me, enemy, phase, attackDir, attackT, block, hp, ehp, score, over, frame = 0;

    function reset() {
      me = { x: 100, y: 160 };
      enemy = { x: 380, y: 160 };
      phase = 'wait'; attackDir = null; attackT = 0; block = null;
      hp = 3; ehp = 3; score = 0; over = false;
    }
    function startAttack() { phase = 'incoming'; attackDir = DIRS[rng.int(4)]; attackT = 60; }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        frame++;
        // block 由方向键 held 推断（last pressed direction wins）
        if (input.held.up) block = 'up';
        else if (input.held.down) block = 'down';
        else if (input.held.left) block = 'left';
        else if (input.held.right) block = 'right';
        else if (!input.held.up && !input.held.down && !input.held.left && !input.held.right) block = null;

        if (phase === 'wait') {
          if (rng() < 0.01) startAttack();
        } else if (phase === 'incoming') {
          attackT--;
          if (attackT === 0) {
            if (block === attackDir) {
              api.emit('powerup'); phase = 'counter';
            } else {
              hp--; api.emit('hit');
              if (hp <= 0) { over = true; api.emit('gameover'); return; }
              phase = 'wait';
            }
          }
        } else if (phase === 'counter') {
          if (rng() < 0.05) {
            ehp--; score++; api.emit('hit');
            if (ehp <= 0) { over = true; api.emit('win'); return; }
            phase = 'wait';
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00ffff'; ctx.fillRect(me.x - 12, me.y - 20, 24, 40);
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(enemy.x - 12, enemy.y - 20, 24, 40);
        if (phase === 'incoming') {
          ctx.fillStyle = '#ff0000';
          if (attackDir === 'up') ctx.fillRect(enemy.x - 30, enemy.y - 60, 60, 4);
          if (attackDir === 'down') ctx.fillRect(enemy.x - 30, enemy.y + 30, 60, 4);
          if (attackDir === 'left') ctx.fillRect(enemy.x - 60, enemy.y - 30, 4, 60);
          if (attackDir === 'right') ctx.fillRect(enemy.x + 30, enemy.y - 30, 4, 60);
        }
        if (block) {
          ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 4;
          if (block === 'up') { ctx.beginPath(); ctx.moveTo(me.x, me.y - 20); ctx.lineTo(me.x, me.y - 50); ctx.stroke(); }
          if (block === 'down') { ctx.beginPath(); ctx.moveTo(me.x, me.y + 20); ctx.lineTo(me.x, me.y + 50); ctx.stroke(); }
          if (block === 'left') { ctx.beginPath(); ctx.moveTo(me.x - 12, me.y); ctx.lineTo(me.x - 40, me.y); ctx.stroke(); }
          if (block === 'right') { ctx.beginPath(); ctx.moveTo(me.x + 12, me.y); ctx.lineTo(me.x + 40, me.y); ctx.stroke(); }
        }
        ctx.fillStyle = '#fff'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`HP ${hp} | ENEMY ${ehp} | ${score} WINS`, 8, 8);
      },
      serialize() { return { score, hp, ehp, phase, frame, over }; },
    };
  },
};