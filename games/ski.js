/* ============================================================
   games/ski.js — 滑雪 SKI（arcade）
   - 原版 games-extra.js:556 — 左右躲避障碍物滑下雪山
   - 输入：left/right (A/D) 转向；a/start 重开
   - lives=3，每次碰撞损失一条；3 条用完即结束。
   ============================================================ */

export default {
  meta: {
    id: 'ski',
    name: '滑雪',
    desc: '左右躲避障碍物滑下雪山',
    icon: '⛷️',
    cat: 'arcade',
    controls: '← → 转向 · 越久越快',
    width: 360,
    height: 480,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 360, H = 480;
    let skier, trees, score, speed, lives, frame = 0;
    function reset() {
      skier = { x: 180, y: 400, a: 0 };
      trees = []; score = 0; speed = 3; lives = 3;
    }
    function spawn() { trees.push({ x: rng() * W, y: -20, t: rng() < 0.5 ? 'tree' : 'rock' }); }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);
    function isOver() { return lives <= 0; }
    return {
      events,
      get over() { return isOver(); },
      update(input) {
        frame++;
        if (isOver()) return;
        skier.a *= 0.9;
        if (input.held.left) skier.a -= 0.02;
        if (input.held.right) skier.a += 0.02;
        skier.x += skier.a * 8;
        skier.x = Math.max(10, Math.min(W - 10, skier.x));
        score += speed;
        if (score % 200 < speed) spawn();
        trees.forEach((t) => { t.y += speed; });
        trees = trees.filter((t) => t.y < H + 30);
        for (const t of trees) {
          if (Math.abs(t.x - skier.x) < 14 && Math.abs(t.y - skier.y) < 14) {
            lives--; api.emit('gameover');
            if (lives <= 0) return;
            skier.x = 180; skier.a = 0; trees = trees.filter((tt) => tt.y < -50 || tt.y > 100);
            return;
          }
        }
        if (score % 1000 < speed) speed += 0.2;
      },
      render(ctx) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 40) { ctx.fillStyle = y % 80 === 0 ? '#ddd' : '#eee'; ctx.fillRect(0, y, W, 40); }
        trees.forEach((t) => {
          if (t.t === 'tree') { ctx.fillStyle = '#0a0'; ctx.fillRect(t.x - 6, t.y - 12, 12, 18); ctx.fillRect(t.x - 2, t.y - 18, 4, 6); }
          else { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(skier.x - 4, skier.y - 6, 8, 12);
        ctx.fillStyle = '#000'; ctx.fillRect(skier.x - 6, skier.y + 4, 12, 2);
      },
      serialize() { return { score: Math.floor(score), lives: Math.max(0, lives), over: this.over }; },
    };
  },
};
