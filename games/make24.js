/* ============================================================
   games/make24.js — 算 24（§5.2 样板衍生 · puzzle）
   - 原版 games-extra.js:2962 — 4 个数字凑 24
   - 演示模式：BTN.a 自动搜索可行解（DFS），找到 +10 重新出题。
   ============================================================ */

export default {
  meta: {
    id: 'make24',
    name: '算 24',
    desc: '用四则运算凑 24',
    icon: '🎲',
    cat: 'puzzle',
    controls: '点击数字和运算符',
  },
  tickHz: 10,

  create(rng, api) {
    let nums, score, over, tickFrame;
    function gen() {
      nums = [];
      while (nums.length < 4) {
        const n = rng.int(13) + 1;
        if (!nums.includes(n)) nums.push(n);
      }
    }
    function solve(ns) {
      if (ns.length === 1) return Math.abs(ns[0] - 24) < 0.001;
      const ops = ['+', '-', '*', '/'];
      for (let i = 0; i < ns.length; i++) {
        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const rest = ns.filter((_, k) => k !== i && k !== j);
          for (const op of ops) {
            const a = ns[i], b = ns[j];
            let r;
            if (op === '+') r = a + b;
            else if (op === '-') r = a - b;
            else if (op === '*') r = a * b;
            else if (op === '/') {
              if (b === 0) continue;
              r = a / b;
            }
            if (solve([...rest, r])) return true;
          }
        }
      }
      return false;
    }
    function reset() {
      gen(); score = 0; over = false; tickFrame = 0;
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        tickFrame++;
        if (input.pressed.a) {
          if (solve(nums)) { score += 10; api.emit('win'); }
          else { api.emit('deny'); }
          gen();
        }
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#00ffff';
        ctx.font = '24px VT323, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        nums.forEach((n, i) => {
          ctx.fillStyle = '#ff0066';
          ctx.fillRect(50 + i * 80, 100, 60, 60);
          ctx.fillStyle = '#fff';
          ctx.fillText(n, 80 + i * 80, 140);
        });
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE ${score} · BTN.A: SOLVE`, 10, 10);
      },
      serialize() { return { score, nums: nums.join(','), over }; },
    };
  },
};