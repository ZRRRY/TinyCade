/* ============================================================
   games/catapult.js — 投石机（arcade）
   - 原版 games-extra.js:1152 — ←→ 调角度, ↑↓ 调力度, a 发射
   - 决定论：物理由 vx/vy 推进
   ============================================================ */

export default {
  meta: {
    id: 'catapult',
    name: '投石机',
    desc: '调整角度和力度投石',
    icon: '🪨',
    cat: 'arcade',
    controls: '←→ 调角度 · ↑↓ 力度 · 空格发射',
  },
  tickHz: 60,

  create(rng, api) {
    const W = 480, H = 320;
    let angle, power, rock, targets, score, state, frame = 0;

    function reset() {
      angle = -Math.PI / 4; power = 5;
      rock = null; score = 0; state = 'aim';
      targets = [];
      for (let i = 0; i < 3; i++) targets.push({ x: 250 + i * 60, y: 280, w: 30, h: 40, alive: true });
    }
    function fire() {
      if (state === 'aim') {
        rock = { x: 35, y: 270, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power };
        state = 'fly'; api.emit('shoot');
      }
    }

    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return false; },
      update(input) {
        if (state === 'aim') {
          if (input.held.left) angle = Math.max(-Math.PI / 2, angle - 0.03);
          if (input.held.right) angle = Math.min(0, angle + 0.03);
          if (input.held.up) power = Math.min(10, power + 0.1);
          if (input.held.down) power = Math.max(1, power - 0.1);
        }
        if (input.pressed.a && state === 'aim') fire();
        if (state === 'fly' && rock) {
          rock.vy += 0.2; rock.x += rock.vx; rock.y += rock.vy;
          let hit = false;
          targets.forEach((t) => {
            if (t.alive && rock.x > t.x && rock.x < t.x + t.w && rock.y > t.y && rock.y < t.y + t.h) {
              t.alive = false; score += 10; state = 'aim'; rock = null; hit = true; api.emit('explode');
            }
          });
          if (!hit && (rock.y > H || rock.x > W)) { state = 'aim'; rock = null; }
        }
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, W, 40);
        ctx.fillStyle = '#444'; ctx.fillRect(20, 260, 30, 20);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(35, 270);
        ctx.lineTo(35 + Math.cos(angle) * 30, 270 + Math.sin(angle) * 30);
        ctx.stroke();
        ctx.fillStyle = '#aa4400';
        targets.forEach((t) => { if (t.alive) ctx.fillRect(t.x, t.y, t.w, t.h); });
        if (rock) {
          ctx.fillStyle = '#666';
          ctx.beginPath(); ctx.arc(rock.x, rock.y, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#000'; ctx.font = '14px VT323, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, 8, 8);
      },
      serialize() { return { score, angle, power, state, frame, over: false }; },
    };
  },
};
