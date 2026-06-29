/* ============================================================
   TINYCADE - 扩展游戏库（91 款）
   ============================================================ */

// ============================================================
// 21. 恐龙跳 DINO
// ============================================================
Games.define('dino', {
  name: '恐龙跳',
  desc: '像素小恐龙跳过仙人掌',
  icon: '🦖',
  cat: 'arcade',
  controls: '空格/上箭头 跳跃 · 下蹲躲避飞行物'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 240);
  const W = 480, H = 240, GROUND = 200;
  let dino, obs, cloud, score, best, speed, state, loop, duck;
  try { const raw = localStorage.getItem('pixel-arcade'); const obj = raw ? JSON.parse(raw) : {}; best = obj && Number.isFinite(obj.dinoBest) ? obj.dinoBest : 0; } catch (e) { best = 0; }
  function reset() {
    dino = { x: 60, y: GROUND - 40, vy: 0, h: 40, w: 36 };
    obs = []; cloud = []; score = 0; speed = 5; state = 'ready'; duck = false;
    for (let i = 0; i < 3; i++) cloud.push({ x: Math.random() * W, y: 30 + Math.random() * 60 });
    updateHUD();
  }
  function jump() {
    if (state === 'ready') { state = 'play'; Sounds.sfx.start(); }
    if (state === 'play' && dino.y >= GROUND - dino.h) { dino.vy = -12; Sounds.sfx.jump(); }
    if (state === 'over') { Sounds.sfx.start(); reset(); state = 'play'; }
  }
  function spawn() {
    const tall = Math.random() < 0.3;
    obs.push({ x: W, w: 12 + Math.floor(Math.random() * 10), h: tall ? 48 : 28, fly: Math.random() < 0.2 && score > 50 });
  }
  function rects() {
    const r = [{ x: dino.x, y: dino.y, w: dino.w, h: dino.h }];
    obs.forEach(o => r.push({ x: o.x, y: GROUND - o.h, w: o.w, h: o.h }));
    return r;
  }
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function update() {
    if (state !== 'play') return;
    dino.vy += 0.6; dino.y += dino.vy;
    if (dino.y > GROUND - dino.h) { dino.y = GROUND - dino.h; dino.vy = 0; }
    if (score > 0 && score % 80 === 0) speed += 0.4;
    score++;
    if (score % 60 === 0) spawn();
    obs.forEach(o => o.x -= speed);
    obs = obs.filter(o => o.x + o.w > 0);
    cloud.forEach(c => c.x -= speed * 0.3);
    cloud.forEach(c => { if (c.x < -20) { c.x = W + 20; c.y = 30 + Math.random() * 60; } });
    const me = { x: dino.x, y: dino.y, w: dino.w, h: duck ? 24 : dino.h };
    for (const o of obs) {
      if (hit(me, { x: o.x, y: o.h >= 36 && o.fly ? GROUND - 70 : GROUND - o.h, w: o.w, h: o.h })) {
        state = 'over'; Sounds.sfx.hit();
        if (score > best) { best = score; try { const raw = localStorage.getItem('pixel-arcade'); const obj = raw ? JSON.parse(raw) : {}; obj.dinoBest = best; localStorage.setItem('pixel-arcade', JSON.stringify(obj)); } catch (e) {} }
        updateHUD(); break;
      }
    }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#fff');
    ctx.fillStyle = '#888'; cloud.forEach(c => { ctx.fillRect(c.x, c.y, 30, 6); ctx.fillRect(c.x + 8, c.y - 4, 14, 4); });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillRect(dino.x + 4, dino.y + 8, 8, 8);
    ctx.fillRect(dino.x + 12, dino.y, 12, 8);
    ctx.fillRect(dino.x + 20, dino.y + 8, 8, 8);
    ctx.fillRect(dino.x + 28, dino.y + 16, 8, 8);
    ctx.fillRect(dino.x, dino.y + 24, 8, 16);
    if (!duck) ctx.fillRect(dino.x, dino.y + 8, 4, 8);
    obs.forEach(o => {
      ctx.fillStyle = '#000';
      if (o.h >= 36 && !o.fly) {
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        ctx.fillRect(o.x - 2, GROUND - o.h - 4, 4, 4);
      } else {
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
      }
    });
    Games.text(ctx, 'SCORE ' + score, W - 120, 8, 16, '#888', 'VT323', 'left');
    Games.text(ctx, 'HI ' + best, W - 120, 26, 16, '#888', 'VT323', 'left');
    if (state === 'ready') { Games.text(ctx, 'PRESS SPACE TO START', W/2, H/2 - 12, 18, '#666', 'VT323', 'center'); }
    if (state === 'over') { Games.text(ctx, 'GAME OVER - SPACE TO RETRY', W/2, H/2 - 12, 18, '#000', 'VT323', 'center'); }
  }
  function updateHUD() {
    hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
    status.textContent = state === 'over' ? 'GAME OVER' : (state === 'ready' ? 'READY' : '');
  }
  const handler = Games.key({
    ' ': () => jump(),
    'arrowup': () => jump(),
    'arrowdown': () => { if (state === 'play') duck = true; },
    'r': () => { Sounds.sfx.start(); reset(); state = 'play'; }
  });
  reset();
  window.addEventListener('keydown', handler);
  const onKeyUp = (e) => { if (e.key === 'ArrowDown') duck = false; };
  window.addEventListener('keyup', onKeyUp);
  const onClick = () => jump();
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('touchstart', onClick, { passive: false });
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); window.removeEventListener('keyup', onKeyUp); canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('touchstart', onClick); };
});

// ============================================================
// 22. 水果忍者 FRUIT NINJA (西瓜切切)
// ============================================================
Games.define('fruitninja', {
  name: '切水果',
  desc: '挥剑切开飞起的水果，别切到炸弹',
  icon: '🍉',
  cat: 'arcade',
  controls: '鼠标/触屏挥动切水果 · 别切炸弹'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let fruits, score, lives, trail, loop;
  function reset() { fruits = []; score = 0; lives = 3; trail = []; updateHUD(); spawn(); }
  function spawn() {
    const x = 60 + Math.random() * (W - 120);
    const fruit = { x, y: H + 20, vx: (W/2 - x) * 0.012 + (Math.random() - 0.5) * 2, vy: -14 - Math.random() * 3, g: 0.4, r: 24, type: Math.random() < 0.15 ? 'bomb' : (['🍉','🍎','🍊','🍋','🍌','🍇'])[Math.floor(Math.random() * 6)], rot: 0 };
    fruits.push(fruit);
  }
  function update() {
    trail.push({ x: lastX, y: lastY, t: 10 });
    trail = trail.filter(t => --t.t > 0);
    fruits.forEach(f => { f.vy += f.g; f.x += f.vx; f.y += f.vy; f.rot += 0.05; });
    fruits = fruits.filter(f => f.y < H + 40);
    if (Math.random() < 0.025) spawn();
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#1a0030');
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
    fruits.forEach(f => {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.type, 0, 0);
      ctx.restore();
    });
    for (let i = 0; i < lives; i++) {
      ctx.font = '24px serif'; ctx.textAlign = 'left';
      ctx.fillText('❤', 8 + i * 28, 12);
    }
    Games.text(ctx, 'SCORE ' + score, W - 100, 8, 20, '#00ffff', 'VT323', 'left');
  }
  function updateHUD() {
    hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
    status.textContent = lives <= 0 ? 'GAME OVER' : '';
  }
  let lastX = -1, lastY = -1;
  function slice(x, y) {
    lastX = x; lastY = y;
    fruits = fruits.filter(f => {
      const dx = f.x - x, dy = f.y - y;
      if (dx*dx + dy*dy < f.r * f.r) {
        if (f.type === 'bomb') { lives--; Sounds.sfx.explode(); if (lives <= 0) { Sounds.sfx.gameover(); } }
        else { score += f.type === '🍉' ? 3 : 1; Sounds.sfx.swoosh(); }
        return false;
      }
      return true;
    });
  }
  let isDown = false;
  const onDown = (e) => { isDown = true; const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; slice((p.clientX - r.left) * (W/r.width), (p.clientY - r.top) * (H/r.height)); e.preventDefault && e.preventDefault(); };
  const onMove = (e) => { if (!isDown) return; const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; slice((p.clientX - r.left) * (W/r.width), (p.clientY - r.top) * (H/r.height)); };
  const onUp = () => { isDown = false; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
  reset();
  loop = Games.tickLoop(() => { if (lives > 0) { update(); draw(); } }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); canvas.removeEventListener('touchstart', onDown); canvas.removeEventListener('touchmove', onMove); canvas.removeEventListener('touchend', onUp); };
});

// ============================================================
// 23. 小行星 ASTEROIDS
// ============================================================
Games.define('asteroids', {
  name: '小行星',
  desc: '驾驶飞船射击小行星，惯性漂移',
  icon: '☄️',
  cat: 'arcade',
  controls: '←→ 旋转 · ↑ 推进 · 空格射击'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 480);
  const W = 480, H = 480;
  let ship, rocks, bullets, score, loop;
  function reset() {
    ship = { x: W/2, y: H/2, a: -Math.PI/2, vx: 0, vy: 0 };
    rocks = []; bullets = []; score = 0;
    for (let i = 0; i < 5; i++) spawnRock(40);
    updateHUD();
  }
  function spawnRock(size) {
    const e = Math.floor(Math.random() * 4);
    let x, y;
    if (e === 0) { x = 0; y = Math.random() * H; }
    if (e === 1) { x = W; y = Math.random() * H; }
    if (e === 2) { x = Math.random() * W; y = 0; }
    if (e === 3) { x = Math.random() * W; y = H; }
    const a = Math.atan2(ship ? ship.y - y : H/2 - y, ship ? ship.x - x : W/2 - x);
    rocks.push({ x, y, vx: Math.cos(a) * 1, vy: Math.sin(a) * 1, r: size, size });
  }
  function update() {
    ship.x = (ship.x + ship.vx + W) % W;
    ship.y = (ship.y + ship.vy + H) % H;
    ship.vx *= 0.99; ship.vy *= 0.99;
    rocks.forEach(r => { r.x = (r.x + r.vx + W) % W; r.y = (r.y + r.vy + H) % H; r.a = (r.a || 0) + 0.02; });
    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    bullets = bullets.filter(b => b.life > 0);
    bullets.forEach(b => {
      rocks = rocks.filter(r => {
        const dx = r.x - b.x, dy = r.y - b.y;
        if (dx*dx + dy*dy < r.r * r.r) {
          score += r.size === 40 ? 20 : (r.size === 20 ? 50 : 100);
          Sounds.sfx.explode();
          if (r.size > 15) { spawnRock(r.size / 2); spawnRock(r.size / 2); rocks[rocks.length-1].x = r.x; rocks[rocks.length-1].y = r.y; rocks[rocks.length-2].x = r.x; rocks[rocks.length-2].y = r.y; }
          if (rocks.length === 0) for (let i = 0; i < 5; i++) spawnRock(40);
          return false;
        }
        return true;
      });
    });
    rocks.forEach(r => {
      const dx = r.x - ship.x, dy = r.y - ship.y;
      if (dx*dx + dy*dy < (r.r + 10) * (r.r + 10)) { Sounds.sfx.gameover(); reset(); }
    });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000');
    rocks.forEach(r => {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rad = r.r * (0.7 + (i % 2) * 0.3);
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    });
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -8); ctx.lineTo(-6, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ff00ff';
    bullets.forEach(b => { ctx.fillRect(b.x - 1, b.y - 1, 3, 3); });
  }
  function updateHUD() {
    hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
  }
  const handler = Games.key({
    'arrowleft': () => ship.a -= 0.1,
    'arrowright': () => ship.a += 0.1,
    'arrowup': () => { ship.vx += Math.cos(ship.a) * 0.2; ship.vy += Math.sin(ship.a) * 0.2; },
    ' ': () => { if (bullets.length < 5) { bullets.push({ x: ship.x, y: ship.y, vx: Math.cos(ship.a) * 6, vy: Math.sin(ship.a) * 6, life: 40 }); Sounds.sfx.shoot(); } },
    'r': () => reset()
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 24. 青蛙过河 FROGGER
// ============================================================
Games.define('frogger', {
  name: '青蛙过河',
  desc: '帮助青蛙穿过车流和河流',
  icon: '🐸',
  cat: 'arcade',
  controls: '方向键移动 · 避免被车撞和掉水里'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480, ROW = 30, COLS = 12;
  let frog, cars, logs, dir, t, loop;
  function reset() {
    frog = { x: 6, y: 13, onLog: null };
    cars = [];
    logs = [];
    for (let r = 0; r < 5; r++) for (let i = 0; i < 2; i++) cars.push({ x: i * 6 + (r % 2 ? 0 : 3), y: 11 - r, vx: (r % 2 ? 1 : -1) * (0.5 + r * 0.15), c: ['#ff00ff','#00ffff','#ffff00','#ff8800','#88ff00'][r] });
    for (let r = 0; r < 5; r++) for (let i = 0; i < 2; i++) logs.push({ x: i * 6 + (r % 2 ? 2 : 0), y: r, vx: (r % 2 ? -1 : 1) * (0.3 + r * 0.1), len: 2 + Math.floor(Math.random() * 2) });
    dir = { x: 0, y: 0 }; t = 0; updateHUD();
  }
  function update() {
    t += 0.016;
    if (dir.x || dir.y) { frog.x += dir.x; frog.y += dir.y; dir = { x: 0, y: 0 }; }
    frog.x = Math.max(0, Math.min(11, frog.x));
    frog.y = Math.max(0, Math.min(13, frog.y));
    cars.forEach(c => { c.x += c.vx * 0.05; if (c.x < -2) c.x = 13; if (c.x > 13) c.x = -2; });
    logs.forEach(l => { l.x += l.vx * 0.05; if (l.x < -4) l.x = 13; if (l.x > 13) l.x = -4; });
    if (frog.y < 5) {
      const log = logs.find(l => l.y === frog.y && frog.x >= l.x && frog.x <= l.x + l.len);
      if (log) { frog.x += log.vx * 0.05; frog.onLog = log; }
      else { Sounds.sfx.hit(); reset(); }
      if (frog.x < 0 || frog.x > 11) { Sounds.sfx.hit(); reset(); }
    } else { frog.onLog = null; }
    cars.forEach(c => { if (c.y === frog.y && Math.abs(c.x - frog.x) < 1) { Sounds.sfx.hit(); reset(); } });
    if (frog.y === 0) { Sounds.sfx.win(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000');
    for (let y = 0; y < 14; y++) {
      ctx.fillStyle = y === 0 ? '#88ff00' : (y < 5 ? '#003366' : (y === 12 ? '#444' : '#1a3'));
      ctx.fillRect(0, y * ROW, W, ROW);
    }
    cars.forEach(c => { ctx.fillStyle = c.c; ctx.fillRect(c.x * 30, c.y * ROW, 30, 28); });
    logs.forEach(l => { ctx.fillStyle = '#884400'; ctx.fillRect(l.x * 30, l.y * ROW, l.len * 30, 28); });
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(frog.x * 30 + 8, frog.y * ROW + 6, 14, 18);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'REACH TOP'; }
  const handler = Games.key({
    'arrowup': () => { dir.y = -1; Sounds.sfx.move(); },
    'arrowdown': () => { dir.y = 1; Sounds.sfx.move(); },
    'arrowleft': () => { dir.x = -1; Sounds.sfx.move(); },
    'arrowright': () => { dir.x = 1; Sounds.sfx.move(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 25. 蜈蚣 CENTIPEDE
// ============================================================
Games.define('centipede', {
  name: '蜈蚣',
  desc: '射击分段蜈蚣，避免它的头',
  icon: '🐛',
  cat: 'arcade',
  controls: '方向键/WASD 移动 · 空格射击'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 480);
  const W = 400, H = 480, CELL = 20;
  let player, centi, bullets, rocks, score, loop;
  function reset() {
    player = { x: 200, y: 440 };
    centi = []; for (let i = 0; i < 12; i++) centi.push({ x: 20 + i * 20, y: 40, dir: 1, down: false });
    bullets = []; rocks = []; score = 0;
    for (let i = 0; i < 30; i++) rocks.push({ x: Math.floor(Math.random() * 20) * 20, y: 100 + Math.floor(Math.random() * 17) * 20 });
    updateHUD();
  }
  function update() {
    player.x = Math.max(0, Math.min(380, player.x));
    player.y = Math.max(0, Math.min(460, player.y));
    if (centi.length === 0) { for (let i = 0; i < 12; i++) centi.push({ x: 20 + i * 20, y: 40, dir: 1, down: false }); score += 100; }
    centi.forEach(s => { s.x += s.dir * 2; if (s.x < 0 || s.x > 380) s.down = true; });
    centi.forEach(s => { if (s.down) { s.y += 20; s.dir = -s.dir; s.x = Math.max(0, Math.min(380, s.x)); s.down = false; } });
    bullets.forEach(b => b.y -= 6);
    bullets = bullets.filter(b => b.y > 0);
    const hits = new Set();
    bullets.forEach((b, bi) => {
      centi.forEach((s, si) => { if (!hits.has(si) && Math.abs(s.x - b.x) < 10 && Math.abs(s.y - b.y) < 10) { hits.add(si); bullets.splice(bi, 1); score += 10; Sounds.sfx.hit(); } });
    });
    centi = centi.filter((_, i) => !hits.has(i));
    centi.forEach(s => { if (Math.abs(s.x - player.x) < 14 && Math.abs(s.y - player.y) < 14) { Sounds.sfx.gameover(); reset(); } });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000');
    ctx.fillStyle = '#222'; rocks.forEach(r => ctx.fillRect(r.x, r.y, 18, 18));
    centi.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#ff00ff' : '#00ff00'; ctx.fillRect(s.x - 8, s.y - 8, 16, 16); });
    bullets.forEach(b => { ctx.fillStyle = '#ffff00'; ctx.fillRect(b.x - 1, b.y - 4, 2, 8); });
    ctx.fillStyle = '#00ffff'; ctx.fillRect(player.x - 6, player.y - 6, 12, 12);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => player.x -= 20, 'arrowright': () => player.x += 20,
    'arrowup': () => player.y -= 20, 'arrowdown': () => player.y += 20,
    'a': () => player.x -= 20, 'd': () => player.x += 20,
    'w': () => player.y -= 20, 's': () => player.y += 20,
    ' ': () => { if (bullets.length < 3) bullets.push({ x: player.x, y: player.y - 8 }); Sounds.sfx.shoot(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 26. 吃豆人 PAC-LITE
// ============================================================
Games.define('pac', {
  name: '吃豆人',
  desc: '吃光所有豆子，躲避幽灵',
  icon: '🟡',
  cat: 'arcade',
  controls: '方向键移动 · 吃大力丸反追幽灵'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 420, 460);
  const COLS = 21, ROWS = 21, CELL = 20;
  const W = COLS * CELL, H = ROWS * CELL;
  const MAP = [
    "#####################",
    "#........#.........#",
    "#.##.###.#.###.##..#",
    "#..................#",
    "#.##.#.#####.#.##..#",
    "#....#...#...#....#",
    "####.### # ###.####",
    "   #.#       #.#   ",
    "####.# ##### #.####",
    ".... ....#.........",
    "####.# ##### #.####",
    "   #.#       #.#   ",
    "####.# ##### #.####",
    "#........#.........#",
    "#.##.###.#.###.##..#",
    "#..#.....P.....#..#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.######.#.######..#",
    "#..................#",
    "#####################"
  ];
  let map, dots, pac, ghosts, score, power, loop;
  function reset() {
    map = MAP.map(r => r.split(''));
    dots = []; pac = { x: 9, y: 15, dir: 0 };
    ghosts = [{ x: 9, y: 9, c: '#ff0000', scared: false }, { x: 10, y: 9, c: '#ff00ff', scared: false }, { x: 9, y: 10, c: '#00ffff', scared: false }];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === '.') dots.push({ x, y });
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === 'P') { dots.push({ x, y, power: true }); map[y][x] = '.'; }
    score = 0; power = 0; updateHUD();
  }
  function canMove(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false; return map[y][x] !== '#'; }
  function update() {
    if (pac.dir) { const nx = pac.x + [0,-1,1,0][pac.dir], ny = pac.y + [0,0,0,-1][pac.dir]; if (canMove(nx, ny)) { pac.x = nx; pac.y = ny; } else pac.dir = 0; }
    for (let i = dots.length - 1; i >= 0; i--) if (dots[i].x === pac.x && dots[i].y === pac.y) { score += dots[i].power ? 50 : 10; if (dots[i].power) { power = 200; ghosts.forEach(g => g.scared = true); Sounds.sfx.powerup(); } else Sounds.sfx.blip(); dots.splice(i, 1); }
    if (power > 0) { power--; if (power === 0) ghosts.forEach(g => g.scared = false); }
    ghosts.forEach(g => {
      const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
      const valid = dirs.filter(([dx,dy]) => canMove(g.x + dx, g.y + dy));
      if (valid.length) { const [dx, dy] = valid[Math.floor(Math.random() * valid.length)]; g.x += dx; g.y += dy; }
      if (g.x === pac.x && g.y === pac.y) {
        if (g.scared) { g.x = 9; g.y = 9; g.scared = false; score += 200; Sounds.sfx.eat(); }
        else { Sounds.sfx.gameover(); reset(); }
      }
    });
    if (dots.length === 0) reset();
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (map[y][x] === '#') { ctx.fillStyle = '#0000ff'; ctx.fillRect(x*CELL, y*CELL, CELL, CELL); }
    }
    ctx.fillStyle = '#ffaa88';
    dots.forEach(d => { if (d.power) { ctx.beginPath(); ctx.arc(d.x*CELL+10, d.y*CELL+10, 6, 0, Math.PI*2); ctx.fill(); } else ctx.fillRect(d.x*CELL+8, d.y*CELL+8, 4, 4); });
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(pac.x*CELL+10, pac.y*CELL+10, 8, 0.2*Math.PI, 1.8*Math.PI); ctx.fill();
    ghosts.forEach(g => { ctx.fillStyle = g.scared ? (power < 60 && power % 20 < 10 ? '#fff' : '#0000ff') : g.c; ctx.fillRect(g.x*CELL+3, g.y*CELL+3, 14, 14); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; status.textContent = power > 0 ? `POWER ${Math.floor(power/60)+1}s` : ''; }
  const handler = Games.key({
    'arrowleft': () => pac.dir = 1, 'arrowright': () => pac.dir = 2, 'arrowup': () => pac.dir = 3, 'arrowdown': () => pac.dir = 0
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 27. 炸弹人 BOMBER
// ============================================================
Games.define('bomber', {
  name: '炸弹人',
  desc: '放炸弹炸掉砖块，躲开火焰',
  icon: '💣',
  cat: 'arcade',
  controls: '方向键移动 · 空格放炸弹'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const COLS = 15, ROWS = 15, CELL = 24;
  const W = COLS * CELL, H = ROWS * CELL;
  let map, player, bombs, fires, enemies, score, loop;
  function reset() {
    map = []; for (let y = 0; y < ROWS; y++) { const r = []; for (let x = 0; x < COLS; x++) { if (x === 0 || y === 0 || x === COLS-1 || y === ROWS-1 || (x % 2 === 0 && y % 2 === 0)) r.push('#'); else if (Math.random() < 0.5) r.push('B'); else r.push(' '); } map.push(r); }
    map[1][1] = ' '; player = { x: 1, y: 1 }; bombs = []; fires = []; enemies = []; score = 0;
    for (let i = 0; i < 5; i++) { let ex, ey; do { ex = Math.floor(Math.random() * (COLS-2)) + 1; ey = Math.floor(Math.random() * (ROWS-2)) + 1; } while (map[ey][ex] !== ' ' || (ex < 3 && ey < 3)); enemies.push({ x: ex, y: ey, t: 0 }); }
    updateHUD();
  }
  function canMove(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false; const t = map[y][x]; return t === ' ' || t === '.'; }
  function burn(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return; if (map[y][x] === 'B') { score += 10; Sounds.sfx.explode(); } if (map[y][x] !== '#') { map[y][x] = '.'; fires.push({ x, y, life: 20 }); } }
  function update() {
    if (player.x === undefined) return;
    enemies.forEach(e => { e.t += 0.02; if (Math.floor(e.t) !== Math.floor(e.t - 0.02)) { const dirs = [[0,1],[0,-1],[1,0],[-1,0]]; const ds = dirs.filter(([dx,dy]) => canMove(e.x+dx, e.y+dy)); if (ds.length) { const [dx,dy] = ds[Math.floor(Math.random() * ds.length)]; e.x += dx; e.y += dy; } } });
    fires.forEach(f => f.life--);
    fires = fires.filter(f => f.life > 0);
    enemies.forEach((e, i) => { if (fires.some(f => f.x === e.x && f.y === e.y)) { enemies.splice(i, 1); score += 50; Sounds.sfx.explode(); } if (e.x === player.x && e.y === player.y) { Sounds.sfx.gameover(); reset(); } });
    if (fires.some(f => f.x === player.x && f.y === player.y)) { Sounds.sfx.gameover(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001100');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (map[y][x] === '#') { ctx.fillStyle = '#444'; ctx.fillRect(x*CELL, y*CELL, CELL, CELL); }
      if (map[y][x] === 'B') { ctx.fillStyle = '#884400'; ctx.fillRect(x*CELL, y*CELL, CELL, CELL); }
    }
    ctx.fillStyle = '#ffaa00'; enemies.forEach(e => ctx.fillRect(e.x*CELL+3, e.y*CELL+3, 18, 18));
    ctx.fillStyle = '#00aaff'; ctx.fillRect(player.x*CELL+3, player.y*CELL+3, 18, 18);
    fires.forEach(f => { ctx.fillStyle = '#ff8800'; ctx.fillRect(f.x*CELL, f.y*CELL, CELL, CELL); });
    bombs.forEach(b => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x*CELL+12, b.y*CELL+12, 10, 0, Math.PI*2); ctx.fill(); if (Date.now() - b.t > 1500) { const dirs = [[0,1],[0,-1],[1,0],[-1,0]]; dirs.forEach(([dx,dy]) => burn(b.x+dx, b.y+dy)); burn(b.x, b.y); } });
    bombs = bombs.filter(b => Date.now() - b.t < 1500);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => { if (canMove(player.x-1, player.y)) player.x--; },
    'arrowright': () => { if (canMove(player.x+1, player.y)) player.x++; },
    'arrowup': () => { if (canMove(player.x, player.y-1)) player.y--; },
    'arrowdown': () => { if (canMove(player.x, player.y+1)) player.y++; },
    ' ': () => { if (bombs.length < 3 && map[player.y][player.x] === ' ') { bombs.push({ x: player.x, y: player.y, t: Date.now() }); Sounds.sfx.drop(); } }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 28. 滑雪 SKI
// ============================================================
Games.define('ski', {
  name: '滑雪',
  desc: '左右躲避障碍物滑下雪山',
  icon: '⛷️',
  cat: 'arcade',
  controls: '← → 转向 · 越久越快'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let skier, trees, score, speed, loop;
  function reset() { skier = { x: 180, y: 400, a: 0 }; trees = []; score = 0; speed = 3; updateHUD(); }
  function spawn() { trees.push({ x: Math.random() * W, y: -20, t: Math.random() < 0.5 ? 'tree' : 'rock' }); }
  function update() {
    skier.a *= 0.9;
    if (keys.left) skier.a -= 0.02;
    if (keys.right) skier.a += 0.02;
    skier.x += skier.a * 8;
    skier.x = Math.max(10, Math.min(W-10, skier.x));
    score += speed;
    if (score % 200 < speed) spawn();
    trees.forEach(t => t.y += speed);
    trees = trees.filter(t => t.y < H + 30);
    trees.forEach(t => { if (Math.abs(t.x - skier.x) < 14 && Math.abs(t.y - skier.y) < 14) { Sounds.sfx.gameover(); reset(); } });
    if (score % 1000 < speed) speed += 0.2;
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#fff');
    ctx.fillStyle = '#eef';
    for (let y = 0; y < H; y += 40) { ctx.fillStyle = y % 80 === 0 ? '#ddd' : '#eee'; ctx.fillRect(0, y, W, 40); }
    trees.forEach(t => { if (t.t === 'tree') { ctx.fillStyle = '#0a0'; ctx.fillRect(t.x-6, t.y-12, 12, 18); ctx.fillRect(t.x-2, t.y-18, 4, 6); } else { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI*2); ctx.fill(); } });
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(skier.x - 4, skier.y - 6, 8, 12);
    ctx.fillStyle = '#000'; ctx.fillRect(skier.x - 6, skier.y + 4, 12, 2);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `${Math.floor(score)}M`; }
  const keys = { left: false, right: false };
  const down = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true; };
  const up = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
});

// ============================================================
// 29. 跑步者 RUNNER
// ============================================================
Games.define('runner', {
  name: '跑步者',
  desc: '三车道跑步，躲避车辆',
  icon: '🏃',
  cat: 'arcade',
  controls: '← → 切换车道 · ↑ 跳跃'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480, LANE = 120;
  let player, cars, score, jumpT, loop;
  function reset() { player = { lane: 1, y: 380 }; cars = []; score = 0; jumpT = 0; updateHUD(); }
  function spawn() { const lane = Math.floor(Math.random() * 3); cars.push({ lane, y: -40, c: ['#ff00ff','#00ffff','#ffff00'][Math.floor(Math.random()*3)] }); }
  function update() {
    score++;
    if (score % 30 === 0) spawn();
    cars.forEach(c => c.y += 6);
    cars = cars.filter(c => c.y < H + 40);
    cars.forEach(c => { if (c.lane === player.lane && Math.abs(c.y - player.y) < 30) { Sounds.sfx.gameover(); reset(); } });
    if (jumpT > 0) jumpT--;
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#222');
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === player.lane ? '#444' : '#333'; ctx.fillRect(i * LANE, 0, LANE, H); ctx.fillStyle = '#888'; ctx.fillRect(i * LANE + LANE - 2, 0, 2, H); }
    cars.forEach(c => { ctx.fillStyle = c.c; ctx.fillRect(c.lane * LANE + 20, c.y, 80, 40); });
    ctx.fillStyle = '#00ff00';
    const py = player.y - (jumpT > 0 ? 30 : 0);
    ctx.fillRect(player.lane * LANE + 50, py, 20, 40);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => player.lane = Math.max(0, player.lane - 1),
    'arrowright': () => player.lane = Math.min(2, player.lane + 1),
    'arrowup': () => { if (jumpT === 0) { jumpT = 30; Sounds.sfx.jump(); } }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 30. 颜色切换 COLOR SWITCH
// ============================================================
Games.define('colorswitch', {
  name: '颜色切换',
  desc: '小球穿过匹配颜色的扇形',
  icon: '🎨',
  cat: 'arcade',
  controls: '点击/空格 跳跃 · 颜色匹配才安全'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66'];
  let ball, obs, score, vy, loop, color;
  function reset() { ball = { x: W/2, y: H - 40, r: 10 }; obs = []; score = 0; vy = 0; color = COLORS[0]; spawn(); }
  function spawn() {
    const cx = W/2, cy = H * 0.4; const segs = 4; const gap = 1;
    const arr = [];
    for (let i = 0; i < segs; i++) arr.push({ color: COLORS[i], a0: (i * Math.PI * 2 / segs) + (Math.random() * 0.3 - 0.15), a1: (i * Math.PI * 2 / segs) + (Math.PI * 2 / segs) - gap });
    obs.push({ x: cx, y: cy, r: 80, segs: arr, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
  }
  function update() {
    vy += 0.4; ball.y += vy;
    if (ball.y < H * 0.4 - 90) { obs.forEach(o => o.y += 6); if (obs[0].y > H + 100) { obs.shift(); score++; spawn(); } }
    if (ball.y > H - 20) { ball.y = H - 20; vy = 0; }
    obs.forEach(o => {
      if (Math.abs(ball.x - o.x) < o.r + 8 && Math.abs(ball.y - o.y) < o.r + 8) {
        const dx = ball.x - o.x, dy = ball.y - o.y;
        const a = Math.atan2(dy, dx); const ad = (a + Math.PI * 2) % (Math.PI * 2);
        if (Math.sqrt(dx*dx+dy*dy) > o.r - 14) {
          const seg = o.segs.find(s => ad >= s.a0 && ad <= s.a1);
          if (!seg || seg.color !== color) { Sounds.sfx.gameover(); reset(); }
        }
      }
    });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    obs.forEach(o => { o.segs.forEach(s => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.arc(o.x, o.y, o.r, s.a0, s.a1); ctx.closePath(); ctx.fill(); }); });
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  }
  function jump() { vy = -8; color = COLORS[Math.floor(Math.random() * COLORS.length)]; Sounds.sfx.jump(); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const onClick = () => jump();
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('touchstart', onClick, { passive: false });
  const handler = Games.key({ ' ': () => jump() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('touchstart', onClick); };
});

// ============================================================
// 31. 鸭子射击 DUCK SHOOT
// ============================================================
Games.define('duckshoot', {
  name: '鸭子射击',
  desc: '经典红白机鸭子射击',
  icon: '🦆',
  cat: 'arcade',
  controls: '鼠标点击飞行鸭子 · 不能掉地'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 360);
  const W = 480, H = 360;
  let ducks, score, ammo, loop;
  function reset() { ducks = []; score = 0; ammo = 30; updateHUD(); for (let i = 0; i < 5; i++) spawn(); }
  function spawn() { ducks.push({ x: -30, y: 50 + Math.random() * 200, vx: 2 + Math.random() * 2, vy: 0, t: Math.random() * 200, alive: true }); }
  function update() {
    ducks.forEach(d => { d.x += d.vx; d.t += 0.1; d.y += Math.sin(d.t) * 1.5; });
    ducks = ducks.filter(d => d.alive && d.x < W + 30);
    if (ducks.filter(d => d.alive).length < 3 && Math.random() < 0.05) spawn();
    if (ammo <= 0) { reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#87ceeb');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, H - 60, W, 60);
    ducks.forEach(d => {
      if (!d.alive) return;
      ctx.fillStyle = '#8b4513'; ctx.fillRect(d.x - 12, d.y - 6, 24, 12);
      ctx.fillStyle = '#00ff00'; ctx.fillRect(d.x - 8, d.y - 12, 16, 6);
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(d.x + 10, d.y - 2, 6, 4);
    });
    ctx.fillStyle = '#fff'; ctx.font = '14px VT323'; ctx.textAlign = 'left';
    ctx.fillText('AMMO: ' + ammo, 10, 24);
    ctx.fillText('SCORE: ' + score, 10, 44);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  function shoot(x, y) {
    if (ammo <= 0) return;
    ammo--;
    Sounds.sfx.shoot();
    ducks.forEach(d => { if (d.alive && Math.abs(d.x - x) < 18 && Math.abs(d.y - y) < 12) { d.alive = false; score += 10; Sounds.sfx.hit(); } });
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); shoot((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); const t = e.touches[0]; shoot((t.clientX - r.left) * (W/r.width), (t.clientY - r.top) * (H/r.height)); }, { passive: false });
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 32. 环套 RING TOSS
// ============================================================
Games.define('ringtoss', {
  name: '套圈',
  desc: '把圆圈套到柱子上得分',
  icon: '🎯',
  cat: 'arcade',
  controls: '点击/空格 抛出圆圈 · 时机要准'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let ring, score, loop, pegs;
  pegs = [80, 200, 320].map(x => ({ x, y: 380, hit: false }));
  function reset() { ring = null; score = 0; pegs.forEach(p => p.hit = false); updateHUD(); }
  function throwR() { ring = { x: W/2, y: H - 20, vy: -12, r: 30 }; Sounds.sfx.swoosh(); }
  function update() {
    if (ring) {
      ring.vy += 0.5; ring.y += ring.vy;
      if (ring.y > H) { ring = null; }
      else if (ring.y > 350) {
        pegs.forEach(p => { if (!p.hit && Math.abs(ring.x - p.x) < 30) { p.hit = true; score += 10; Sounds.sfx.win(); ring = null; } });
      }
    }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    pegs.forEach(p => { ctx.fillStyle = p.hit ? '#ff00ff' : '#ffaa00'; ctx.fillRect(p.x - 6, p.y - 30, 12, 60); });
    if (ring) { ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI*2); ctx.stroke(); }
    Games.text(ctx, 'SCORE ' + score, 10, 10, 20, '#00ffff');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const onClick = () => { if (!ring) throwR(); };
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => { if (!ring) throwR(); } });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 33. 叠叠乐 STACKER
// ============================================================
Games.define('stacker', {
  name: '叠叠乐',
  desc: '移动方块对齐堆叠，对齐越多分越高',
  icon: '📚',
  cat: 'arcade',
  controls: '空格/点击 停止移动的方块'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let stack, current, dir, speed, score, loop;
  function reset() { stack = [{ x: 130, y: H - 30, w: 100, h: 20 }]; current = { x: 0, y: H - 50, w: 100, h: 20 }; dir = 1; speed = 4; score = 0; updateHUD(); }
  function update() {
    current.x += dir * speed;
    if (current.x < 0 || current.x + current.w > W) dir = -dir;
    updateHUD();
  }
  function drop() {
    const top = stack[stack.length - 1];
    const overlap = Math.max(0, Math.min(current.x + current.w, top.x + top.w) - Math.max(current.x, top.x));
    if (overlap === 0) { Sounds.sfx.gameover(); reset(); return; }
    if (overlap < top.w) { Sounds.sfx.hit(); }
    const nx = Math.max(current.x, top.x);
    const ny = top.y - 20;
    stack.push({ x: nx, y: ny, w: overlap, h: 20 });
    current = { x: 0, y: ny - 20, w: overlap, h: 20 };
    speed += 0.3;
    if (stack.length > score) { score = stack.length; Sounds.sfx.blip(); }
    if (current.y < 0) { Sounds.sfx.win(); reset(); }
  }
  function draw() {
    Games.clear(ctx, W, H, '#000020');
    stack.forEach((s, i) => { ctx.fillStyle = `hsl(${i * 20}, 80%, 50%)`; ctx.fillRect(s.x, s.y, s.w, s.h); });
    ctx.fillStyle = '#00ffff'; ctx.fillRect(current.x, current.y, current.w, current.h);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `HEIGHT ${score}`; }
  const onClick = () => drop();
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('touchstart', onClick, { passive: false });
  const handler = Games.key({ ' ': () => drop() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('touchstart', onClick); };
});

// ============================================================
// 34. 砖块射手 BRICK SHOOTER
// ============================================================
Games.define('brick', {
  name: '砖块射手',
  desc: '底部炮台射击顶部砖块',
  icon: '🧱',
  cat: 'arcade',
  controls: '← → 移动 · 空格射击 · 鼠标瞄准'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let paddle, balls, bricks, score, loop;
  function reset() {
    paddle = { x: 150, y: 440, w: 60, h: 10 };
    balls = [{ x: 180, y: 430, vx: 2, vy: -3 }];
    bricks = []; score = 0;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) bricks.push({ x: c * 45, y: r * 22, w: 42, h: 18, c: ['#ff00ff','#00ffff','#ffff00','#88ff00','#ff8800','#ff0066'][r] });
    updateHUD();
  }
  function update() {
    balls.forEach(b => { b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x > W) b.vx *= -1; if (b.y < 0) b.vy *= -1; if (b.y > H) { b.x = 180; b.y = 430; b.vx = 2; b.vy = -3; Sounds.sfx.hit(); } });
    balls.forEach(b => { if (b.x > paddle.x && b.x < paddle.x + paddle.w && b.y > paddle.y && b.y < paddle.y + paddle.h) { b.vy = -Math.abs(b.vy); Sounds.sfx.blip(); } });
    bricks.forEach((br, i) => { balls.forEach(b => { if (b.x > br.x && b.x < br.x + br.w && b.y > br.y && b.y < br.y + br.h) { b.vy *= -1; bricks.splice(i, 1); score += 10; Sounds.sfx.hit(); } }); });
    if (bricks.length === 0) { Sounds.sfx.win(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000010');
    bricks.forEach(b => { ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h); });
    ctx.fillStyle = '#00ffff'; ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillStyle = '#ffaa00'; balls.forEach(b => ctx.fillRect(b.x - 4, b.y - 4, 8, 8));
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => paddle.x = Math.max(0, paddle.x - 15),
    'arrowright': () => paddle.x = Math.min(W - paddle.w, paddle.x + 15),
    ' ': () => { balls.push({ x: paddle.x + paddle.w/2, y: paddle.y - 5, vx: 2, vy: -3 }); Sounds.sfx.shoot(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 35. 螺旋 SPIRAL
// ============================================================
Games.define('spiral', {
  name: '螺旋',
  desc: '点击时机反弹出螺旋',
  icon: '🌀',
  cat: 'arcade',
  controls: '点击/空格 跳跃 · 别撞自己'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let ball, trail, score, loop, alive;
  function reset() { ball = { x: W/2, y: H/2, vx: 3, vy: 0, r: 6 }; trail = []; score = 0; alive = true; }
  function update() {
    if (!alive) return;
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.x < 0 || ball.x > W) ball.vx *= -1;
    if (ball.y < 0 || ball.y > H) ball.vy *= -1;
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 200) trail.shift();
    for (let i = 0; i < trail.length - 20; i++) {
      if (Math.abs(trail[i].x - ball.x) < 6 && Math.abs(trail[i].y - ball.y) < 6) {
        alive = false; Sounds.sfx.gameover(); setTimeout(reset, 1000);
      }
    }
    score++;
  }
  function jump() { ball.vy = -ball.vy; Sounds.sfx.jump(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a002a');
    for (let i = 0; i < trail.length; i++) { ctx.fillStyle = `hsl(${(i * 5) % 360}, 80%, 50%)`; ctx.fillRect(trail[i].x - 2, trail[i].y - 2, 4, 4); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
    Games.text(ctx, 'SCORE ' + score, 10, 10, 20, '#fff');
  }
  const onClick = () => jump();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => jump() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 36. 弹珠 BALL DROP
// ============================================================
Games.define('balldrop', {
  name: '弹珠下落',
  desc: '点击发射弹珠到下方目标',
  icon: '🔮',
  cat: 'arcade',
  controls: '点击/空格 发射弹珠 · 落点决定得分'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  const ZONES = [100, 50, 20, 80, 200, 50, 20, 100];
  let ball, x, score, loop;
  function reset() { ball = null; x = W/2; score = 0; updateHUD(); }
  function fire() { if (!ball) { ball = { x, y: 40, vy: 0, vx: (Math.random() - 0.5) * 0.5 }; Sounds.sfx.shoot(); } }
  function update() {
    if (ball) {
      ball.vy += 0.15; ball.y += ball.vy; ball.x += ball.vx;
      if (ball.x < 0 || ball.x > W) { ball = null; return; }
      if (ball.y > 400) {
        const idx = Math.floor(ball.x / (W / ZONES.length));
        score += ZONES[Math.max(0, Math.min(ZONES.length - 1, idx))];
        Sounds.sfx.blip();
        ball = null;
        updateHUD();
      }
    }
  }
  function draw() {
    Games.clear(ctx, W, H, '#000018');
    for (let i = 0; i < ZONES.length; i++) { ctx.fillStyle = `hsl(${i * 45}, 60%, 50%)`; ctx.fillRect(i * (W/ZONES.length), 400, W/ZONES.length, 80); ctx.fillStyle = '#fff'; ctx.font = '12px VT323'; ctx.textAlign = 'center'; ctx.fillText(ZONES[i], i * (W/ZONES.length) + (W/ZONES.length)/2, 444); }
    if (!ball) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, 30, 8, 12); ctx.fillStyle = '#ff0'; ctx.fillRect(x - 6, 42, 12, 2); }
    else { ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * (W/r.width); fire(); };
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * (W/r.width); };
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('mousemove', onMove);
  const handler = Games.key({ ' ': () => fire(), 'a': () => x = Math.max(0, x - 20), 'd': () => x = Math.min(W, x + 20), 'arrowleft': () => x = Math.max(0, x - 20), 'arrowright': () => x = Math.min(W, x + 20) });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('mousemove', onMove); };
});

// ============================================================
// 37. 飞机躲避 PLANE DODGE
// ============================================================
Games.define('planedodge', {
  name: '飞机躲避',
  desc: '驾驶纸飞机躲避障碍',
  icon: '✈️',
  cat: 'arcade',
  controls: '↑ ↓ 上升下降 · 越久越快'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let plane, walls, score, speed, loop;
  function reset() { plane = { y: H/2, x: 60 }; walls = []; score = 0; speed = 3; updateHUD(); }
  function update() {
    if (keys.up) plane.y -= 4;
    if (keys.down) plane.y += 4;
    plane.y = Math.max(10, Math.min(H - 10, plane.y));
    score++;
    if (score % 100 === 0) speed += 0.3;
    if (score % 50 === 0) { const gap = 100 + Math.random() * 60; walls.push({ x: W, gapY: 50 + Math.random() * (H - gap - 100), gap }); }
    walls.forEach(w => w.x -= speed);
    walls = walls.filter(w => w.x > -40);
    walls.forEach(w => {
      if (w.x < 80 && w.x > 40) {
        if (plane.y < w.gapY || plane.y > w.gapY + w.gap) { Sounds.sfx.gameover(); reset(); }
      }
    });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#87ceeb');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, H - 30, W, 30);
    walls.forEach(w => { ctx.fillStyle = '#444'; ctx.fillRect(w.x, 0, 30, w.gapY); ctx.fillRect(w.x, w.gapY + w.gap, 30, H); });
    ctx.fillStyle = '#fff'; ctx.fillRect(plane.x - 15, plane.y - 6, 30, 12);
    ctx.fillStyle = '#000'; ctx.fillRect(plane.x - 5, plane.y - 2, 4, 4);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const keys = { up: false, down: false };
  const down = (e) => { if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = true; if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = true; };
  const up = (e) => { if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = false; if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
});

// ============================================================
// 38. 旋转迷宫 MAZE BALL
// ============================================================
Games.define('mazeball', {
  name: '旋转迷宫',
  desc: '倾斜迷宫让小球到达目标',
  icon: '🧭',
  cat: 'arcade',
  controls: '方向键倾斜 · 球到金色方块'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  const WALLS = [
    [0,0,360,8],[0,0,8,360],[0,352,360,8],[352,0,8,360],
    [50,50,80,8],[50,50,8,80],[170,30,8,80],[170,30,80,8],
    [50,170,80,8],[50,170,8,80],[170,150,8,80],[170,150,80,8],
    [270,50,8,150],[110,250,140,8],[50,290,8,40]
  ];
  let ball, goal, gx, gy, loop;
  function reset() { ball = { x: 30, y: 30, vx: 0, vy: 0, r: 6 }; goal = { x: 320, y: 320 }; gx = 0; gy = 0; updateHUD(); }
  function hitWall(x, y) {
    for (const w of WALLS) if (x + 6 > w[0] && x - 6 < w[0]+w[2] && y + 6 > w[1] && y - 6 < w[1]+w[3]) return true;
    return false;
  }
  function update() {
    ball.vx += gx * 0.15; ball.vy += gy * 0.15;
    ball.vx *= 0.95; ball.vy *= 0.95;
    if (!hitWall(ball.x + ball.vx, ball.y)) ball.x += ball.vx;
    else ball.vx = 0;
    if (!hitWall(ball.x, ball.y + ball.vy)) ball.y += ball.vy;
    else ball.vy = 0;
    if (Math.abs(ball.x - goal.x) < 12 && Math.abs(ball.y - goal.y) < 12) { Sounds.sfx.win(); reset(); }
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    ctx.fillStyle = '#666'; WALLS.forEach(w => ctx.fillRect(w[0], w[1], w[2], w[3]));
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(goal.x - 8, goal.y - 8, 16, 16);
    ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'REACH GOAL'; }
  const handler = Games.key({
    'arrowleft': () => gx = -1, 'arrowright': () => gx = 1, 'arrowup': () => gy = -1, 'arrowdown': () => gy = 1,
    'a': () => gx = -1, 'd': () => gx = 1, 'w': () => gy = -1, 's': () => gy = 1
  });
  const up = (e) => { if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(e.key.toLowerCase())) { gx = 0; gy = 0; } };
  window.addEventListener('keydown', handler);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); window.removeEventListener('keyup', up); };
});

// ============================================================
// 39. 滑雪跳台 SKI JUMP
// ============================================================
Games.define('skijump', {
  name: '跳台滑雪',
  desc: '把握角度与速度飞最远',
  icon: '🎿',
  cat: 'arcade',
  controls: '按住蓄力 · 松开跳跃 · 飞行中 ←→ 调整'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 360);
  const W = 480, H = 360;
  let phase, power, skier, vx, vy, dist, loop;
  function reset() { phase = 'charge'; power = 0; skier = { x: 60, y: 250 }; vx = 0; vy = 0; dist = 0; updateHUD(); }
  function update() {
    if (phase === 'charge') {
      power = (power + 0.05) % 1;
    } else if (phase === 'fly') {
      vy += 0.2; skier.x += vx; skier.y += vy;
      if (skier.x > dist) dist = skier.x;
      if (skier.y > 350) { phase = 'land'; Sounds.sfx.hit(); }
    }
    updateHUD();
  }
  function jump() {
    if (phase === 'charge') {
      phase = 'fly';
      vx = 3 + power * 5; vy = -4 - power * 3;
      Sounds.sfx.swoosh();
    }
  }
  function draw() {
    Games.clear(ctx, W, H, '#aaccff');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 280, W, 80);
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, 100, 80);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 280, 100, 5);
    if (phase === 'charge') { ctx.fillStyle = '#000'; ctx.fillRect(skier.x - 6, skier.y, 12, 24); ctx.fillStyle = `rgb(${255*power}, 0, 0)`; ctx.fillRect(60, 320, 200 * power, 16); }
    if (phase === 'fly') { ctx.fillStyle = '#000'; ctx.save(); ctx.translate(skier.x, skier.y); ctx.rotate(Math.atan2(vy, vx)); ctx.fillRect(-6, -12, 12, 24); ctx.restore(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = phase === 'fly' || phase === 'land' ? `${Math.floor(dist - 60)}M` : 'CHARGE'; }
  const onClick = () => jump();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => jump() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 40. 弹射 CATAPULT
// ============================================================
Games.define('catapult', {
  name: '投石机',
  desc: '调整角度和力度投石',
  icon: '🪨',
  cat: 'arcade',
  controls: '← → 调角度 · 空格发射'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let angle, power, rock, targets, score, state, loop;
  function reset() { angle = -Math.PI/4; power = 5; rock = null; score = 0; targets = []; for (let i = 0; i < 3; i++) targets.push({ x: 250 + i * 60, y: 280, w: 30, h: 40, alive: true }); state = 'aim'; updateHUD(); }
  function fire() { if (state === 'aim') { rock = { x: 30, y: 280, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power }; state = 'fly'; Sounds.sfx.shoot(); } }
  function update() {
    if (state === 'fly') {
      rock.vy += 0.2; rock.x += rock.vx; rock.y += rock.vy;
      targets.forEach(t => { if (t.alive && rock.x > t.x && rock.x < t.x + t.w && rock.y > t.y && rock.y < t.y + t.h) { t.alive = false; score += 10; state = 'aim'; rock = null; Sounds.sfx.explode(); } });
      if (rock.y > H || rock.x > W) { state = 'aim'; rock = null; }
    }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#88aaff');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, W, 40);
    ctx.fillStyle = '#444'; ctx.fillRect(20, 260, 30, 20);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(35, 270); ctx.lineTo(35 + Math.cos(angle) * 30, 270 + Math.sin(angle) * 30); ctx.stroke();
    targets.forEach(t => { if (t.alive) { ctx.fillStyle = '#aa4400'; ctx.fillRect(t.x, t.y, t.w, t.h); } });
    if (rock) { ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(rock.x, rock.y, 6, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => angle = Math.max(-Math.PI/2, angle - 0.05),
    'arrowright': () => angle = Math.min(0, angle + 0.05),
    'arrowup': () => power = Math.min(10, power + 0.2),
    'arrowdown': () => power = Math.max(1, power - 0.2),
    ' ': () => fire()
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 41. 吃豆子 BEAN EATER (similar to snake variant)
// ============================================================
Games.define('bean', {
  name: '吃豆子',
  desc: '经典吃豆子变体，靠吃光升级',
  icon: '🫘',
  cat: 'arcade',
  controls: '方向键移动 · 不能撞墙和自己'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, CELL = 12;
  let snake, dir, food, score, alive, loop;
  function reset() { snake = [{x: 15, y: 15}, {x: 14, y: 15}, {x: 13, y: 15}]; dir = {x: 1, y: 0}; food = spawn(); score = 0; alive = true; updateHUD(); }
  function spawn() { return { x: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 30) }; }
  function step() {
    if (!alive) return;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 30 || snake.some(s => s.x === head.x && s.y === head.y)) { alive = false; Sounds.sfx.gameover(); }
    if (alive) {
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; food = spawn(); Sounds.sfx.eat(); }
      else snake.pop();
    }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0030');
    ctx.fillStyle = '#ff00ff'; ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);
    snake.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#ffff00' : '#00ff00'; ctx.fillRect(s.x * CELL, s.y * CELL, CELL, CELL); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; status.textContent = alive ? '' : 'GAME OVER'; }
  const handler = Games.key({
    'arrowleft': () => dir = {x: -1, y: 0}, 'arrowright': () => dir = {x: 1, y: 0}, 'arrowup': () => dir = {x: 0, y: -1}, 'arrowdown': () => dir = {x: 0, y: 1}
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { step(); draw(); }, 100);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 42. 雪崩 AVALANCHE
// ============================================================
Games.define('avalanche', {
  name: '雪崩',
  desc: '躲避上方的雪球',
  icon: '❄️',
  cat: 'arcade',
  controls: '← → 移动 · 雪球越大越慢'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let player, balls, score, loop;
  function reset() { player = { x: 180, y: 440 }; balls = []; score = 0; updateHUD(); }
  function update() {
    player.x = Math.max(10, Math.min(350, player.x));
    if (Math.random() < 0.05) balls.push({ x: Math.random() * 360, y: -20, r: 5 + Math.random() * 15, v: 1 + Math.random() * 3 });
    balls.forEach(b => b.y += b.v);
    balls = balls.filter(b => b.y < H + 30);
    balls.forEach(b => { if (Math.abs(b.x - player.x) < b.r + 8 && Math.abs(b.y - player.y) < b.r + 8) { Sounds.sfx.gameover(); reset(); } });
    score++;
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a33');
    ctx.fillStyle = '#88ccff'; balls.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({ 'arrowleft': () => player.x -= 20, 'arrowright': () => player.x += 20, 'a': () => player.x -= 20, 'd': () => player.x += 20 });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 43. 剑客 SWORD DUEL
// ============================================================
Games.define('sword', {
  name: '剑客对决',
  desc: '快速反应格挡，斩击对手',
  icon: '⚔️',
  cat: 'action',
  controls: '↑↓←→ 防御方向 · 空格反击 · 时机要准'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let me, enemy, phase, attackDir, attackT, block, hp, ehp, score, loop;
  function reset() { me = { x: 100, y: 160 }; enemy = { x: 380, y: 160 }; phase = 'wait'; attackDir = null; attackT = 0; block = null; hp = 3; ehp = 3; score = 0; updateHUD(); }
  function startAttack() { phase = 'incoming'; attackDir = ['up','down','left','right'][Math.floor(Math.random() * 4)]; attackT = 60; }
  function update() {
    if (phase === 'wait') { if (Math.random() < 0.01) startAttack(); }
    else if (phase === 'incoming') {
      attackT--;
      if (attackT === 0) {
        if (block === attackDir) { Sounds.sfx.powerup(); phase = 'counter'; }
        else { hp--; Sounds.sfx.hit(); if (hp <= 0) { Sounds.sfx.gameover(); reset(); return; } phase = 'wait'; }
      }
    } else if (phase === 'counter') { if (Math.random() < 0.05) { ehp--; score++; Sounds.sfx.hit(); phase = 'wait'; if (ehp <= 0) { Sounds.sfx.win(); reset(); return; } } }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
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
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `HP ${hp} | ENEMY ${ehp} | ${score} WINS`; }
  const handler = Games.key({
    'arrowup': () => block = 'up', 'arrowdown': () => block = 'down', 'arrowleft': () => block = 'left', 'arrowright': () => block = 'right',
    ' ': () => { if (phase === 'counter') { ehp--; score++; Sounds.sfx.hit(); if (ehp <= 0) { Sounds.sfx.win(); reset(); } else phase = 'wait'; } }
  });
  const up = (e) => { if (['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) block = null; };
  window.addEventListener('keydown', handler);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); window.removeEventListener('keyup', up); };
});

// ============================================================
// 44. 忍者 NINJA
// ============================================================
Games.define('ninja', {
  name: '忍者',
  desc: '跳跃挥刀斩杀飞来的飞镖',
  icon: '🥷',
  cat: 'action',
  controls: '↑/空格 跳跃 · ↓ 挥刀 · 砍飞镖'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let ninja, shuriken, score, vy, slash, loop;
  function reset() { ninja = { y: 380 }; shuriken = []; score = 0; vy = 0; slash = 0; updateHUD(); }
  function update() {
    vy += 0.5; ninja.y += vy; if (ninja.y > 380) { ninja.y = 380; vy = 0; }
    if (Math.random() < 0.04) shuriken.push({ x: W, y: 50 + Math.random() * 350, vx: -3 - Math.random() * 2, alive: true });
    shuriken.forEach(s => s.x += s.vx);
    shuriken = shuriken.filter(s => s.x > -20);
    shuriken.forEach(s => { if (s.alive && Math.abs(s.x - 50) < 14 && Math.abs(s.y - ninja.y) < 14) { if (slash > 0) { s.alive = false; score++; Sounds.sfx.hit(); } else { Sounds.sfx.gameover(); reset(); return; } } });
    if (slash > 0) slash--;
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 410, W, 70);
    ctx.fillStyle = '#fff'; ctx.fillRect(40, ninja.y - 20, 20, 30);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(45, ninja.y - 16, 10, 4);
    if (slash > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, ninja.y); ctx.lineTo(110, ninja.y - 30); ctx.stroke(); }
    ctx.fillStyle = '#888'; shuriken.forEach(s => { if (s.alive) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 10, s.y - 10); ctx.lineTo(s.x + 20, s.y); ctx.lineTo(s.x + 10, s.y + 10); ctx.closePath(); ctx.fill(); } });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({ ' ': () => { if (ninja.y >= 380) { vy = -10; Sounds.sfx.jump(); } }, 'arrowup': () => { if (ninja.y >= 380) { vy = -10; Sounds.sfx.jump(); } }, 'arrowdown': () => { slash = 15; Sounds.sfx.swoosh(); } });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 45. 平台跳跃 PLATFORMER
// ============================================================
Games.define('platformer', {
  name: '平台跳跃',
  desc: '经典横版平台动作',
  icon: '🏃',
  cat: 'action',
  controls: '← → 移动 · ↑ 跳跃 · 收集金币'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320, TILE = 20;
  let cam, player, coins, enemies, platforms, score, vy, loop;
  function reset() { cam = 0; player = { x: 50, y: 200, w: 16, h: 24 }; vy = 0; coins = []; enemies = []; platforms = []; score = 0;
    for (let i = 0; i < 8; i++) platforms.push({ x: i * 100, y: 280, w: 80, h: 12 });
    for (let i = 0; i < 20; i++) coins.push({ x: 100 + i * 50 + Math.random() * 30, y: 150 + Math.random() * 100 });
    for (let i = 0; i < 4; i++) enemies.push({ x: 300 + i * 200, y: 256, w: 16, h: 24, vx: 1 });
    updateHUD();
  }
  function update() {
    player.vx = (keys.right ? 3 : 0) - (keys.left ? 3 : 0);
    vy += 0.5; player.y += vy;
    if (player.x > cam + W/2) cam = player.x - W/2;
    if (player.x < cam) player.x = cam;
    platforms.forEach(p => { if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 10 && vy >= 0) { player.y = p.y - player.h; vy = 0; } });
    coins.forEach((c, i) => { if (Math.abs(c.x - player.x) < 14 && Math.abs(c.y - player.y) < 14) { coins.splice(i, 1); score += 5; Sounds.sfx.blip(); } });
    enemies.forEach(e => { e.x += e.vx; if (e.x < cam || e.x > cam + W) e.vx = -e.vx; if (Math.abs(e.x - player.x) < 16 && Math.abs(e.y - player.y) < 24) { Sounds.sfx.hit(); reset(); } });
    if (player.y > H) { Sounds.sfx.gameover(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#88ccff');
    ctx.save(); ctx.translate(-cam, 0);
    ctx.fillStyle = '#88cc44'; ctx.fillRect(cam, 300, W, 20);
    ctx.fillStyle = '#884400'; platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    ctx.fillStyle = '#ffaa00'; coins.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#ff0066'; enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));
    ctx.fillStyle = '#00ff00'; ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.restore();
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const keys = { left: false, right: false };
  const down = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true; if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { if (vy === 0) { vy = -10; Sounds.sfx.jump(); } } };
  const up = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
});

// ============================================================
// 46. 子弹地狱 BULLET HELL
// ============================================================
Games.define('bullethell', {
  name: '弹幕地狱',
  desc: '在弹幕中求生',
  icon: '✨',
  cat: 'action',
  controls: '鼠标移动 · 触屏拖动 · 躲避弹幕'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 480);
  const W = 400, H = 480;
  let player, bullets, score, loop, mouseX, mouseY;
  function reset() { player = { x: 200, y: 400, r: 6 }; bullets = []; score = 0; mouseX = 200; mouseY = 400; updateHUD(); }
  function spawn() { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; bullets.push({ x: 200, y: 100, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 }); } }
  function update() {
    player.x += (mouseX - player.x) * 0.2; player.y += (mouseY - player.y) * 0.2;
    if (Math.random() < 0.02) spawn();
    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    bullets = bullets.filter(b => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);
    bullets.forEach(b => { if (Math.abs(b.x - player.x) < 8 && Math.abs(b.y - player.y) < 8) { Sounds.sfx.gameover(); reset(); } });
    score++;
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000010');
    ctx.fillStyle = '#ffff00'; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `${Math.floor(score/60)}s`; }
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; mouseX = (p.clientX - r.left) * (W/r.width); mouseY = (p.clientY - r.top) * (H/r.height); };
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('touchmove', onMove, { passive: false });
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('touchmove', onMove); };
});

// ============================================================
// 47. 武打 KUNG FU
// ============================================================
Games.define('kungfu', {
  name: '功夫',
  desc: '拳头对敌人，飞踢解决',
  icon: '🥋',
  cat: 'action',
  controls: '← → 移动 · J 拳 · K 踢'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let me, foes, score, atk, atkT, loop;
  function reset() { me = { x: 80, y: 240 }; foes = []; for (let i = 0; i < 3; i++) foes.push({ x: 300 + i * 70, y: 240, vx: -0.5, hp: 2, t: Math.random() * 100 }); score = 0; atkT = 0; updateHUD(); }
  function update() {
    me.x = Math.max(0, Math.min(W - 20, me.x));
    if (Math.random() < 0.02) foes.push({ x: W, y: 240, vx: -0.5 - Math.random() * 0.5, hp: 2, t: Math.random() * 100 });
    foes.forEach(f => { f.x += f.vx; f.t++; if (f.t % 80 === 0) { f.vx = -f.vx; f.x = Math.max(0, Math.min(W, f.x)); } });
    foes = foes.filter(f => f.x > -30);
    foes.forEach(f => { if (Math.abs(f.x - me.x) < 30) { Sounds.sfx.hit(); me.x = Math.max(0, me.x - 30); f.x = me.x + 30; } });
    if (atkT > 0) {
      atkT--;
      foes.forEach((f, i) => { if (Math.abs(f.x - me.x) < 40) { f.hp--; if (f.hp <= 0) { foes.splice(i, 1); score += 10; Sounds.sfx.hit(); } } });
    }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#aa4400');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 280, W, 40);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(me.x, me.y, 20, 40);
    if (atkT > 0) { ctx.fillStyle = '#ff0'; ctx.fillRect(me.x + 20, me.y, 30, 8); }
    ctx.fillStyle = '#ff0000'; foes.forEach(f => ctx.fillRect(f.x, f.y, 20, 40));
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => me.x -= 15, 'arrowright': () => me.x += 15,
    'j': () => { atkT = 10; Sounds.sfx.swoosh(); },
    'k': () => { atkT = 15; Sounds.sfx.swoosh(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 48. 滑铲 DASH
// ============================================================
Games.define('dash', {
  name: '滑铲',
  desc: '点击时机滑铲穿过障碍',
  icon: '🌀',
  cat: 'action',
  controls: '点击/空格 滑铲 · 时机要准'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480, GROUND = 380;
  let player, obs, score, sliding, slideT, loop;
  function reset() { player = { x: 80, y: GROUND - 40, h: 40, w: 24 }; obs = []; score = 0; sliding = false; slideT = 0; updateHUD(); }
  function slide() { if (!sliding) { sliding = true; slideT = 20; Sounds.sfx.swoosh(); } }
  function update() {
    if (sliding) { slideT--; if (slideT <= 0) sliding = false; }
    score++;
    if (Math.random() < 0.02) obs.push({ x: W, y: GROUND - 30, w: 30, h: 30, t: 'low' });
    if (Math.random() < 0.015) obs.push({ x: W, y: GROUND - 70, w: 30, h: 50, t: 'high' });
    obs.forEach(o => o.x -= 6);
    obs = obs.filter(o => o.x > -40);
    const ph = sliding ? 20 : 40;
    const py = sliding ? GROUND - 20 : GROUND - 40;
    obs.forEach(o => { if (player.x < o.x + o.w && player.x + player.w > o.x && py < o.y + o.h && py + ph > o.y) { Sounds.sfx.gameover(); reset(); } });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#88aaff');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, GROUND, W, 100);
    obs.forEach(o => { ctx.fillStyle = o.t === 'high' ? '#aa0000' : '#aa6600'; ctx.fillRect(o.x, o.y, o.w, o.h); });
    ctx.fillStyle = '#0000ff'; ctx.fillRect(player.x, sliding ? GROUND - 20 : GROUND - 40, player.w, sliding ? 20 : 40);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `${Math.floor(score/10)}M`; }
  const onClick = () => slide();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => slide() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 49. 猎人 HUNTER
// ============================================================
Games.define('hunter', {
  name: '猎人',
  desc: '射击猎物得分',
  icon: '🏹',
  cat: 'action',
  controls: '点击猎物 · 限时 60 秒'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let ducks, score, time, loop;
  function reset() { ducks = []; score = 0; time = 60; for (let i = 0; i < 6; i++) spawn(); updateHUD(); }
  function spawn() { ducks.push({ x: 40 + Math.random() * 400, y: 30 + Math.random() * 240, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 2, alive: true, type: Math.random() < 0.2 ? 'deer' : 'duck' }); }
  function update() {
    ducks.forEach(d => { d.x += d.vx; d.y += d.vy; if (d.x < 0 || d.x > W) d.vx = -d.vx; if (d.y < 0 || d.y > H) d.vy = -d.vy; });
    if (Math.random() < 0.02) spawn();
    if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#88cc44');
    ctx.fillStyle = '#88aaff'; ctx.fillRect(0, 0, W, 80);
    ducks.forEach(d => { if (!d.alive) return; ctx.fillStyle = d.type === 'deer' ? '#884400' : '#ffffff'; ctx.fillRect(d.x - 12, d.y - 8, 24, 16); });
    Games.text(ctx, `TIME ${Math.ceil(time)}`, 10, 10, 18, '#000');
    Games.text(ctx, `SCORE ${score}`, W - 100, 10, 18, '#000');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | ${Math.ceil(time)}s`; }
  function shoot(x, y) {
    Sounds.sfx.shoot();
    ducks.forEach(d => { if (d.alive && Math.abs(d.x - x) < 16 && Math.abs(d.y - y) < 12) { d.alive = false; score += d.type === 'deer' ? 20 : 10; setTimeout(() => { const i = ducks.indexOf(d); if (i >= 0) ducks.splice(i, 1); spawn(); }, 500); } });
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); shoot((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 50. 骑士 KNIGHT
// ============================================================
Games.define('knight', {
  name: '骑士',
  desc: '挥剑斩龙，躲避火焰',
  icon: '🛡️',
  cat: 'action',
  controls: '← → 移动 · 空格挥剑'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320, GROUND = 280;
  let knight, dragon, fires, score, slash, loop;
  function reset() { knight = { x: 100 }; dragon = { x: 380, y: 100, hp: 5 }; fires = []; score = 0; slash = 0; updateHUD(); }
  function update() {
    if (slash > 0) slash--;
    knight.x = Math.max(20, Math.min(200, knight.x));
    if (Math.random() < 0.02) fires.push({ x: dragon.x - 20, y: dragon.y + 30, vx: -3 - Math.random(), vy: 0 });
    fires.forEach(f => f.x += f.vx);
    fires = fires.filter(f => f.x > -20);
    fires.forEach(f => { if (Math.abs(f.x - knight.x) < 20 && Math.abs(f.y - (GROUND - 20)) < 30) { Sounds.sfx.hit(); reset(); } });
    if (slash > 0 && Math.abs(knight.x + 30 - dragon.x) < 40) { dragon.hp--; score += 10; Sounds.sfx.hit(); if (dragon.hp <= 0) { Sounds.sfx.win(); reset(); } }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#1a0033');
    ctx.fillStyle = '#444'; ctx.fillRect(0, GROUND, W, 40);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(knight.x - 10, GROUND - 30, 20, 30);
    if (slash > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(knight.x + 10, GROUND - 30, 30, 4); }
    ctx.fillStyle = '#ff0000'; ctx.fillRect(dragon.x - 30, dragon.y, 60, 30);
    ctx.fillStyle = '#ffaa00'; fires.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI*2); ctx.fill(); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | HP ${dragon.hp}`; }
  const handler = Games.key({ 'arrowleft': () => knight.x -= 20, 'arrowright': () => knight.x += 20, ' ': () => { slash = 10; Sounds.sfx.swoosh(); } });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 51. 喷气背包 JETPACK
// ============================================================
Games.define('jetpack', {
  name: '喷气背包',
  desc: '按住向上飞，控制高度',
  icon: '🚀',
  cat: 'action',
  controls: '空格/点击 推进 · 撞到刺就完'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let player, walls, score, loop;
  function reset() { player = { x: 60, y: 240, vy: 0 }; walls = []; score = 0; updateHUD(); }
  function spawn() { walls.push({ x: W, top: 30 + Math.random() * 200, gap: 120 + Math.random() * 40 }); }
  function update() {
    if (keys.up) player.vy = -5; else player.vy += 0.4;
    player.y += player.vy;
    score++;
    if (Math.random() < 0.02) spawn();
    walls.forEach(w => w.x -= 3);
    walls = walls.filter(w => w.x > -40);
    walls.forEach(w => { if (player.x + 12 > w.x && player.x < w.x + 30) { if (player.y < w.top || player.y > w.top + w.gap) { Sounds.sfx.gameover(); reset(); } } });
    if (player.y < 0 || player.y > H) { Sounds.sfx.gameover(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a33');
    walls.forEach(w => { ctx.fillStyle = '#00ff00'; ctx.fillRect(w.x, 0, 30, w.top); ctx.fillRect(w.x, w.top + w.gap, 30, H); });
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(player.x - 4, player.y - 8, 8, 16);
    if (keys.up) { ctx.fillStyle = '#ff8800'; for (let i = 0; i < 3; i++) ctx.fillRect(player.x - 4, player.y + 8 + i * 4, 8, 2); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `${Math.floor(score/10)}M`; }
  const keys = { up: false };
  const down = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') keys.up = true; };
  const up = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') keys.up = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  const onClick = (e) => { e.preventDefault(); };
  canvas.addEventListener('mousedown', () => keys.up = true);
  canvas.addEventListener('mouseup', () => keys.up = false);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); keys.up = true; }, { passive: false });
  canvas.addEventListener('touchend', () => keys.up = false);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
});

// ============================================================
// 52. 机器人 ROBO BLAST
// ============================================================
Games.define('robo', {
  name: '机器人爆炸',
  desc: '控制机器人射击敌人',
  icon: '🤖',
  cat: 'action',
  controls: '方向键移动 · 空格射击'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 480);
  const W = 400, H = 480;
  let robo, bullets, enemies, score, loop;
  function reset() { robo = { x: 200, y: 420 }; bullets = []; enemies = []; score = 0; updateHUD(); }
  function update() {
    robo.x = Math.max(0, Math.min(W - 20, robo.x));
    robo.y = Math.max(0, Math.min(H - 20, robo.y));
    if (Math.random() < 0.03) enemies.push({ x: Math.random() * W, y: -20, vy: 1 + Math.random() * 2, alive: true });
    bullets.forEach(b => b.y -= 6);
    enemies.forEach(e => e.y += e.vy);
    bullets = bullets.filter(b => b.y > 0);
    enemies.forEach((e, i) => { if (e.y > H) { enemies.splice(i, 1); } });
    bullets.forEach((b, bi) => { enemies.forEach((e, ei) => { if (e.alive && Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) { e.alive = false; bullets.splice(bi, 1); score += 10; Sounds.sfx.hit(); } }); });
    enemies = enemies.filter(e => e.alive);
    enemies.forEach(e => { if (Math.abs(e.x - robo.x) < 18 && Math.abs(e.y - robo.y) < 18) { Sounds.sfx.gameover(); reset(); } });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000022');
    ctx.fillStyle = '#888'; enemies.forEach(e => ctx.fillRect(e.x - 12, e.y - 12, 24, 24));
    ctx.fillStyle = '#00ff00'; ctx.fillRect(robo.x - 10, robo.y - 10, 20, 20);
    ctx.fillStyle = '#ff0'; bullets.forEach(b => ctx.fillRect(b.x - 1, b.y - 4, 2, 8));
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => robo.x -= 15, 'arrowright': () => robo.x += 15, 'arrowup': () => robo.y -= 15, 'arrowdown': () => robo.y += 15,
    ' ': () => { bullets.push({ x: robo.x, y: robo.y - 10 }); Sounds.sfx.shoot(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 53. 剑斩 SWORD SLASH
// ============================================================
Games.define('swordslash', {
  name: '剑斩',
  desc: '点击屏幕上飞来的物体斩断',
  icon: '🗡️',
  cat: 'action',
  controls: '点击/触屏斩切'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 480);
  const W = 400, H = 480;
  let items, score, combo, loop, trail;
  function reset() { items = []; score = 0; combo = 0; trail = []; updateHUD(); }
  function spawn() { items.push({ x: Math.random() * W, y: -20, vy: 1 + Math.random() * 3, type: Math.random() < 0.15 ? 'bomb' : 'fruit', rot: 0 }); }
  function update() {
    items.forEach(it => { it.y += it.vy; it.rot += 0.05; });
    items = items.filter(it => it.y < H + 30);
    if (Math.random() < 0.04) spawn();
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let i = 0; i < trail.length - 1; i++) { ctx.strokeStyle = `rgba(255,255,255,${i/trail.length})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(trail[i].x, trail[i].y); ctx.lineTo(trail[i+1].x, trail[i+1].y); ctx.stroke(); }
    items.forEach(it => { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot); ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.type === 'bomb' ? '💣' : (['🍎','🍊','🍋','🍇'])[Math.floor(Math.random()*4)], 0, 0); ctx.restore(); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | COMBO ${combo}`; }
  function slice(x, y) {
    trail.push({ x, y, t: 10 });
    if (trail.length > 10) trail.shift();
    items = items.filter(it => {
      if (Math.abs(it.x - x) < 30 && Math.abs(it.y - y) < 30) {
        if (it.type === 'bomb') { Sounds.sfx.explode(); combo = 0; return true; }
        else { Sounds.sfx.swoosh(); score += 10; combo++; return false; }
      }
      return true;
    });
  }
  let isDown = false;
  const onDown = (e) => { isDown = true; const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; slice((p.clientX - r.left) * (W/r.width), (p.clientY - r.top) * (H/r.height)); };
  const onMove = (e) => { if (!isDown) return; const r = canvas.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; slice((p.clientX - r.left) * (W/r.width), (p.clientY - r.top) * (H/r.height)); };
  const onUp = () => { isDown = false; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); canvas.removeEventListener('touchstart', onDown); canvas.removeEventListener('touchmove', onMove); canvas.removeEventListener('touchend', onUp); };
});

// ============================================================
// 54. 枪手 GUNSLINGER
// ============================================================
Games.define('gunslinger', {
  name: '枪手',
  desc: '西部决斗先拔枪者胜',
  icon: '🤠',
  cat: 'action',
  controls: '等 BANG! 显示后立刻按空格'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let state, t, score, loop;
  function reset() { state = 'wait'; t = 60 + Math.random() * 120; score = 0; updateHUD(); }
  function update() {
    if (state === 'wait') { t--; if (t <= 0) { state = 'bang'; Sounds.sfx.shoot(); } }
    updateHUD();
  }
  function shoot() {
    if (state === 'wait') { Sounds.sfx.gameover(); reset(); return; }
    if (state === 'bang') { score++; Sounds.sfx.win(); reset(); }
  }
  function draw() {
    Games.clear(ctx, W, H, '#aa4400');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 160);
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 200, W, 120);
    if (state === 'wait') {
      ctx.fillStyle = '#fff'; ctx.fillRect(200, 100, 30, 80);
      ctx.fillStyle = '#000'; ctx.fillRect(205, 100, 20, 8);
    } else if (state === 'bang') {
      ctx.fillStyle = '#ff0'; ctx.font = '80px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BANG!', W/2, H/2);
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `WINS ${score}`; }
  const handler = Games.key({ ' ': () => shoot() });
  const onClick = () => shoot();
  canvas.addEventListener('mousedown', onClick);
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 55. 滑翔机 GLIDER
// ============================================================
Games.define('glider', {
  name: '滑翔机',
  desc: '滑翔下降，穿越狭道',
  icon: '🪂',
  cat: 'action',
  controls: '← → 微调方向 · 持续下降'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let glider, walls, score, vy, loop;
  function reset() { glider = { x: 180, y: 60 }; walls = []; score = 0; vy = 1.5; updateHUD(); }
  function update() {
    if (keys.left) glider.x -= 3;
    if (keys.right) glider.x += 3;
    glider.y += vy; score++;
    if (Math.random() < 0.02) walls.push({ x: Math.random() * (W - 80), y: -50, w: 60 + Math.random() * 60, h: 16 });
    walls.forEach(w => w.y += vy);
    walls = walls.filter(w => w.y < H + 30);
    walls.forEach(w => { if (glider.x + 20 > w.x && glider.x < w.x + w.w && glider.y + 6 > w.y && glider.y < w.y + w.h) { Sounds.sfx.gameover(); reset(); } });
    if (glider.y > H) { Sounds.sfx.win(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#aaccff');
    ctx.fillStyle = '#88cc44'; walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
    ctx.fillStyle = '#ff0000'; ctx.fillRect(glider.x, glider.y - 4, 20, 8);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `ALT ${Math.floor((H - glider.y)/10)}`; }
  const keys = { left: false, right: false };
  const down = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true; };
  const up = (e) => { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
});

// ============================================================
// 56. 炸弹投掷 BOMB THROW
// ============================================================
Games.define('bombthrow', {
  name: '投炸弹',
  desc: '向远处坦克投炸弹',
  icon: '💣',
  cat: 'action',
  controls: '← → 调整角度 · ↑ ↓ 调整力度 · 空格投'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 320);
  const W = 480, H = 320;
  let angle, power, bombs, tanks, score, loop;
  function reset() { angle = -Math.PI / 3; power = 7; bombs = []; tanks = []; score = 0; for (let i = 0; i < 3; i++) tanks.push({ x: 300 + i * 60, y: 270, w: 30, h: 20, alive: true }); updateHUD(); }
  function fire() { bombs.push({ x: 50, y: 270, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power }); Sounds.sfx.drop(); }
  function update() {
    bombs.forEach(b => { b.vy += 0.2; b.x += b.vx; b.y += b.vy; });
    bombs = bombs.filter(b => b.y < H + 20);
    bombs.forEach((b, bi) => { tanks.forEach((t, ti) => { if (t.alive && b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + t.h) { t.alive = false; bombs.splice(bi, 1); score += 20; Sounds.sfx.explode(); } }); });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#88aaff');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 290, W, 30);
    ctx.fillStyle = '#444'; ctx.fillRect(40, 250, 20, 40);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(50, 260); ctx.lineTo(50 + Math.cos(angle) * 30, 260 + Math.sin(angle) * 30); ctx.stroke();
    tanks.forEach(t => { if (t.alive) { ctx.fillStyle = '#006400'; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.fillRect(t.x + 12, t.y - 10, 6, 12); } });
    bombs.forEach(b => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill(); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => angle = Math.max(-Math.PI/2, angle - 0.05),
    'arrowright': () => angle = Math.min(0, angle + 0.05),
    'arrowup': () => power = Math.min(12, power + 0.2),
    'arrowdown': () => power = Math.max(2, power - 0.2),
    ' ': () => fire()
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 57. 水果拳 FRUIT PUNCH
// ============================================================
Games.define('fruitpunch', {
  name: '水果拳',
  desc: '按时点击出现的圆形',
  icon: '🥊',
  cat: 'action',
  controls: '点击出现的圆圈 · 越中心分越高'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400;
  let targets, score, t, loop;
  function reset() { targets = []; score = 0; t = 30; updateHUD(); }
  function spawn() { targets.push({ x: 40 + Math.random() * 320, y: 40 + Math.random() * 320, r: 30, t: 60 }); }
  function update() {
    targets.forEach(tg => tg.t--);
    targets = targets.filter(tg => tg.t > 0);
    if (Math.random() < 0.05) spawn();
    if (Math.floor(t) !== Math.floor(t - 1/60)) { t -= 1/60; if (t <= 0) { Sounds.sfx.gameover(); reset(); } }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#1a0033');
    targets.forEach(tg => { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(tg.x, tg.y, 6, 0, Math.PI*2); ctx.fill(); });
    Games.text(ctx, `TIME ${Math.ceil(t)}`, 10, 10, 18, '#fff');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | ${Math.ceil(t)}s`; }
  function hit(x, y) {
    Sounds.sfx.hit();
    targets = targets.filter(tg => { if (Math.abs(tg.x - x) < tg.r && Math.abs(tg.y - y) < tg.r) { score += Math.max(1, 10 - Math.floor(Math.sqrt((tg.x - x) ** 2 + (tg.y - y) ** 2) / 4)); return false; } return true; });
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); hit((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 58. 跑步平台 RUNNER PLATFORM
// ============================================================
Games.define('runnerplat', {
  name: '跑酷',
  desc: '无尽跑步，跳过陷阱',
  icon: '🏃',
  cat: 'action',
  controls: '空格/点击 跳跃 · 双击二段跳'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let player, obs, score, vy, jumps, loop;
  function reset() { player = { x: 60, y: 380 }; obs = []; score = 0; vy = 0; jumps = 0; updateHUD(); }
  function update() {
    vy += 0.6; player.y += vy;
    if (player.y > 380) { player.y = 380; vy = 0; jumps = 0; }
    score++;
    if (Math.random() < 0.02) obs.push({ x: W, y: 360, w: 20, h: 40 });
    obs.forEach(o => o.x -= 6);
    obs = obs.filter(o => o.x > -40);
    obs.forEach(o => { if (player.x < o.x + o.w && player.x + 20 > o.x && player.y < o.y + o.h && player.y + 30 > o.y) { Sounds.sfx.gameover(); reset(); } });
    updateHUD();
  }
  function jump() { if (jumps < 2) { vy = -10; jumps++; Sounds.sfx.jump(); } }
  function draw() {
    Games.clear(ctx, W, H, '#88aaff');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 410, W, 70);
    ctx.fillStyle = '#aa4400'; obs.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
    ctx.fillStyle = '#00ff00'; ctx.fillRect(player.x, player.y, 20, 30);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const onClick = () => jump();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => jump() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 59. 激光 GRID LASER
// ============================================================
Games.define('laser', {
  name: '激光网格',
  desc: '穿越激光网格到达终点',
  icon: '🔴',
  cat: 'action',
  controls: '方向键移动 · 别碰激光'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let player, lasers, exit, t, loop;
  function reset() { player = { x: 20, y: 20 }; lasers = []; t = 0; exit = { x: 330, y: 440, w: 24, h: 24 };
    for (let i = 0; i < 6; i++) lasers.push({ x: 0, y: 80 + i * 60, w: W, h: 4, phase: i * 0.5, dir: i % 2 ? 'h' : 'v' });
    updateHUD();
  }
  function update() {
    t += 0.05;
    lasers.forEach(l => { if (l.dir === 'v') l.x = Math.sin(t + l.phase) * 100 + 100; });
    lasers.forEach(l => { if (l.dir === 'h' && l.x < player.x - 20) l.x = player.x - 20; if (l.dir === 'v' && l.y < player.y - 20) l.y = player.y - 20; });
    lasers.forEach(l => { if (player.x + 8 > l.x && player.x < l.x + l.w && player.y + 8 > l.y && player.y < l.y + l.h) { Sounds.sfx.gameover(); reset(); } });
    if (player.x > exit.x && player.y > exit.y) { Sounds.sfx.win(); reset(); }
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001122');
    ctx.fillStyle = '#00ff00'; ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    lasers.forEach(l => { ctx.fillStyle = '#ff0000'; ctx.fillRect(l.x, l.y, l.w, l.h); });
    ctx.fillStyle = '#00ffff'; ctx.fillRect(player.x, player.y, 8, 8);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'REACH EXIT'; }
  const handler = Games.key({ 'arrowleft': () => player.x -= 5, 'arrowright': () => player.x += 5, 'arrowup': () => player.y -= 5, 'arrowdown': () => player.y += 5 });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 60. 闪电 SWORD FLASH
// ============================================================
Games.define('flash', {
  name: '闪电斩',
  desc: '按节奏点击斩击',
  icon: '⚡',
  cat: 'action',
  controls: '按节奏点击 · 连击得分'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let notes, score, combo, loop, t;
  function reset() { notes = []; score = 0; combo = 0; t = 0; updateHUD(); }
  function update() {
    t += 1;
    if (t % 30 === 0) { const lane = Math.floor(Math.random() * 4); notes.push({ y: -20, lane, alive: true }); }
    notes.forEach(n => n.y += 4);
    notes = notes.filter(n => n.y < H);
    notes.forEach(n => { if (n.alive && n.y > 380 && n.y < 420) {} else if (n.alive && n.y >= 420) { n.alive = false; combo = 0; } });
    updateHUD();
  }
  function hit(lane) {
    let got = false;
    notes.forEach(n => { if (n.alive && n.lane === lane && n.y > 360 && n.y < 410) { n.alive = false; score += 10 * (1 + combo); combo++; got = true; Sounds.sfx.blip(); } });
    if (!got) { combo = 0; Sounds.sfx.deny(); }
  }
  function draw() {
    Games.clear(ctx, W, H, '#000018');
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#001a33' : '#000022'; ctx.fillRect(i * 90, 0, 90, H); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ffff00'; ctx.fillRect(i * 90 + 30, 380, 30, 4); }
    notes.forEach(n => { ctx.fillStyle = '#00ffff'; ctx.fillRect(n.lane * 90 + 30, n.y, 30, 30); });
    Games.text(ctx, `COMBO ${combo}`, 10, 10, 18, '#fff');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | COMBO ${combo}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width); hit(Math.floor(x / 90)); };
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ '1': () => hit(0), '2': () => hit(1), '3': () => hit(2), '4': () => hit(3) });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 61. 攻城 CASTLE ATTACK
// ============================================================
Games.define('castle', {
  name: '攻城',
  desc: '指挥弓箭手射击城堡',
  icon: '🏰',
  cat: 'action',
  controls: '点击城堡弱点 · 限时 90 秒'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 360);
  const W = 480, H = 360;
  let castle, score, time, archers, loop;
  function reset() { castle = { hp: 20 }; score = 0; time = 90; archers = []; for (let i = 0; i < 3; i++) archers.push({ x: 50 + i * 30, y: 280, vy: -8, alive: true }); updateHUD(); }
  function update() {
    archers.forEach(a => { a.vy += 0.4; a.y += a.vy; if (a.y > 350) { a.y = 350; a.vy = 0; a.alive = true; } });
    if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } }
    updateHUD();
  }
  function shoot(x, y) {
    archers.forEach(a => { if (a.alive) { a.vy = -12 - Math.random() * 4; a.alive = false; Sounds.sfx.shoot(); if (Math.abs(x - 400) < 30 && Math.abs(y - 200) < 30) { castle.hp--; score += 5; Sounds.sfx.hit(); if (castle.hp <= 0) { Sounds.sfx.win(); reset(); } } } });
  }
  function draw() {
    Games.clear(ctx, W, H, '#88aaff');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 320, W, 40);
    ctx.fillStyle = '#666'; ctx.fillRect(360, 160, 100, 160);
    ctx.fillStyle = '#aa4400'; ctx.fillRect(370, 180, 12, 16);
    archers.forEach(a => ctx.fillRect(a.x, a.y, 8, 16));
    ctx.fillStyle = '#ff0000'; ctx.font = '16px VT323'; ctx.textAlign = 'left';
    ctx.fillText(`HP ${castle.hp}`, 360, 360);
    ctx.fillText(`TIME ${Math.ceil(time)}`, 10, 20);
    ctx.fillText(`SCORE ${score}`, 10, 40);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | HP ${castle.hp} | ${Math.ceil(time)}s`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); shoot((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 62. 雷电战 THUNDER
// ============================================================
Games.define('thunder', {
  name: '雷电',
  desc: '驾驶战机穿越弹幕',
  icon: '⚡',
  cat: 'action',
  controls: '方向键移动 · 空格射击'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let ship, bullets, enemies, score, loop;
  function reset() { ship = { x: 180, y: 400 }; bullets = []; enemies = []; score = 0; updateHUD(); }
  function update() {
    ship.x = Math.max(0, Math.min(340, ship.x)); ship.y = Math.max(0, Math.min(460, ship.y));
    bullets.forEach(b => b.y -= 7);
    bullets = bullets.filter(b => b.y > 0);
    if (Math.random() < 0.05) enemies.push({ x: Math.random() * 320, y: -20, vy: 2, alive: true });
    enemies.forEach(e => e.y += e.vy);
    enemies = enemies.filter(e => e.y < H);
    bullets.forEach((b, bi) => enemies.forEach((e, ei) => { if (e.alive && Math.abs(b.x - e.x) < 14 && Math.abs(b.y - e.y) < 14) { e.alive = false; bullets.splice(bi, 1); score += 20; Sounds.sfx.hit(); } }));
    enemies = enemies.filter(e => e.alive);
    enemies.forEach(e => { if (Math.abs(e.x - ship.x) < 16 && Math.abs(e.y - ship.y) < 16) { Sounds.sfx.gameover(); reset(); } });
    updateHUD();
  }
  function draw() {
    Games.clear(ctx, W, H, '#000018');
    enemies.forEach(e => { ctx.fillStyle = '#ff00ff'; ctx.fillRect(e.x - 10, e.y - 10, 20, 20); });
    ctx.fillStyle = '#00ffff'; ctx.fillRect(ship.x - 12, ship.y - 8, 24, 16);
    ctx.fillStyle = '#ff0'; bullets.forEach(b => ctx.fillRect(b.x - 1, b.y - 4, 2, 8));
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const handler = Games.key({
    'arrowleft': () => ship.x -= 10, 'arrowright': () => ship.x += 10, 'arrowup': () => ship.y -= 10, 'arrowdown': () => ship.y += 10,
    ' ': () => { bullets.push({ x: ship.x, y: ship.y - 8 }); Sounds.sfx.shoot(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 63. 数和 KAKURO
// ============================================================
Games.define('kakuro', {
  name: '数和',
  desc: '填数字使横纵之和等于提示',
  icon: '🧮',
  cat: 'puzzle',
  controls: '点击格子 · 输入 1-9 · 不能重复'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 5, CELL = 70;
  const SUM_H = [null, 16, 24, 17, 23, null];
  const SUM_V = [null, 18, 27, 19, 14, 21];
  let board, sel, sol, errors;
  const SOL = [
    [1, 6, 4, 5, 3],
    [5, 3, 2, 7, 6],
    [3, 8, 1, 4, 7],
    [6, 2, 9, 1, 5],
    [4, 5, 7, 8, 2]
  ];
  function reset() { board = Array.from({ length: N }, () => Array(N).fill(0)); sel = { x: 0, y: 0 }; errors = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (x === sel.x && y === sel.y) ? '#ff0066' : '#1a0033';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (board[y][x]) { ctx.fillStyle = board[y][x] === sol[y][x] ? '#00ff00' : '#ff0000'; ctx.font = '28px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2); }
    }
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, W, H);
  }
  function setNum(n) {
    if (n === 0 || board[sel.y][sel.x] === 0) { board[sel.y][sel.x] = n; Sounds.sfx.beep(); draw(); check(); }
  }
  function check() {
    let ok = true;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] && board[y][x] !== sol[y][x]) ok = false;
    if (ok) { Sounds.sfx.win(); status.textContent = 'SOLVED!'; }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'FILL CELLS'; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); sel.x = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); sel.y = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); draw(); };
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({
    '1': () => setNum(1), '2': () => setNum(2), '3': () => setNum(3), '4': () => setNum(4), '5': () => setNum(5),
    '6': () => setNum(6), '7': () => setNum(7), '8': () => setNum(8), '9': () => setNum(9), '0': () => setNum(0),
    'arrowleft': () => { sel.x = Math.max(0, sel.x - 1); draw(); },
    'arrowright': () => { sel.x = Math.min(N - 1, sel.x + 1); draw(); },
    'arrowup': () => { sel.y = Math.max(0, sel.y - 1); draw(); },
    'arrowdown': () => { sel.y = Math.min(N - 1, sel.y + 1); draw(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
});

// ============================================================
// 64. 围栏 BRIDGES (Hashiwokakero)
// ============================================================
Games.define('bridges', {
  name: '造桥',
  desc: '用桥连接所有岛屿',
  icon: '🌉',
  cat: 'puzzle',
  controls: '点击两个相邻岛屿之间建桥'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 5, CELL = 70;
  let islands, bridges, sel;
  function reset() {
    islands = [{ x: 0, y: 0, n: 3 }, { x: 2, y: 0, n: 4 }, { x: 4, y: 0, n: 2 }, { x: 0, y: 2, n: 3 }, { x: 2, y: 2, n: 5 }, { x: 4, y: 2, n: 3 }, { x: 0, y: 4, n: 4 }, { x: 2, y: 4, n: 2 }, { x: 4, y: 4, n: 3 }];
    bridges = []; sel = null; updateHUD(); draw();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a33');
    bridges.forEach(b => {
      const a = islands[b.a], c = islands[b.c];
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x * CELL + CELL/2, a.y * CELL + CELL/2);
      ctx.lineTo(c.x * CELL + CELL/2, c.y * CELL + CELL/2);
      ctx.stroke();
    });
    islands.forEach((is, i) => {
      ctx.fillStyle = sel === i ? '#ff0066' : '#00ffff';
      ctx.beginPath(); ctx.arc(is.x * CELL + CELL/2, is.y * CELL + CELL/2, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = '18px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(is.n, is.x * CELL + CELL/2, is.y * CELL + CELL/2);
    });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'CONNECT'; }
  function click(x, y) {
    const px = x * CELL + CELL/2, py = y * CELL + CELL/2;
    for (let i = 0; i < islands.length; i++) {
      const is = islands[i];
      if (Math.abs(is.x * CELL + CELL/2 - px) < 20 && Math.abs(is.y * CELL + CELL/2 - py) < 20) {
        if (sel === null) sel = i;
        else if (sel !== i) {
          bridges.push({ a: Math.min(sel, i), c: Math.max(sel, i) });
          sel = null; Sounds.sfx.beep();
        }
        draw();
        return;
      }
    }
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(((e.clientX - r.left) * (W/r.width)) / CELL, ((e.clientY - r.top) * (H/r.height)) / CELL); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => {};
});

// ============================================================
// 65. 方块分割 SHIKAKU
// ============================================================
Games.define('shikaku', {
  name: '方块分割',
  desc: '把矩形分成若干数字标记的方块',
  icon: '🔲',
  cat: 'puzzle',
  controls: '拖动鼠标绘制矩形'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 6, CELL = 60;
  let board, drag;
  function reset() {
    board = Array.from({ length: N }, () => Array(N).fill(0));
    const cells = [{ x: 0, y: 0, n: 6 }, { x: 3, y: 0, n: 4 }, { x: 0, y: 2, n: 8 }, { x: 3, y: 3, n: 4 }, { x: 1, y: 4, n: 6 }, { x: 4, y: 5, n: 3 }];
    cells.forEach(c => board[c.y][c.x] = c.n);
    drag = null; updateHUD(); draw();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a002a');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (board[y][x]) { ctx.fillStyle = '#00ffff'; ctx.font = '24px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2); }
    }
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); }
    if (drag) {
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.strokeRect(x0 * CELL, y0 * CELL, (x1 - x0 + 1) * CELL, (y1 - y0 + 1) * CELL);
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'DRAW RECTS'; }
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); drag = { x0: Math.floor((e.clientX - r.left) * (W/r.width) / CELL), y0: Math.floor((e.clientY - r.top) * (H/r.height) / CELL), x1: 0, y1: 0 }; };
  const onMove = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); drag.x1 = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); drag.y1 = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); draw(); };
  const onUp = () => { drag = null; draw(); };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  reset();
  return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 66. 推箱子 SOKOBAN
// ============================================================
Games.define('sokoban', {
  name: '推箱子',
  desc: '把箱子推到目标位置',
  icon: '📦',
  cat: 'puzzle',
  controls: '方向键移动并推动箱子'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, CELL = 40;
  const MAP_STR = "##########\n# ..  X  #\n#  X SX  #\n#   .  X.#\n#  $     #\n#  $.    #\n##########";
  let map, player, score, total;
  function reset() {
    map = []; const lines = MAP_STR.split('\n'); let p = null, t = 0;
    for (let y = 0; y < lines.length; y++) { const row = []; for (let x = 0; x < lines[y].length; x++) { const c = lines[y][x]; row.push(c); if (c === 'S') p = { x, y }; if (c === '.') t++; } map.push(row); }
    player = p; total = t; updateHUD();
  }
  function step(dx, dy) {
    const nx = player.x + dx, ny = player.y + dy;
    if (map[ny][nx] === '#') return;
    if (map[ny][nx] === '$' || map[ny][nx] === '*') {
      const bx = nx + dx, by = ny + dy;
      if (map[by][bx] === '#' || map[by][bx] === '$' || map[by][bx] === '*') return;
      const isGoal = map[by][bx] === '.';
      map[by][bx] = isGoal ? '*' : '$';
      const wasGoal = map[ny][nx] === '*';
      map[ny][nx] = wasGoal ? '.' : ' ';
      Sounds.sfx.move();
    }
    player.x = nx; player.y = ny;
    let done = 0;
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) if (map[y][x] === '*') done++;
    score = done;
    if (done === total) Sounds.sfx.win();
    updateHUD(); draw();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001100');
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) {
      const c = map[y][x];
      if (c === '#') { ctx.fillStyle = '#444'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
      if (c === '.') { ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(x * CELL + CELL/2, y * CELL + CELL/2, 6, 0, Math.PI*2); ctx.fill(); }
      if (c === '$' || c === '*') { ctx.fillStyle = c === '*' ? '#00ff00' : '#aa4400'; ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8); }
    }
    ctx.fillStyle = '#00aaff'; ctx.fillRect(player.x * CELL + 4, player.y * CELL + 4, CELL - 8, CELL - 8);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `BOXES ${score}/${total}`; }
  const handler = Games.key({ 'arrowleft': () => step(-1, 0), 'arrowright': () => step(1, 0), 'arrowup': () => step(0, -1), 'arrowdown': () => step(0, 1) });
  reset();
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
});

// ============================================================
// 67. 管道连接 PIPE CONNECT
// ============================================================
Games.define('pipes', {
  name: '管道连接',
  desc: '旋转管道让水流通',
  icon: '🚰',
  cat: 'puzzle',
  controls: '点击管道旋转 · 连接到水源'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 5, CELL = 70;
  const TYPES = ['│', '─', '┘', '└', '┐', '┌', '┤', '┴', '├', '┬', '┼'];
  let grid, flow, solved;
function reset() { grid = []; flow = Array.from({ length: N }, () => Array(N).fill(false)); for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) { let t; if (x === 0 && y === 2) t = '┌'; else if (x === N - 1 && y === 2) t = '┐'; else t = TYPES[Math.floor(Math.random() * TYPES.length)]; r.push({ t, r: Math.floor(Math.random() * 4) }); } grid.push(r); } solved = false; updateHUD(); draw(); check(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = flow[y][x] ? '#00ffff' : '#333';
      ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
      ctx.save(); ctx.translate(x * CELL + CELL/2, y * CELL + CELL/2); ctx.rotate((grid[y][x].r || 0) * Math.PI / 2);
      ctx.fillStyle = flow[y][x] ? '#000' : '#888'; ctx.font = '40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(grid[y][x].t, 0, 0);
      ctx.restore();
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = solved ? 'SOLVED' : 'ROTATE PIPES'; }
  function check() {
    flow = Array.from({ length: N }, () => Array(N).fill(false));
    function dfs(x, y, from) { if (x < 0 || x >= N || y < 0 || y >= N) return; if (flow[y][x]) return; flow[y][x] = true; const t = grid[y][x].t, r = grid[y][x].r; if (t === '│' || t === '┌' || t === '┐' || t === '├' || t === '┤' || t === '┼' || t === '┬' || t === '┴') { if (from !== 'u') dfs(x, y - 1, 'd'); if (from !== 'd') dfs(x, y + 1, 'u'); } if (t === '─' || t === '┘' || t === '└' || t === '├' || t === '┤' || t === '┼' || t === '┬' || t === '┴') { if (from !== 'l') dfs(x - 1, y, 'r'); if (from !== 'r') dfs(x + 1, y, 'l'); } }
    dfs(0, 2, 'l'); if (flow[2][N - 1]) { solved = true; Sounds.sfx.win(); }
  }
  function onClick(e) { const r = canvas.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) * (W/r.width) / CELL), y = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); grid[y][x].r = (grid[y][x].r + 1) % 4; Sounds.sfx.click(); check(); draw(); }
  canvas.addEventListener('mousedown', onClick);
  reset();
  const _checkT = Games.tickLoop(check, 500);
  return () => { _checkT(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 68. 滑块拼图 SLIDING TILE
// ============================================================
Games.define('sliding', {
  name: '滑块拼图',
  desc: '滑动方块还原图片',
  icon: '🧩',
  cat: 'puzzle',
  controls: '点击空白旁边的方块滑动'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 3, CELL = 120;
  let board, moves, solved;
  function reset() { board = []; let n = 1; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(n++); board.push(r); } board[N - 1][N - 1] = 0; moves = 0; solved = false; for (let i = 0; i < 100; i++) { const empty = findEmpty(); const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => empty.x + dx >= 0 && empty.x + dx < N && empty.y + dy >= 0 && empty.y + dy < N); const [dx,dy] = dirs[Math.floor(Math.random() * dirs.length)]; board[empty.y][empty.x] = board[empty.y + dy][empty.x + dx]; board[empty.y + dy][empty.x + dx] = 0; } updateHUD(); draw(); }
  function findEmpty() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return { x, y }; }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    let n = 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (board[y][x]) {
        const c = (board[y][x] * 30) % 360; ctx.fillStyle = `hsl(${c}, 70%, 50%)`;
        ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
        ctx.fillStyle = '#000'; ctx.font = '36px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2);
      }
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  function click(x, y) {
    const e = findEmpty(); if (Math.abs(e.x - x) + Math.abs(e.y - y) === 1) { board[e.y][e.x] = board[y][x]; board[y][x] = 0; moves++; Sounds.sfx.move(); let ok = true; let n = 1; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (y === N - 1 && x === N - 1) { if (board[y][x] !== 0) ok = false; } else if (board[y][x] !== n++) ok = false; } if (ok) { Sounds.sfx.win(); solved = true; } updateHUD(); draw(); }
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 69. 数独 (10x10 lite done already)  -- skip and do Word Search
// ============================================================
Games.define('wordsearch', {
  name: '单词搜索',
  desc: '在字母矩阵中找到所有单词',
  icon: '🔤',
  cat: 'puzzle',
  controls: '拖动选择字母 · 找到目标单词'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400, N = 10, CELL = 40;
  const WORDS = ['CODE', 'PIXEL', 'GAME', 'ARCADE', 'NINJA', 'FUN'];
  let grid, found, sel;
  function reset() {
    grid = Array.from({ length: N }, () => Array(N).fill('')); found = []; sel = null;
    WORDS.forEach(w => { let placed = false, tries = 0; while (!placed && tries < 100) { const dir = [[1,0],[0,1],[1,1],[1,-1]][Math.floor(Math.random() * 4)]; const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); if (x + dir[0] * w.length >= 0 && x + dir[0] * w.length < N && y + dir[1] * w.length >= 0 && y + dir[1] * w.length < N) { let ok = true; for (let i = 0; i < w.length; i++) if (grid[y + dir[1] * i][x + dir[0] * i] && grid[y + dir[1] * i][x + dir[0] * i] !== w[i]) { ok = false; break; } if (ok) { for (let i = 0; i < w.length; i++) grid[y + dir[1] * i][x + dir[0] * i] = w[i]; placed = true; } } tries++; } });
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    updateHUD(); draw();
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = '#1a0033'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(grid[y][x], x * CELL + CELL/2, y * CELL + CELL/2);
    }
    found.forEach(f => f.forEach(([x, y]) => { ctx.fillStyle = 'rgba(0,255,0,0.3)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }));
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `${found.length}/${WORDS.length} WORDS`; }
  function checkWord(cells) {
    const word = cells.map(([x,y]) => grid[y][x]).join('');
    if (WORDS.includes(word) && !found.some(f => f.length === cells.length && f.every((c,i) => c[0] === cells[i][0] && c[1] === cells[i][1]))) { found.push(cells); Sounds.sfx.win(); if (found.length === WORDS.length) status.textContent = 'ALL FOUND!'; updateHUD(); draw(); }
  }
  let drag = null;
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); drag = { x: Math.floor((e.clientX - r.left) * (W/r.width) / CELL), y: Math.floor((e.clientY - r.top) * (H/r.height) / CELL) }; };
  const onMove = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) * (W/r.width) / CELL), y = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); if (x !== drag.x || y !== drag.y) { const cells = []; const dx = Math.sign(x - drag.x), dy = Math.sign(y - drag.y); let cx = drag.x, cy = drag.y; while (cx !== x + dx || cy !== y + dy) { cells.push([cx, cy]); cx += dx; cy += dy; } checkWord(cells); drag = { x, y }; } };
  const onUp = () => { drag = null; };
  canvas.addEventListener('mousedown', onDown); canvas.addEventListener('mousemove', onMove); canvas.addEventListener('mouseup', onUp);
  reset();
  return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 70. 三消 MATCH 3
// ============================================================
Games.define('match3', {
  name: '三消',
  desc: '交换相邻宝石，三连消除',
  icon: '💎',
  cat: 'puzzle',
  controls: '点击两个相邻宝石交换'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 8, CELL = 45;
  const GEMS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800'];
  let board, sel, score, busy;
  function reset() { board = []; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(Math.floor(Math.random() * GEMS.length)); board.push(r); } sel = null; score = 0; busy = false; while (findMatches().length) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) board[y][x] = Math.floor(Math.random() * GEMS.length); } updateHUD(); draw(); }
  function findMatches() { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N - 2; x++) if (board[y][x] === board[y][x+1] && board[y][x] === board[y][x+2]) m.push([x, y]); for (let x = 0; x < N; x++) for (let y = 0; y < N - 2; y++) if (board[y][x] === board[y+1][x] && board[y][x] === board[y+2][x]) m.push([x, y]); return m; }
  function draw() {
    Games.clear(ctx, W, H, '#000020');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (sel && sel.x === x && sel.y === y) ? '#fff' : GEMS[board[y][x]];
      ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  function click(x, y) {
    if (busy) return;
    if (!sel) { sel = { x, y }; Sounds.sfx.select(); }
    else if (Math.abs(sel.x - x) + Math.abs(sel.y - y) === 1) {
      busy = true;
      [board[sel.y][sel.x], board[y][x]] = [board[y][x], board[sel.y][sel.x]];
      const matches = findMatches();
      if (matches.length === 0) { [board[sel.y][sel.x], board[y][x]] = [board[y][x], board[sel.y][sel.x]]; Sounds.sfx.deny(); }
      else { score += matches.length * 10; Sounds.sfx.clear(); matches.forEach(([mx, my]) => { for (let i = my; i >= 0; i--) board[i + 1][mx] = board[i][mx] || Math.floor(Math.random() * GEMS.length); board[0][mx] = Math.floor(Math.random() * GEMS.length); }); }
      sel = null; busy = false; updateHUD(); draw();
    } else { sel = { x, y }; Sounds.sfx.select(); }
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 71. 西洋跳棋 CHECKERS
// ============================================================
Games.define('checkers', {
  name: '西洋跳棋',
  desc: '经典跳棋，吃光对方',
  icon: '🟫',
  cat: 'puzzle',
  controls: '点击选子 · 点击目标位置移动'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 8, CELL = 45;
  let board, sel, turn, score;
  function reset() { board = []; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(null); board.push(r); } for (let y = 0; y < 3; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = 'b'; for (let y = 5; y < 8; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = 'w'; sel = null; turn = 'w'; score = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 === 0 ? '#aa6633' : '#552200'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (board[y][x]) { ctx.fillStyle = board[y][x] === 'w' ? '#fff' : '#000'; ctx.beginPath(); ctx.arc(x * CELL + CELL/2, y * CELL + CELL/2, 16, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; if (sel && sel.x === x && sel.y === y) ctx.stroke(); }
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `TURN: ${turn === 'w' ? 'WHITE' : 'BLACK'}`; }
  function click(x, y) {
    if (board[y][x] && board[y][x][0] === turn) { sel = { x, y }; Sounds.sfx.select(); }
    else if (sel && !board[y][x] && (x + y) % 2 === 1) {
      if (Math.abs(x - sel.x) === 1 && Math.abs(y - sel.y) === 1) { board[y][x] = board[sel.y][sel.x]; board[sel.y][sel.x] = null; sel = null; turn = turn === 'w' ? 'b' : 'w'; Sounds.sfx.move(); }
      else if (Math.abs(x - sel.x) === 2 && Math.abs(y - sel.y) === 2) { const mx = (x + sel.x) / 2, my = (y + sel.y) / 2; if (board[my][mx] && board[my][mx][0] !== turn) { board[y][x] = board[sel.y][sel.x]; board[sel.y][sel.x] = null; board[my][mx] = null; sel = null; turn = turn === 'w' ? 'b' : 'w'; score += 10; Sounds.sfx.eat(); } }
    }
    updateHUD(); draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 72. 形状匹配 SHAPE MATCH
// ============================================================
Games.define('shapematch', {
  name: '形状匹配',
  desc: '选择正确形状填到阴影中',
  icon: '🔷',
  cat: 'puzzle',
  controls: '点击形状拖到对应阴影'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  const SHAPES = ['square', 'circle', 'triangle', 'diamond'];
  let targets, current, score, loop;
  function reset() { targets = []; for (let i = 0; i < 3; i++) targets.push({ x: 30 + i * 110, y: 200, type: SHAPES[Math.floor(Math.random() * SHAPES.length)] }); current = { x: 50, y: 400, type: targets[0].type, dragging: false }; score = 0; updateHUD(); draw(); }
  function drawShape(x, y, t, filled) {
    ctx.fillStyle = filled ? '#00ff00' : 'rgba(255,255,255,0.1)'; ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
    if (t === 'square') { ctx.beginPath(); ctx.rect(x, y, 40, 40); if (filled) ctx.fill(); ctx.stroke(); }
    if (t === 'circle') { ctx.beginPath(); ctx.arc(x + 20, y + 20, 20, 0, Math.PI*2); if (filled) ctx.fill(); ctx.stroke(); }
    if (t === 'triangle') { ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x, y + 40); ctx.lineTo(x + 40, y + 40); ctx.closePath(); if (filled) ctx.fill(); ctx.stroke(); }
    if (t === 'diamond') { ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x + 20, y + 40); ctx.lineTo(x, y + 20); ctx.closePath(); if (filled) ctx.fill(); ctx.stroke(); }
  }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    targets.forEach(t => drawShape(t.x, t.y, t.type, false));
    drawShape(current.x, current.y, current.type, true);
    Games.text(ctx, `SCORE ${score}`, 10, 10, 18, '#fff');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  function drop(x, y) {
    const t = targets.find(t => x > t.x && x < t.x + 40 && y > t.y && y < t.y + 40);
    if (t && t.type === current.type) { score += 10; Sounds.sfx.win(); targets.splice(targets.indexOf(t), 1); if (!targets.length) reset(); else { current.type = targets[0].type; current.x = 50; current.y = 400; } }
    else { current.x = 50; current.y = 400; Sounds.sfx.deny(); }
    draw();
  }
  let drag = null;
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); if (Math.abs(x - current.x - 20) < 25 && Math.abs(y - current.y - 20) < 25) drag = { x, y, ox: current.x, oy: current.y }; };
  const onMove = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); current.x = drag.ox + (x - drag.x); current.y = drag.oy + (y - drag.y); draw(); };
  const onUp = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); drop((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); drag = null; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  reset();
  return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 73. 数独 (mini 4x4)
// ============================================================
Games.define('mini4', {
  name: '迷你数独',
  desc: '4x4 数独入门版',
  icon: '🔢',
  cat: 'puzzle',
  controls: '点击格子 · 输入 1-4'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 320, 320);
  const W = 320, H = 320, N = 4, CELL = 80;
  const SOL = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
  let board, given, sel;
  function reset() { board = SOL.map(r => [...r]); given = []; for (let i = 0; i < 6; i++) { const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); if (!given.some(g => g.x === x && g.y === y)) given.push({ x, y }); else i--; } for (const g of given) board[g.y][g.x] = SOL[g.y][g.x]; sel = { x: 0, y: 0 }; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      ctx.fillStyle = (x === sel.x && y === sel.y) ? '#ff0066' : '#1a0033'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (board[y][x]) { ctx.fillStyle = given.some(g => g.x === x && g.y === y) ? '#00ffff' : '#ffff00'; ctx.font = '36px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2); }
    }
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, W, H); ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  }
  function setNum(n) { if (!given.some(g => g.x === sel.x && g.y === sel.y)) { board[sel.y][sel.x] = n; Sounds.sfx.beep(); draw(); let ok = true; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== SOL[y][x]) ok = false; if (ok) { Sounds.sfx.win(); status.textContent = 'SOLVED!'; } } }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'FILL NUMBERS'; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); sel.x = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); sel.y = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); draw(); };
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ '1': () => setNum(1), '2': () => setNum(2), '3': () => setNum(3), '4': () => setNum(4), '0': () => setNum(0), 'arrowleft': () => { sel.x = Math.max(0, sel.x - 1); draw(); }, 'arrowright': () => { sel.x = Math.min(N - 1, sel.x + 1); draw(); }, 'arrowup': () => { sel.y = Math.max(0, sel.y - 1); draw(); }, 'arrowdown': () => { sel.y = Math.min(N - 1, sel.y + 1); draw(); } });
  reset();
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
});

// ============================================================
// 74. 数学快答 MATH RUSH
// ============================================================
Games.define('mathrush', {
  name: '数学快答',
  desc: '快速解答数学题',
  icon: '➕',
  cat: 'puzzle',
  controls: '点击正确答案'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let problem, score, time, loop;
  function gen() {
    const a = Math.floor(Math.random() * 20) + 1, b = Math.floor(Math.random() * 20) + 1;
    const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
    let ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const choices = [ans]; while (choices.length < 4) { const v = ans + Math.floor(Math.random() * 10) - 5; if (!choices.includes(v) && v >= 0) choices.push(v); }
    for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    problem = { q: `${a} ${op} ${b}`, ans, choices };
  }
  function reset() { score = 0; time = 30; gen(); updateHUD(); draw(); }
  function update() { if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } updateHUD(); } }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    ctx.fillStyle = '#00ffff'; ctx.font = '48px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(problem.q, W/2, 100);
    problem.choices.forEach((c, i) => { ctx.fillStyle = '#ff0066'; ctx.fillRect(40, 200 + i * 60, 280, 50); ctx.fillStyle = '#fff'; ctx.font = '32px VT323'; ctx.fillText(c, W/2, 225 + i * 60); });
    Games.text(ctx, `TIME ${Math.ceil(time)}`, 10, 10, 18, '#fff');
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | ${Math.ceil(time)}s`; }
  function pick(i) { if (problem.choices[i] === problem.ans) { score++; Sounds.sfx.blip(); } else { Sounds.sfx.deny(); } gen(); draw(); }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const y = (e.clientY - r.top) * (H/r.height); pick(Math.floor((y - 200) / 60)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 75. 数独 KILLER
// ============================================================
Games.define('killer', {
  name: '杀手数独',
  desc: '数独变体，笼内之和提示',
  icon: '🔪',
  cat: 'puzzle',
  controls: '点击格子 · 输入 1-9'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 6, CELL = 60;
  const SOL = [[1, 2, 3, 4, 5, 6], [4, 5, 6, 1, 2, 3], [2, 3, 1, 5, 6, 4], [5, 6, 4, 2, 3, 1], [3, 1, 2, 6, 4, 5], [6, 4, 5, 3, 1, 2]];
  let board, sel;
  function reset() { board = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => Math.random() < 0.4 ? SOL[y][x] : 0)); sel = { x: 0, y: 0 }; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x === sel.x && y === sel.y) ? '#ff0066' : '#1a0033'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); if (board[y][x]) { ctx.fillStyle = '#00ff00'; ctx.font = '28px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2); } }
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, W, H);
  }
  function setNum(n) { board[sel.y][sel.x] = n; Sounds.sfx.beep(); draw(); let ok = true; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== SOL[y][x]) ok = false; if (ok) Sounds.sfx.win(); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'FILL 1-9'; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); sel.x = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); sel.y = Math.floor((e.clientY - r.top) * (H/r.height) / CELL); draw(); };
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ '1': () => setNum(1), '2': () => setNum(2), '3': () => setNum(3), '4': () => setNum(4), '5': () => setNum(5), '6': () => setNum(6), '0': () => setNum(0), 'arrowleft': () => { sel.x = Math.max(0, sel.x - 1); draw(); }, 'arrowright': () => { sel.x = Math.min(N - 1, sel.x + 1); draw(); }, 'arrowup': () => { sel.y = Math.max(0, sel.y - 1); draw(); }, 'arrowdown': () => { sel.y = Math.min(N - 1, sel.y + 1); draw(); } });
  reset();
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
});

// ============================================================
// 76. 颜色填充 FILL
// ============================================================
Games.define('fill', {
  name: '颜色填充',
  desc: '把同色区域扩展到整个棋盘',
  icon: '🎨',
  cat: 'puzzle',
  controls: '点击颜色扩展区域'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 320, 400);
  const W = 320, H = 400, N = 8, CELL = 40;
  const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800'];
  let board, moves, solved, loop;
function reset() { board = []; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(Math.floor(Math.random() * COLORS.length)); r.push(r[0]); board.push(r); } for (let i = 0; i < 3; i++) board[Math.floor(Math.random() * N)][Math.floor(Math.random() * N)] = board[0][0]; moves = 0; solved = false; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#000018');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = COLORS[board[y][x]]; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, CELL, CELL);
    COLORS.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * 60 + 20, N * CELL + 20, 40, 40); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  function flood(c) {
    if (c === board[0][0]) return;
    const old = board[0][0]; const visited = Array.from({ length: N }, () => Array(N).fill(false));
    function f(x, y) { if (x < 0 || x >= N || y < 0 || y >= N || visited[y][x] || board[y][x] !== old) return; visited[y][x] = true; board[y][x] = c; f(x - 1, y); f(x + 1, y); f(x, y - 1); f(x, y + 1); }
    f(0, 0); moves++; Sounds.sfx.swoosh(); let ok = true; for (let y = 0; y < N && ok; y++) for (let x = 0; x < N && ok; x++) if (board[y][x] !== board[0][0]) ok = false; if (ok) { Sounds.sfx.win(); solved = true; } draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const y = (e.clientY - r.top) * (H/r.height); if (y > N * CELL) { const x = (e.clientX - r.left) * (W/r.width); flood(Math.floor((x - 20) / 60)); } };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 77. 推箱子变体 ICE SLIDE
// ============================================================
Games.define('ice', {
  name: '冰面滑动',
  desc: '冰面滑行到目标',
  icon: '🧊',
  cat: 'puzzle',
  controls: '方向键滑行 · 撞墙停'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, CELL = 40;
  const MAP = [
    '##########',
    '#P     . #',
    '# ### ## #',
    '# #   #  #',
    '# # # ## #',
    '#   #    #',
    '##### ## #',
    '#     #  #',
    '# ######.#',
    '##########'
  ];
  let map, player, goal, moves;
  function reset() { map = MAP.map(r => r.split('')); player = { x: 1, y: 1 }; goal = { x: 8, y: 8 }; moves = 0; updateHUD(); draw(); }
  function step(dx, dy) {
    let nx = player.x, ny = player.y;
    while (map[ny + dy][nx + dx] !== '#') { nx += dx; ny += dy; if (map[ny][nx] === '#') { nx -= dx; ny -= dy; break; } }
    if (nx === player.x && ny === player.y) return;
    if (map[ny][nx] === '.') { Sounds.sfx.win(); }
    player.x = nx; player.y = ny; moves++; Sounds.sfx.move(); updateHUD(); draw();
  }
  function draw() {
    Games.clear(ctx, W, H, '#001a33');
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) { if (map[y][x] === '#') { ctx.fillStyle = '#444'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); } }
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(goal.x * CELL, goal.y * CELL, CELL, CELL);
    ctx.fillStyle = '#00aaff'; ctx.fillRect(player.x * CELL, player.y * CELL, CELL, CELL);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  const handler = Games.key({ 'arrowleft': () => step(-1, 0), 'arrowright': () => step(1, 0), 'arrowup': () => step(0, -1), 'arrowdown': () => step(0, 1) });
  reset();
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
});

// ============================================================
// 78. 跳棋变体 FROG JUMP
// ============================================================
Games.define('frogjump', {
  name: '青蛙跳',
  desc: '经典青蛙过河',
  icon: '🐸',
  cat: 'puzzle',
  controls: '点击青蛙选择 · 再点目标'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 200);
  const W = 480, H = 200, N = 7, CELL = 60;
  let frogs, sel, moves;
  function reset() { frogs = [null, null, null, 'g', 'r', 'r', 'r']; sel = null; moves = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a002a');
    for (let i = 0; i < N; i++) { ctx.fillStyle = '#1a0033'; ctx.fillRect(i * CELL + 10, 80, CELL - 20, CELL - 20); }
    for (let i = 0; i < N; i++) if (frogs[i]) { ctx.fillStyle = (sel === i) ? '#ff0' : (frogs[i] === 'g' ? '#00ff00' : '#ff0066'); ctx.beginPath(); ctx.arc(i * CELL + CELL/2, 100, 20, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  function click(i) {
    if (!sel && frogs[i]) { sel = i; Sounds.sfx.select(); }
    else if (sel !== null) {
      if (i === sel) sel = null;
      else if (!frogs[i] && Math.abs(i - sel) <= 2) {
        const mid = (i + sel) / 2;
        if ((i - sel) % 2 === 0 && frogs[mid]) {
          frogs[i] = frogs[sel]; frogs[sel] = null; moves++; Sounds.sfx.move(); sel = null;
          if (frogs[0] === 'g' && !frogs.slice(1).some(f => f === 'g')) Sounds.sfx.win();
        } else { sel = null; }
      } else { sel = null; }
    }
    draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 79. 华容道 SLIDE PUZZLE (mini 3x3)
// ============================================================
Games.define('slide3', {
  name: '滑块 3x3',
  desc: '还原数字顺序',
  icon: '🔢',
  cat: 'puzzle',
  controls: '点击空白旁边的方块'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 300, 300);
  const W = 300, H = 300, N = 3, CELL = 100;
  let board, moves;
  function reset() { board = [[1, 2, 3], [4, 5, 6], [7, 8, 0]]; for (let i = 0; i < 50; i++) { const e = findE(); const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => e.x + dx >= 0 && e.x + dx < N && e.y + dy >= 0 && e.y + dy < N); const [dx,dy] = dirs[Math.floor(Math.random() * dirs.length)]; board[e.y][e.x] = board[e.y + dy][e.x + dx]; board[e.y + dy][e.x + dx] = 0; } moves = 0; updateHUD(); draw(); }
  function findE() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return { x, y }; }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (board[y][x]) { ctx.fillStyle = '#00ffff'; ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8); ctx.fillStyle = '#000'; ctx.font = '40px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(board[y][x], x * CELL + CELL/2, y * CELL + CELL/2); } }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  function click(x, y) { const e = findE(); if (Math.abs(e.x - x) + Math.abs(e.y - y) === 1) { board[e.y][e.x] = board[y][x]; board[y][x] = 0; moves++; Sounds.sfx.move(); let ok = true; let n = 1; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (y === N - 1 && x === N - 1) { if (board[y][x] !== 0) ok = false; } else if (board[y][x] !== n++) ok = false; } if (ok) Sounds.sfx.win(); updateHUD(); draw(); } }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 80. 路径 PATH
// ============================================================
Games.define('path', {
  name: '路径规划',
  desc: '一笔画连所有点',
  icon: '✏️',
  cat: 'puzzle',
  controls: '拖动连接所有点'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let points, path, loop;
  function reset() { points = []; for (let i = 0; i < 6; i++) points.push({ x: 50 + Math.random() * 260, y: 50 + Math.random() * 260 }); path = []; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    for (let i = 0; i < path.length - 1; i++) { ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(path[i].x, path[i].y); ctx.lineTo(path[i+1].x, path[i+1].y); ctx.stroke(); }
    points.forEach(p => { ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill(); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `CONNECT ALL`; }
  let drag = null;
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); for (const p of points) if (Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12) { drag = p; if (!path.includes(p)) path.push(p); break; } draw(); };
  const onMove = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); for (const p of points) if (p !== drag && Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12 && !path.includes(p)) { path.push(p); drag = p; if (path.length === points.length) Sounds.sfx.win(); break; } draw(); };
  const onUp = () => { drag = null; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  reset();
  return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 81. 算24点 MAKE 24
// ============================================================
Games.define('make24', {
  name: '算 24',
  desc: '用四则运算凑 24',
  icon: '🎲',
  cat: 'puzzle',
  controls: '点击数字和运算符'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let nums, expr, loop;
  function gen() { nums = []; while (nums.length < 4) { const n = Math.floor(Math.random() * 13) + 1; if (!nums.includes(n)) nums.push(n); } expr = ''; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    ctx.fillStyle = '#00ffff'; ctx.font = '24px VT323'; ctx.textAlign = 'center';
    nums.forEach((n, i) => { ctx.fillStyle = '#ff0066'; ctx.fillRect(30 + i * 80, 50, 60, 60); ctx.fillStyle = '#fff'; ctx.fillText(n, 60 + i * 80, 90); });
    ctx.fillStyle = '#ffff00'; ctx.font = '32px VT323'; ctx.fillText(expr || '_', W/2, 200);
    ['+', '-', '*', '/', '(', ')', '='].forEach((op, i) => { ctx.fillStyle = '#444'; ctx.fillRect(20 + i * 50, 250, 40, 40); ctx.fillStyle = '#fff'; ctx.fillText(op, 40 + i * 50, 280); });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].forEach((b, i) => { ctx.fillStyle = '#0066ff'; ctx.fillRect(20 + (i % 4) * 80, 320 + Math.floor(i / 4) * 50, 70, 40); ctx.fillStyle = '#fff'; ctx.fillText(b, 55 + (i % 4) * 80, 348 + Math.floor(i / 4) * 50); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = 'REACH 24'; }
  function click(x, y) {
    if (y < 130) { expr += nums[Math.floor((x - 30) / 80)]; }
    else if (y < 200) {}
    else if (y < 300) { const i = Math.floor((x - 20) / 50); const ops = ['+', '-', '*', '/', '(', ')', '=']; if (i < 7) expr += ops[i]; }
    else { const row = Math.floor((y - 320) / 50), col = Math.floor((x - 20) / 80); const idx = row * 4 + col; const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']; if (idx < 12) { if (keys[idx] === 'C') expr = ''; else if (keys[idx] === 'OK') { try { const v = Games.safeEval(expr); if (Math.abs(v - 24) < 0.001) { Sounds.sfx.win(); gen(); return; } else { Sounds.sfx.deny(); } } catch (e) { Sounds.sfx.deny(); } expr = ''; } else expr += keys[idx]; } }
    Sounds.sfx.click(); draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  gen();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 82. 黑色拼图 JIGSAW
// ============================================================
Games.define('jigsaw', {
  name: '拼图',
  desc: '拖动拼图块还原图',
  icon: '🧩',
  cat: 'puzzle',
  controls: '点击两个相邻块交换'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 3, CELL = 120;
  let board, sel, moves;
  function reset() { board = []; let n = 0; for (let y = 0; y < N; y++) { const r = []; for (let x = 0; x < N; x++) r.push(n++); board.push(r); } for (let i = 0; i < 30; i++) { const x1 = Math.floor(Math.random() * N), y1 = Math.floor(Math.random() * N); const x2 = Math.floor(Math.random() * N), y2 = Math.floor(Math.random() * N); [board[y1][x1], board[y2][x2]] = [board[y2][x2], board[y1][x1]]; } sel = null; moves = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = board[y][x]; if (v < N * N - 1) { const c = (v * 40) % 360; ctx.fillStyle = `hsl(${c}, 70%, 50%)`; ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4); ctx.fillStyle = '#fff'; ctx.font = '24px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v + 1, x * CELL + CELL/2, y * CELL + CELL/2); if (sel && sel.x === x && sel.y === y) { ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 3; ctx.strokeRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4); } }
    }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `MOVES ${moves}`; }
  function click(x, y) { if (!sel) { sel = { x, y }; Sounds.sfx.select(); } else { [board[sel.y][sel.x], board[y][x]] = [board[y][x], board[sel.y][sel.x]]; sel = null; moves++; Sounds.sfx.move(); let ok = true; let n = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] !== n++) ok = false; if (ok) Sounds.sfx.win(); updateHUD(); draw(); } }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 83. 拼字 LETTERS
// ============================================================
Games.define('letters', {
  name: '拼字游戏',
  desc: '用字母拼出目标单词',
  icon: '🔤',
  cat: 'puzzle',
  controls: '点击字母拼写'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  const WORDS = ['CODE', 'GAME', 'PIXEL', 'ARCADE', 'FUN', 'WIN', 'JUMP', 'STAR'];
  let target, guess, score, loop;
  function reset() { target = WORDS[Math.floor(Math.random() * WORDS.length)]; guess = ''; score = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    ctx.fillStyle = '#00ffff'; ctx.font = '36px VT323'; ctx.textAlign = 'center';
    ctx.fillText(target, W/2, 80);
    ctx.fillText(guess, W/2, 140);
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { ctx.fillStyle = '#ff0066'; ctx.fillRect(20 + (i % 7) * 47, 200 + Math.floor(i / 7) * 35, 40, 30); ctx.fillStyle = '#fff'; ctx.font = '18px VT323'; ctx.fillText(c, 40 + (i % 7) * 47, 222 + Math.floor(i / 7) * 35); });
    ctx.fillStyle = '#00ff00'; ctx.fillRect(20, 320, 150, 30); ctx.fillStyle = '#000'; ctx.font = '18px VT323'; ctx.fillText('SUBMIT', 95, 342);
    ctx.fillStyle = '#444'; ctx.fillRect(190, 320, 150, 30); ctx.fillStyle = '#fff'; ctx.fillText('CLEAR', 265, 342);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  function click(x, y) {
    if (y < 100) { guess = ''; Sounds.sfx.deny(); }
    else if (y < 165) {}
    else if (y < 320) { const i = Math.floor((x - 20) / 47) + Math.floor((y - 200) / 35) * 7; if (i < 26) guess += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]; Sounds.sfx.click(); }
    else if (y < 350) { if (x < 170) { if (guess === target) { score++; Sounds.sfx.win(); reset(); return; } else { Sounds.sfx.deny(); } } else { guess = ''; } }
    draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 84. 颜色猜谜 COLOR CODE
// ============================================================
Games.define('colorcode', {
  name: '颜色密码',
  desc: '猜出隐藏的颜色密码',
  icon: '🎨',
  cat: 'puzzle',
  controls: '点击底部选色 · 提交看反馈'
}, (stage, hud, status) => {
  const COLORS = ['#ff0066', '#00ffff', '#ffff00', '#00ff66', '#ff8800', '#aa00ff'];
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let secret, guesses, sel, attempts, loop;
  function reset() { secret = []; for (let i = 0; i < 4; i++) secret.push(Math.floor(Math.random() * COLORS.length)); guesses = []; sel = [0, 0, 0, 0]; attempts = 0; updateHUD(); draw(); }
  function feedback(g) { let correct = 0, misp = 0; const sc = [...secret], gc = [...g]; for (let i = 0; i < 4; i++) if (gc[i] === sc[i]) { correct++; sc[i] = -1; gc[i] = -2; } for (let i = 0; i < 4; i++) if (gc[i] >= 0) { const j = sc.indexOf(gc[i]); if (j >= 0) { misp++; sc[j] = -1; } } return { correct, misp }; }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    guesses.forEach((row, ri) => { row.g.forEach((c, ci) => { ctx.fillStyle = COLORS[c]; ctx.fillRect(20 + ci * 50, 20 + ri * 60, 40, 40); }); for (let i = 0; i < row.f.correct; i++) ctx.fillStyle = '#ff0000', ctx.fillRect(220 + i * 8, 30 + ri * 60, 6, 20); for (let i = 0; i < row.f.misp; i++) ctx.fillStyle = '#fff', ctx.fillRect(220 + (row.f.correct + i) * 8, 30 + ri * 60, 6, 20); });
    for (let i = 0; i < 4; i++) { ctx.fillStyle = COLORS[sel[i]]; ctx.fillRect(20 + i * 50, 320, 40, 40); }
    COLORS.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(20 + i * 55, 380, 45, 30); });
    ctx.fillStyle = '#00ff00'; ctx.fillRect(220, 380, 120, 30); ctx.fillStyle = '#000'; ctx.font = '16px VT323'; ctx.textAlign = 'center'; ctx.fillText('SUBMIT', 280, 400);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `ATTEMPTS ${attempts}`; }
  function click(x, y) {
    if (y > 300 && y < 380) { sel[Math.floor((x - 20) / 50)] = (sel[Math.floor((x - 20) / 50)] + 1) % COLORS.length; Sounds.sfx.click(); }
    else if (y > 370 && y < 420) { if (x < 350) { const c = Math.floor(x / 55); if (c < 6) { const slot = Math.floor((x - c * 55) / 50); if (slot < 4) sel[slot] = c; Sounds.sfx.click(); } else if (x > 220) { const f = feedback(sel); guesses.push({ g: [...sel], f }); attempts++; if (f.correct === 4) { Sounds.sfx.win(); reset(); return; } if (guesses.length > 6) reset(); } } }
    draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 85. 四子棋 CONNECT FOUR
// ============================================================
Games.define('connect4', {
  name: '四子棋',
  desc: '经典四子连珠',
  icon: '🟡',
  cat: 'strategy',
  controls: '点击列放入棋子 · 四连成线'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 420, 360);
  const W = 420, H = 360, COLS = 7, ROWS = 6, CELL = 60;
  let board, turn, hover, win, loop;
  function reset() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); turn = 1; hover = 3; win = null; updateHUD(); draw(); }
  function drop(c) { if (win) return; for (let r = ROWS - 1; r >= 0; r--) if (!board[r][c]) { board[r][c] = turn; const w = checkWin(r, c); if (w) { win = w; Sounds.sfx.win(); updateHUD(); } else { turn = 3 - turn; Sounds.sfx.drop(); } break; } }
  function checkWin(r, c) { const dirs = [[0,1],[1,0],[1,1],[1,-1]]; for (const [dx,dy] of dirs) { let count = 1; for (let s = 1; s < 4 && r+s*dy < ROWS && c+s*dx < COLS && board[r+s*dy][c+s*dx] === board[r][c]; s++) count++; for (let s = 1; s < 4 && r-s*dy >= 0 && c-s*dx >= 0 && board[r-s*dy][c-s*dx] === board[r][c]; s++) count++; if (count >= 4) return { p: board[r][c] }; } return null; }
  function draw() {
    Games.clear(ctx, W, H, '#001a4d');
    ctx.fillStyle = '#000088'; ctx.fillRect(0, 0, W, ROWS * CELL);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { ctx.fillStyle = board[r][c] === 1 ? '#ff0' : (board[r][c] === 2 ? '#f00' : '#fff'); ctx.beginPath(); ctx.arc(c * CELL + CELL/2, r * CELL + CELL/2, CELL/2 - 4, 0, Math.PI*2); ctx.fill(); }
    if (!win) { ctx.fillStyle = turn === 1 ? '#ff0' : '#f00'; ctx.beginPath(); ctx.arc(hover * CELL + CELL/2, -20, CELL/2 - 4, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = win ? `WINNER: ${win.p === 1 ? 'YELLOW' : 'RED'}` : `TURN: ${turn === 1 ? 'YELLOW' : 'RED'}`; }
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); hover = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); draw(); };
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const c = Math.floor((e.clientX - r.left) * (W/r.width) / CELL); if (c >= 0 && c < COLS) drop(c); draw(); };
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('mousemove', onMove);
  reset();
  return () => { canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('mousemove', onMove); };
});

// ============================================================
// 86. 点格 DOTS AND BOXES
// ============================================================
Games.define('dotsboxes', {
  name: '点格游戏',
  desc: '画线围出小方块',
  icon: '⬛',
  cat: 'strategy',
  controls: '点击两点之间画线'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 5, CELL = 60;
  let hLines, vLines, boxes, turn, scores;
  function reset() { hLines = Array.from({ length: N + 1 }, () => Array(N).fill(0)); vLines = Array.from({ length: N }, () => Array(N + 1).fill(0)); boxes = Array.from({ length: N }, () => Array(N).fill(0)); turn = 1; scores = [0, 0]; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) if (hLines[y][x]) { ctx.fillStyle = boxes[Math.max(0,y-1)][x] ? `hsl(${boxes[Math.max(0,y-1)][x] === 1 ? 60 : 0}, 80%, 50%)` : '#fff'; ctx.fillRect(x * CELL + 20, y * CELL + 10, CELL - 40, 4); }
    for (let y = 0; y < N; y++) for (let x = 0; x <= N; x++) if (vLines[y][x]) { ctx.fillStyle = '#fff'; ctx.fillRect(x * CELL + 10, y * CELL + 20, 4, CELL - 40); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (boxes[y][x]) { ctx.fillStyle = boxes[y][x] === 1 ? 'rgba(255,255,0,0.3)' : 'rgba(255,0,0,0.3)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(x * CELL, y * CELL, 5, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `YELLOW ${scores[0]} | RED ${scores[1]}`; }
  function click(x, y) {
    const px = x * CELL, py = y * CELL;
    let placed = false;
    for (let yy = 0; yy <= N && !placed; yy++) for (let xx = 0; xx < N && !placed; xx++) { if (!hLines[yy][xx] && px + 20 > xx * CELL && px + 20 < xx * CELL + CELL && py + 10 > yy * CELL && py + 10 < yy * CELL + 4) { hLines[yy][xx] = turn; placed = true; } }
    for (let yy = 0; yy < N && !placed; yy++) for (let xx = 0; xx <= N && !placed; xx++) { if (!vLines[yy][xx] && px + 10 > xx * CELL && px + 10 < xx * CELL + 4 && py + 20 > yy * CELL && py + 20 < yy * CELL + CELL) { vLines[yy][xx] = turn; placed = true; } }
    if (!placed) return;
    let boxed = false; for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { if (!boxes[yy][xx] && hLines[yy][xx] && hLines[yy+1][xx] && vLines[yy][xx] && vLines[yy][xx+1]) { boxes[yy][xx] = turn; scores[turn - 1]++; boxed = true; } }
    if (!boxed) turn = 3 - turn; Sounds.sfx.beep();
    updateHUD(); draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click((e.clientX - r.left) * (W/r.width) / CELL, (e.clientY - r.top) * (H/r.height) / CELL); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 87. 围棋 GO 9x9
// ============================================================
Games.define('go', {
  name: '围棋',
  desc: '9x9 围棋入门',
  icon: '⚫',
  cat: 'strategy',
  controls: '点击落子 · 围住对方领地'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 9, CELL = 40;
  let board, turn, captures, loop;
  function reset() { board = Array.from({ length: N }, () => Array(N).fill(0)); turn = 1; captures = [0, 0]; updateHUD(); draw(); }
  function neighbors(x, y) { return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([nx,ny]) => nx >= 0 && nx < N && ny >= 0 && ny < N); }
  function group(x, y) { const c = board[y][x], v = Array.from({ length: N }, () => Array(N).fill(false)); const q = [[x, y]]; const g = []; while (q.length) { const [cx, cy] = q.pop(); if (v[cy][cx] || board[cy][cx] !== c) continue; v[cy][cx] = true; g.push([cx, cy]); neighbors(cx, cy).forEach(([nx, ny]) => { if (!v[ny][nx] && board[ny][nx] === c) q.push([nx, ny]); }); } return { c, g, liberties: g.flat().reduce((s, [x, y]) => s + neighbors(x, y).filter(([nx, ny]) => board[ny][nx] === 0).length, 0) }; }
  function play(x, y) { if (board[y][x]) return; board[y][x] = turn; let captured = []; const opp = 3 - turn; for (const [nx, ny] of neighbors(x, y)) { if (board[ny][nx] === opp) { const grp = group(nx, ny); if (grp.liberties === 0) captured.push(...grp.g); } } captured.forEach(([cx, cy]) => { board[cy][cx] = 0; captures[turn - 1]++; }); if (group(x, y).liberties === 0) { board[y][x] = 0; return; } turn = opp; Sounds.sfx.place(); updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#aa6633');
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.moveTo(CELL/2, i * CELL + CELL/2); ctx.lineTo((N - 1) * CELL + CELL/2, i * CELL + CELL/2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * CELL + CELL/2, CELL/2); ctx.lineTo(i * CELL + CELL/2, (N - 1) * CELL + CELL/2); ctx.stroke(); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) { ctx.fillStyle = board[y][x] === 1 ? '#000' : '#fff'; ctx.beginPath(); ctx.arc(x * CELL + CELL/2, y * CELL + CELL/2, 14, 0, Math.PI*2); ctx.fill(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `BLACK ${captures[0]} | WHITE ${captures[1]} | TURN: ${turn === 1 ? 'BLACK' : 'WHITE'}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); play(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 88. 战舰 BATTLESHIP
// ============================================================
Games.define('battleship', {
  name: '战舰',
  desc: '寻找并击沉敌方战舰',
  icon: '🚢',
  cat: 'strategy',
  controls: '点击格射击 · 击沉所有船'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 8, CELL = 45;
  let board, ships, hits, score;
  function reset() { board = Array.from({ length: N }, () => Array(N).fill(0)); ships = []; const sizes = [3, 2, 1]; sizes.forEach((sz, idx) => { let placed = false; for (let tries = 0; tries < 50 && !placed; tries++) { const horiz = Math.random() < 0.5; const x = Math.floor(Math.random() * (N - (horiz ? sz : 0))); const y = Math.floor(Math.random() * (N - (horiz ? 0 : sz))); let ok = true; for (let i = 0; i < sz; i++) { const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i); if (board[cy][cx]) { ok = false; break; } if (cy > 0 && cx > 0 && board[cy-1][cx-1]) ok = false; } if (ok) { for (let i = 0; i < sz; i++) { const cx = x + (horiz ? i : 0), cy = y + (horiz ? 0 : i); board[cy][cx] = idx + 1; ships.push({ x: cx, y: cy }); } placed = true; } } }); hits = Array.from({ length: N }, () => Array(N).fill(0)); score = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a4d');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = '#000033'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); if (hits[y][x]) { ctx.fillStyle = hits[y][x] === 1 ? '#ff0' : '#888'; ctx.beginPath(); ctx.arc(x * CELL + CELL/2, y * CELL + CELL/2, 8, 0, Math.PI*2); ctx.fill(); } }
    ctx.strokeStyle = '#00ffff'; ctx.strokeRect(0, 0, W, H);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `HITS ${score} | ${ships.length - score} LEFT`; }
  function click(x, y) { if (hits[y][x]) return; if (board[y][x]) { hits[y][x] = 1; score++; Sounds.sfx.hit(); if (score === ships.length) Sounds.sfx.win(); } else { hits[y][x] = 2; Sounds.sfx.splash(); } updateHUD(); draw(); }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL), Math.floor((e.clientY - r.top) * (H/r.height) / CELL)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 89. 骰子双雄 DICE DUEL
// ============================================================
Games.define('dice', {
  name: '骰子双雄',
  desc: '比大小赢回合',
  icon: '🎲',
  cat: 'strategy',
  controls: '点击掷骰'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let you, cpu, score, turn, loop;
  function roll() { return 1 + Math.floor(Math.random() * 6); }
  function reset() { you = 0; cpu = 0; score = [0, 0]; turn = 0; updateHUD(); draw(); }
  function play() { const a = roll(), b = roll(); if (a > b) score[0]++; else if (b > a) score[1]++; turn++; Sounds.sfx.roll(); if (turn >= 5) { Sounds.sfx.win(); } updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    ctx.fillStyle = '#ff0066'; ctx.font = '40px VT323'; ctx.textAlign = 'center'; ctx.fillText('YOU', W/2, 80);
    ctx.fillText('CPU', W/2, 280);
    ctx.fillStyle = '#fff'; ctx.fillRect(120, 100, 120, 80); ctx.fillRect(120, 220, 120, 80);
    ctx.fillStyle = '#000'; ctx.font = '60px VT323'; ctx.fillText('?', 180, 165); ctx.fillText('?', 180, 285);
    ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.fillText(`${score[0]} - ${score[1]}`, W/2, 340);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `YOU ${score[0]} | CPU ${score[1]} | ROUND ${turn + 1}/5`; }
  const onClick = () => play();
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 90. 跳棋 (already done in checkers variant) - Add Hex
// ============================================================
Games.define('hex', {
  name: '六角棋',
  desc: '六角棋盘上连边',
  icon: '⬡',
  cat: 'strategy',
  controls: '点击六角格落子'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400, N = 7, R = 25;
  let board, turn, win, loop;
  function reset() { board = Array.from({ length: N }, () => Array(N).fill(0)); turn = 1; win = null; updateHUD(); draw(); }
  function hexToXY(x, y) { return { x: W/2 + (x - y) * R * Math.sqrt(3) / 2, y: H/2 + (x + y) * R * 3/4 }; }
  function neighbors(x, y, p) { const ns = []; if (p === 1) { if (x === 0) ns.push([N - 1, y]); if (x === N - 1) ns.push([0, y]); if (y === 0) ns.push([x, N - 1]); if (y === N - 1) ns.push([x, 0]); } ns.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y - 1], [x + 1, y + 1]); return ns.filter(([nx, ny]) => nx >= 0 && nx < N && ny >= 0 && ny < N); }
  function checkWin(p) { const v = Array.from({ length: N }, () => Array(N).fill(false)); for (let i = 0; i < N; i++) (p === 1 ? [[i, 0]] : [[0, i]]).forEach(([x, y]) => { if (!v[y][x] && board[y][x] === p) { const q = [[x, y]]; while (q.length) { const [cx, cy] = q.pop(); if (v[cy][cx]) continue; v[cy][cx] = true; if (p === 1 && cy === N - 1) return true; if (p === 2 && cx === N - 1) return true; neighbors(cx, cy, p).forEach(([nx, ny]) => { if (!v[ny][nx] && board[ny][nx] === p) q.push([nx, ny]); }); } } }); return false; }
  function play(x, y) { if (board[y][x] || win) return; board[y][x] = turn; if (checkWin(turn)) { win = turn; Sounds.sfx.win(); } else { turn = 3 - turn; Sounds.sfx.place(); } updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const { x: px, y: py } = hexToXY(x, y); ctx.fillStyle = board[y][x] === 1 ? '#ff0' : (board[y][x] === 2 ? '#f00' : '#444'); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; if (i === 0) ctx.moveTo(px + R * Math.cos(a), py + R * Math.sin(a)); else ctx.lineTo(px + R * Math.cos(a), py + R * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = win ? `WINNER: ${win === 1 ? 'YELLOW' : 'RED'}` : `TURN: ${turn === 1 ? 'YELLOW' : 'RED'}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const mx = (e.clientX - r.left) * (W/r.width), my = (e.clientY - r.top) * (H/r.height); let best = null, bd = 100; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const { x: px, y: py } = hexToXY(x, y); const d = Math.sqrt((px - mx) ** 2 + (py - my) ** 2); if (d < bd && d < R) { bd = d; best = [x, y]; } } if (best) play(best[0], best[1]); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 91. 曼卡拉 MANCALA
// ============================================================
Games.define('mancala', {
  name: '曼卡拉',
  desc: '播撒种子到对方基地',
  icon: '🌰',
  cat: 'strategy',
  controls: '点击己方坑播撒'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 480, 240);
  const W = 480, H = 240, PITS = 6;
  let pits, turn, score;
  function reset() { pits = [4,4,4,4,4,4,0,4,4,4,4,4,4,0]; turn = 0; score = [0, 0]; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#552200' : '#884400'; ctx.fillRect(40 + i * 60, 30, 50, 70); ctx.fillStyle = '#fff'; ctx.font = '24px VT323'; ctx.textAlign = 'center'; ctx.fillText(pits[6 - i], 65 + i * 60, 65); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#552200' : '#884400'; ctx.fillRect(40 + i * 60, 140, 50, 70); ctx.fillStyle = '#fff'; ctx.font = '24px VT323'; ctx.textAlign = 'center'; ctx.fillText(pits[7 + i], 65 + i * 60, 175); }
    ctx.fillStyle = '#000088'; ctx.fillRect(400, 30, 60, 180); ctx.fillStyle = '#fff'; ctx.fillText(pits[13], 430, 110); ctx.fillRect(20, 30, 60, 180); ctx.fillStyle = '#fff'; ctx.fillText(pits[6], 50, 110);
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `TURN: ${turn === 0 ? 'TOP' : 'BOTTOM'}`; }
  function click(i) {
    if (turn === 0 && i < 6) {} else if (turn === 1 && i >= 7 && i <= 12) {} else return;
    const start = i, n = pits[i]; pits[i] = 0; let pos = start;
    for (let k = 0; k < n; k++) { pos = (pos + 1) % 14; if (turn === 0 && pos === 13) pos = 0; if (turn === 1 && pos === 6) pos = 7; pits[pos]++; }
    Sounds.sfx.place(); if (pits[start] === 0) {} turn = 1 - turn; updateHUD(); draw();
  }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width); if (x > 40 && x < 400) { const i = Math.floor((x - 40) / 60); if (i >= 0 && i < 6) click(turn === 0 ? 5 - i : 7 + i); } };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 92. 骰子博弈 NIM
// ============================================================
Games.define('nim', {
  name: '博弈游戏',
  desc: '取走最后一颗石子者输',
  icon: '🪨',
  cat: 'strategy',
  controls: '点击堆取石子 · 1-3 颗'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let piles, turn;
  function reset() { piles = [3, 5, 7]; turn = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#0a0014');
    piles.forEach((p, i) => { ctx.fillStyle = '#ff0066'; ctx.fillRect(30 + i * 110, 280 - p * 20, 80, p * 20); ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText(p, 70 + i * 110, 300 - p * 20); });
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `TURN: ${turn === 0 ? 'YOU' : 'CPU'}`; }
  function take(i, n) { if (turn !== 0) return; piles[i] -= n; turn = 1; Sounds.sfx.move(); updateHUD(); draw(); setTimeout(() => { if (piles.every(p => p === 0)) { Sounds.sfx.lose(); reset(); return; } let i = piles.findIndex(p => p > 0); const n = Math.min(piles[i], Math.floor(Math.random() * 3) + 1); piles[i] -= n; turn = 0; Sounds.sfx.move(); updateHUD(); draw(); if (piles.every(p => p === 0)) { Sounds.sfx.win(); reset(); } }, 500); }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width); if (x > 30 && x < 360) { const i = Math.floor((x - 30) / 110); if (i >= 0 && i < 3) take(i, 1); } };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 93. 扑克记忆 PAIRS MEMORY
// ============================================================
Games.define('memory2', {
  name: '记忆配对',
  desc: '翻开两张相同卡',
  icon: '🎴',
  cat: 'strategy',
  controls: '点击翻牌 · 限时 60 秒'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360, N = 4, CELL = 80;
  let cards, flipped, matched, score, time, busy, loop;
  function reset() { cards = []; for (let i = 0; i < (N * N) / 2; i++) { cards.push(i); cards.push(i); } for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } flipped = []; matched = new Set(); score = 0; time = 60; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    for (let i = 0; i < N * N; i++) { const x = i % N, y = Math.floor(i / N); if (matched.has(i) || flipped.includes(i)) { ctx.fillStyle = '#00ff00'; ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8); ctx.fillStyle = '#000'; ctx.font = '32px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['♠','♥','♦','♣','★','☆','●','○'][cards[i]], x * CELL + CELL/2, y * CELL + CELL/2); } else { ctx.fillStyle = '#ff0066'; ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8); ctx.fillStyle = '#fff'; ctx.font = '24px VT323'; ctx.fillText('?', x * CELL + CELL/2, y * CELL + CELL/2); } }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `PAIRS ${score}/8 | ${Math.ceil(time)}s`; }
  function update() { if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } updateHUD(); } if (flipped.length === 2) { const [a, b] = flipped; if (cards[a] === cards[b]) { matched.add(a); matched.add(b); score++; Sounds.sfx.win(); } else Sounds.sfx.deny(); flipped = []; setTimeout(draw, 500); } }
  function click(i) { if (busy || matched.has(i) || flipped.includes(i) || flipped.length >= 2) return; flipped.push(i); Sounds.sfx.flip(); draw(); if (flipped.length === 2) busy = true; setTimeout(() => { busy = false; }, 500); }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click(Math.floor((e.clientX - r.left) * (W/r.width) / CELL) + Math.floor((e.clientY - r.top) * (H/r.height) / CELL) * N); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 94. 点数 GAME 24 (different from make24)
// ============================================================
Games.define('dots', {
  name: '点连线',
  desc: '用一笔画连接所有点',
  icon: '🟢',
  cat: 'strategy',
  controls: '点击点开始 · 拖动连接'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let points, path, done;
  function reset() { points = []; for (let i = 0; i < 5; i++) points.push({ x: 60 + Math.random() * 240, y: 60 + Math.random() * 240 }); path = []; done = false; updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a002a'); for (let i = 0; i < path.length - 1; i++) { ctx.strokeStyle = done ? '#00ff00' : '#ff00ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(path[i].x, path[i].y); ctx.lineTo(path[i+1].x, path[i+1].y); ctx.stroke(); } points.forEach(p => { ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill(); }); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = done ? 'COMPLETE' : 'CONNECT ALL'; }
  let drag = null;
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); for (const p of points) if (Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12) { drag = p; if (!path.length || path[path.length - 1] !== p) path.push(p); break; } draw(); };
  const onMove = (e) => { if (!drag) return; const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); for (const p of points) if (p !== drag && Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 12 && path[path.length - 1] !== p) { path.push(p); drag = p; if (path.length === points.length && !done) { done = true; Sounds.sfx.win(); } break; } draw(); };
  const onUp = () => { drag = null; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  reset();
  return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 95. 高尔夫 GOLF MINI
// ============================================================
Games.define('golf', {
  name: '高尔夫',
  desc: '把球推进洞',
  icon: '⛳',
  cat: 'strategy',
  controls: '点击拖动设置力度方向'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 480);
  const W = 400, H = 480;
  let ball, hole, walls, shots, drag, dragging, loop;
  function reset() { ball = { x: 30, y: 240 }; hole = { x: 370, y: 240, r: 12 }; walls = [{ x: 100, y: 100, w: 200, h: 8 }, { x: 100, y: 380, w: 200, h: 8 }]; shots = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#88cc44');
    ctx.fillStyle = '#666'; walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI*2); ctx.fill();
    if (dragging) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x - (drag.x - ball.x), ball.y - (drag.y - ball.y)); ctx.stroke(); }
  }
  function update() {
    if (!dragging && (ball.vx || ball.vy)) { ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.95; ball.vy *= 0.95; if (Math.abs(ball.vx) < 0.1) ball.vx = 0; if (Math.abs(ball.vy) < 0.1) ball.vy = 0; walls.forEach(w => { if (ball.x + 6 > w.x && ball.x - 6 < w.x + w.w && ball.y + 6 > w.y && ball.y - 6 < w.y + w.h) { Sounds.sfx.hit(); ball.vx = 0; ball.vy = 0; } }); if (Math.abs(ball.x - hole.x) < 10 && Math.abs(ball.y - hole.y) < 10) { Sounds.sfx.win(); reset(); } updateHUD(); draw(); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SHOTS ${shots}`; }
  const onDown = (e) => { const r = canvas.getBoundingClientRect(); drag = { x: (e.clientX - r.left) * (W/r.width), y: (e.clientY - r.top) * (H/r.height) }; dragging = true; draw(); };
  const onMove = (e) => { if (!dragging) return; const r = canvas.getBoundingClientRect(); drag = { x: (e.clientX - r.left) * (W/r.width), y: (e.clientY - r.top) * (H/r.height) }; draw(); };
  const onUp = () => { if (!dragging) return; ball.vx = (ball.x - drag.x) / 10; ball.vy = (ball.y - drag.y) / 10; dragging = false; drag = null; shots++; Sounds.sfx.hit(); draw(); };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onUp);
  reset();
  loop = Games.tickLoop(update, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 96. 西蒙说 SIMON SAYS
// ============================================================
Games.define('simon', {
  name: '西蒙说',
  desc: '记忆颜色顺序并重复',
  icon: '🎵',
  cat: 'casual',
  controls: '按顺序点击闪过的颜色'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400;
  const COLORS = ['#ff0066', '#00ff66', '#0066ff', '#ffff00'];
  let seq, idx, lit, score, state, loop, litT;
  function reset() { seq = []; for (let i = 0; i < 3; i++) seq.push(Math.floor(Math.random() * 4)); idx = 0; lit = -1; score = 0; state = 'play'; updateHUD(); draw(); nextStep(); }
  function nextStep() { idx = 0; state = 'show'; let i = 0; const show = () => { if (i < seq.length) { lit = seq[i]; draw(); Sounds.sfx.blip(); setTimeout(() => { lit = -1; draw(); i++; setTimeout(show, 200); }, 400); } else { state = 'input'; } }; show(); }
  function click(c) { if (state !== 'input') return; lit = c; draw(); setTimeout(() => { lit = -1; draw(); if (c === seq[idx]) { idx++; Sounds.sfx.blip(); if (idx === seq.length) { score++; seq.push(Math.floor(Math.random() * 4)); setTimeout(() => nextStep(), 800); } } else { Sounds.sfx.gameover(); reset(); } }, 200); }
  function draw() { Games.clear(ctx, W, H, '#000'); COLORS.forEach((c, i) => { ctx.fillStyle = lit === i ? c : '#333'; ctx.fillRect((i % 2) * 200, Math.floor(i / 2) * 200, 200, 200); }); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `LEVEL ${score + 1}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); click(Math.floor(x / 200) + Math.floor(y / 200) * 2); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 97. 点击 CLICKER
// ============================================================
Games.define('clicker', {
  name: '点击狂',
  desc: '60 秒能点多少下',
  icon: '🖱️',
  cat: 'casual',
  controls: '快速点击按钮'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let count, time, loop;
  function reset() { count = 0; time = 60; updateHUD(); draw(); }
  function update() { if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } updateHUD(); } }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); ctx.fillStyle = '#ff0066'; ctx.fillRect(80, 200, 200, 100); ctx.fillStyle = '#fff'; ctx.font = '40px VT323'; ctx.textAlign = 'center'; ctx.fillText('CLICK!', 180, 260); ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.fillText(`${count}`, 180, 100); ctx.fillText(`${Math.ceil(time)}s`, 180, 150); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `CLICKS ${count} | ${Math.ceil(time)}s`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const y = (e.clientY - r.top) * (H/r.height); if (y > 200 && y < 300) { count++; Sounds.sfx.click(); draw(); } };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 98. 老虎机 SLOT
// ============================================================
Games.define('slot', {
  name: '老虎机',
  desc: '转出相同符号赢分',
  icon: '🎰',
  cat: 'casual',
  controls: '点击/空格拉杆'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 320);
  const W = 360, H = 320;
  const SYMS = ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣'];
  let reels, score, spinning, loop;
  function reset() { reels = [0, 0, 0]; score = 100; spinning = false; updateHUD(); draw(); }
  function spin() { if (spinning) return; spinning = true; let t = 0; const stop = Games.tickLoop(() => { reels = reels.map(() => Math.floor(Math.random() * SYMS.length)); draw(); t++; if (t > 20) { stop(); spinning = false; check(); } }, 80); Sounds.sfx.swoosh(); }
  function check() { if (reels[0] === reels[1] && reels[1] === reels[2]) { score += 100; Sounds.sfx.win(); } else { score -= 5; Sounds.sfx.deny(); } updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3; ctx.strokeRect(40 + i * 100, 80, 80, 100); ctx.fillStyle = '#fff'; ctx.font = '60px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(SYMS[reels[i]], 80 + i * 100, 130); } ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left'; ctx.fillText(`$${score}`, 10, 30); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `$${score}`; }
  const onClick = () => spin();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => spin() });
  reset();
  window.addEventListener('keydown', handler);
  return () => { canvas.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 99. 猜拳 ROCK PAPER SCISSORS
// ============================================================
Games.define('rps', {
  name: '猜拳',
  desc: '石头剪刀布三局两胜',
  icon: '✂️',
  cat: 'casual',
  controls: '点击石头/剪刀/布'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let you, cpu, wins, round, loop;
  function reset() { you = 0; cpu = 0; wins = [0, 0]; round = 0; updateHUD(); draw(); }
  function play(c) { const r = Math.floor(Math.random() * 3); const result = (c - r + 3) % 3; if (result === 0) { Sounds.sfx.beep(); } else if (result === 1) { wins[0]++; Sounds.sfx.win(); } else { wins[1]++; Sounds.sfx.lose(); } you = c; cpu = r; round++; updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); ctx.fillStyle = '#ff0066'; ctx.fillRect(20, 100, 90, 100); ctx.fillRect(140, 100, 90, 100); ctx.fillRect(260, 100, 80, 100); ctx.fillStyle = '#fff'; ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✊', 65, 150); ctx.fillText('✌', 185, 150); ctx.fillText('✋', 300, 150); ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.fillText(`YOU ${wins[0]} - ${wins[1]} CPU`, W/2, 240); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `YOU ${wins[0]} - ${wins[1]} CPU`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width); if (x < 110) play(0); else if (x < 230) play(1); else play(2); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 100. 硬币抛 COIN FLIP
// ============================================================
Games.define('coinflip', {
  name: '硬币抛',
  desc: '猜正反 · 连胜加分',
  icon: '🪙',
  cat: 'casual',
  controls: '点击正面/反面'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let streak, last;
  function reset() { streak = 0; last = '?'; updateHUD(); draw(); }
  function play(g) { const r = Math.random() < 0.5 ? 'H' : 'T'; if (g === r) { streak++; Sounds.sfx.blip(); } else { streak = 0; Sounds.sfx.deny(); } last = r; updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(W/2, 140, 50, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = '40px VT323'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(last === '?' ? '?' : last, W/2, 140); ctx.fillStyle = '#ff0066'; ctx.fillRect(50, 250, 110, 80); ctx.fillRect(200, 250, 110, 80); ctx.fillStyle = '#fff'; ctx.font = '20px VT323'; ctx.fillText('HEADS', 105, 290); ctx.fillText('TAILS', 255, 290); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `STREAK ${streak}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width); play(x < W/2 ? 'H' : 'T'); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 101. 21 点 BLACKJACK
// ============================================================
Games.define('blackjack', {
  name: '21 点',
  desc: '比大小不超过 21',
  icon: '🃏',
  cat: 'casual',
  controls: '点击要牌/停牌'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  function draw(c) { return `${['♠','♥','♦','♣'][Math.floor(c / 13)]}${['A','2','3','4','5','6','7','8','9','10','J','Q','K'][c % 13]}`; }
  function val(hand) { let v = 0, a = 0; hand.forEach(c => { const r = c % 13; if (r === 0) { a++; v += 11; } else if (r < 10) v += r + 1; else v += 10; }); while (v > 21 && a) { v -= 10; a--; } return v; }
  let deck, player, dealer, state, loop;
  function deal() { deck = Array.from({ length: 52 }, (_, i) => i); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } player = [deck.pop(), deck.pop()]; dealer = [deck.pop(), deck.pop()]; state = 'play'; updateHUD(); draw(); }
  function hit() { if (state !== 'play') return; player.push(deck.pop()); if (val(player) > 21) { state = 'lose'; Sounds.sfx.lose(); } else Sounds.sfx.move(); updateHUD(); draw(); }
  function stand() { while (val(dealer) < 17) dealer.push(deck.pop()); const pv = val(player), dv = val(dealer); if (pv > 21) state = 'lose'; else if (dv > 21 || pv > dv) { state = 'win'; Sounds.sfx.win(); } else if (pv === dv) state = 'push'; else { state = 'lose'; Sounds.sfx.lose(); } updateHUD(); draw(); }
  function drawScene() { Games.clear(ctx, W, H, '#006400'); ctx.fillStyle = '#fff'; ctx.font = '16px VT323'; ctx.textAlign = 'left'; ctx.fillText('DEALER', 10, 30); dealer.forEach((c, i) => { ctx.fillStyle = '#fff'; ctx.fillRect(20 + i * 60, 40, 50, 70); ctx.fillStyle = '#000'; ctx.fillText(draw(c), 45 + i * 60, 80); }); ctx.fillText('PLAYER', 10, 200); player.forEach((c, i) => { ctx.fillStyle = '#fff'; ctx.fillRect(20 + i * 60, 210, 50, 70); ctx.fillStyle = '#000'; ctx.fillText(draw(c), 45 + i * 60, 250); }); ctx.fillStyle = '#ff0066'; ctx.fillRect(20, 320, 100, 60); ctx.fillStyle = '#0000ff'; ctx.fillRect(140, 320, 100, 60); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '20px VT323'; ctx.fillText('HIT', 70, 355); ctx.fillText('STAND', 190, 355); ctx.fillStyle = '#ffff00'; ctx.font = '24px VT323'; ctx.fillText(state.toUpperCase(), W/2, 420); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `PLAYER ${val(player)} | DEALER ${dealer.length > 1 ? '?' : val(dealer)}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); if (y > 320 && y < 380) { if (x < 120) hit(); else if (x < 240) stand(); } };
  canvas.addEventListener('mousedown', onClick);
  deal();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 102. 飞镖 DART
// ============================================================
Games.define('dart', {
  name: '飞镖',
  desc: '投掷飞镖命中靶心',
  icon: '🎯',
  cat: 'casual',
  controls: '点击/触屏投掷 · 越中心分越高'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400, CX = 200, CY = 200;
  let score, shots, loop;
  function reset() { score = 0; shots = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#001a00');
    for (let r = 100; r > 0; r -= 20) { ctx.fillStyle = r % 40 === 0 ? '#ff0066' : '#000'; ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(CX, CY, 20, 0, Math.PI*2); ctx.fill();
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | ${shots}/10`; }
  function throw_(x, y) { const d = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2); let pts; if (d < 20) pts = 100; else if (d < 40) pts = 50; else if (d < 60) pts = 30; else if (d < 80) pts = 20; else if (d < 100) pts = 10; else pts = 0; score += pts; shots++; Sounds.sfx.hit(); updateHUD(); draw(); }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); if (shots >= 10) { reset(); return; } throw_((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 103. 射箭 ARCHERY
// ============================================================
Games.define('archery', {
  name: '射箭',
  desc: '点击时机蓄力射箭',
  icon: '🏹',
  cat: 'casual',
  controls: '点击蓄力 · 松开射箭'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400, CX = 320, CY = 200;
  let power, dir, holding, arrows, hits, loop;
  function reset() { power = 0; dir = -1; holding = false; arrows = []; hits = 0; updateHUD(); draw(); }
  function draw() {
    Games.clear(ctx, W, H, '#87ceeb');
    ctx.fillStyle = '#88cc44'; ctx.fillRect(0, 300, W, 100);
    for (let r = 80; r > 0; r -= 20) { ctx.fillStyle = r % 40 === 0 ? '#ff0066' : '#000'; ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(CX, CY, 20, 0, Math.PI*2); ctx.fill();
    arrows.forEach(a => { ctx.fillStyle = '#884400'; ctx.fillRect(a.x - 8, a.y, 16, 2); });
    if (holding) { ctx.fillStyle = '#fff'; ctx.fillRect(50, 200, 50, power * 1.5); }
  }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `HITS ${hits}/10`; }
  function shoot() { if (power < 10) return; arrows.push({ x: 50, y: 210, vx: 8, vy: -power / 5 + 1 }); Sounds.sfx.shoot(); power = 0; holding = false; }
  function update() { arrows.forEach(a => { a.x += a.vx; a.y += a.vy; a.vy += 0.1; if (Math.abs(a.x - CX) < 80 && Math.abs(a.y - CY) < 80) { const d = Math.sqrt((a.x - CX) ** 2 + (a.y - CY) ** 2); if (d < 20) hits += 3; else if (d < 40) hits += 2; else hits++; Sounds.sfx.hit(); a.x = -100; } if (a.x > W) a.x = -100; }); updateHUD(); draw(); }
  const onDown = (e) => { if (e.clientX < 100 && e.clientY > 150 && e.clientY < 300) { holding = true; power = 0; } };
  const onUp = () => { if (holding) shoot(); };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mouseup', onUp);
  reset();
  loop = Games.tickLoop(() => { if (holding && power < 100) power += 2; update(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mouseup', onUp); };
});

// ============================================================
// 104. 保龄 BOWLING
// ============================================================
Games.define('bowling', {
  name: '保龄球',
  desc: '点击时机投球',
  icon: '🎳',
  cat: 'casual',
  controls: '点击/空格 投球 · 时机要准'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let ball, pins, score, frame, frames, power, loop;
  function reset() { ball = null; pins = Array.from({ length: 10 }, (_, i) => ({ x: 130 + (i % 3) * 30 + Math.floor(i / 3) * 10, y: 80 + Math.floor(i / 3) * 30, alive: true })); score = 0; frame = 0; frames = []; power = 0; updateHUD(); draw(); }
  function throwBall() { if (ball) return; ball = { x: 180, y: 440, vx: 0, vy: -12, alive: true }; Sounds.sfx.drop(); }
  function update() { if (ball) { ball.y += ball.vy; ball.x += ball.vx; if (ball.y < 100) ball.vy = 0; pins.forEach(p => { if (p.alive && Math.abs(ball.x - p.x) < 20 && Math.abs(ball.y - p.y) < 20) { p.alive = false; ball.x = p.x; ball.alive = false; } }); if (ball.y < 0 || !ball.alive) { const r = pins.filter(p => !p.alive).length; score += r; Sounds.sfx.hit(); frame++; if (frame >= 2) { frames = []; pins.forEach(p => p.alive = true); frame = 0; } ball = null; updateHUD(); } } draw(); }
  function draw() { Games.clear(ctx, W, H, '#1a0033'); ctx.fillStyle = '#0066ff'; ctx.fillRect(150, 400, 60, 80); ctx.fillStyle = '#fff'; pins.forEach(p => { if (p.alive) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill(); } }); if (ball) { ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, Math.PI*2); ctx.fill(); } ctx.fillStyle = '#00ffff'; ctx.font = '20px VT323'; ctx.textAlign = 'left'; ctx.fillText(`SCORE ${score}`, 10, 30); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  const onClick = () => throwBall();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => throwBall() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(update, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 105. 钓鱼 FISHING
// ============================================================
Games.define('fishing', {
  name: '钓鱼',
  desc: '等鱼咬钩后及时提竿',
  icon: '🎣',
  cat: 'casual',
  controls: '点击/空格提竿'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let hook, fishes, score, time, loop;
  function reset() { hook = { y: 50, state: 'wait' }; fishes = []; score = 0; time = 60; for (let i = 0; i < 5; i++) fishes.push({ x: Math.random() * W, y: 300 + Math.random() * 100, alive: true, t: Math.random() * 200 }); updateHUD(); draw(); }
  function update() { if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } updateHUD(); } fishes.forEach(f => { f.t += 0.02; f.x += Math.sin(f.t) * 0.5; }); if (hook.state === 'wait') { if (Math.random() < 0.005) hook.state = 'bite'; } else if (hook.state === 'bite') { if (Math.random() < 0.02) { hook.state = 'gone'; Sounds.sfx.deny(); setTimeout(() => hook.state = 'wait', 1000); } } else if (hook.state === 'pulling') { hook.y -= 4; const f = fishes.find(f => f.alive && Math.abs(f.x - 180) < 20 && Math.abs(f.y - hook.y) < 20); if (f) { f.alive = false; score += 10; Sounds.sfx.win(); hook.state = 'wait'; hook.y = 50; } if (hook.y < 50) hook.state = 'wait'; } }
  function draw() { Games.clear(ctx, W, H, '#001a4d'); ctx.fillStyle = '#0066ff'; ctx.fillRect(0, 250, W, 230); ctx.fillStyle = '#88ccff'; fishes.forEach(f => { if (f.alive) { ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 12, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.moveTo(f.x + 12, f.y); ctx.lineTo(f.x + 18, f.y - 4); ctx.lineTo(f.x + 18, f.y + 4); ctx.closePath(); ctx.fill(); } }); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(180, hook.y); ctx.stroke(); ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(180, hook.y, 4, 0, Math.PI*2); ctx.fill(); if (hook.state === 'bite') { ctx.fillStyle = '#f00'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('!', 180, hook.y - 10); } }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `FISH ${score} | ${Math.ceil(time)}s`; }
  function pull() { if (hook.state === 'bite') { hook.state = 'pulling'; Sounds.sfx.swoosh(); } }
  const onClick = () => pull();
  canvas.addEventListener('mousedown', onClick);
  const handler = Games.key({ ' ': () => pull() });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 106. 鼠标反应 MOUSE TEST
// ============================================================
Games.define('mousetest', {
  name: '鼠标测试',
  desc: '尽可能快地点击圆点',
  icon: '🐭',
  cat: 'casual',
  controls: '点击出现的圆点'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400;
  let targets, score, loop;
  function reset() { targets = []; score = 0; spawn(); updateHUD(); draw(); }
  function spawn() { targets = [{ x: 50 + Math.random() * 300, y: 50 + Math.random() * 300, r: 15, t: 60 }]; }
  function update() { targets.forEach(t => t.t--); targets = targets.filter(t => t.t > 0); if (!targets.length) spawn(); updateHUD(); }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); targets.forEach(t => { ctx.fillStyle = `rgba(255, 0, 102, ${t.t / 60})`; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2); ctx.fill(); }); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `HITS ${score}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); targets = targets.filter(t => { if (Math.abs(t.x - x) < t.r && Math.abs(t.y - y) < t.r) { score++; Sounds.sfx.blip(); return false; } return true; }); if (!targets.length) spawn(); draw(); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(() => { update(); draw(); }, 1000/30);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 107. 颜色记忆 COLOR MEMORY
// ============================================================
Games.define('colormemory', {
  name: '颜色记忆',
  desc: '记住方块序列',
  icon: '🌈',
  cat: 'casual',
  controls: '按顺序点击方块'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400;
  const COLORS = ['#ff0066', '#00ff66', '#0066ff', '#ffff00'];
  let seq, idx, lit, score, state, loop;
  function reset() { seq = []; for (let i = 0; i < 3; i++) seq.push(Math.floor(Math.random() * 4)); idx = 0; lit = -1; score = 0; state = 'show'; updateHUD(); draw(); nextStep(); }
  function nextStep() { idx = 0; let i = 0; const show = () => { if (i < seq.length) { lit = seq[i]; draw(); Sounds.sfx.blip(); setTimeout(() => { lit = -1; draw(); i++; setTimeout(show, 200); }, 400); } else { state = 'input'; } }; show(); }
  function click(c) { if (state !== 'input') return; lit = c; draw(); setTimeout(() => { lit = -1; draw(); if (c === seq[idx]) { idx++; Sounds.sfx.blip(); if (idx === seq.length) { score++; seq.push(Math.floor(Math.random() * 4)); setTimeout(() => nextStep(), 800); } } else { Sounds.sfx.gameover(); reset(); } }, 200); }
  function draw() { Games.clear(ctx, W, H, '#000'); COLORS.forEach((c, i) => { ctx.fillStyle = lit === i ? c : '#222'; ctx.fillRect((i % 2) * 200, Math.floor(i / 2) * 200, 200, 200); }); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `LEVEL ${score + 1}`; }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * (W/r.width), y = (e.clientY - r.top) * (H/r.height); click(Math.floor(x / 200) + Math.floor(y / 200) * 2); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 108. 计时点击 TIMING CLICK
// ============================================================
Games.define('timing', {
  name: '时机点击',
  desc: '指针转一圈 · 时机越准分越高',
  icon: '⏱️',
  cat: 'casual',
  controls: '点击停在绿区'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 400, 400);
  const W = 400, H = 400, CX = 200, CY = 200;
  let angle, score, loop;
  function reset() { angle = 0; score = 0; updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 3 === 0 ? '#ff0066' : '#444'; ctx.fillRect(195, 10, 10, 30); ctx.save(); ctx.translate(CX, CY); ctx.rotate((i / 12) * Math.PI * 2); ctx.fillRect(-5, -180, 10, 30); ctx.restore(); } ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(CX, CY, 100, -Math.PI / 2, -Math.PI / 2 + 0.3); ctx.lineTo(CX, CY); ctx.fill(); ctx.save(); ctx.translate(CX, CY); ctx.rotate(angle); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -180); ctx.stroke(); ctx.restore(); ctx.fillStyle = '#00ffff'; ctx.font = '30px VT323'; ctx.textAlign = 'center'; ctx.fillText(`SCORE ${score}`, CX, 350); }
  function update() { angle += 0.05; draw(); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score}`; }
  function click() { const ta = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); const greenA = -Math.PI / 2; const diff = Math.abs(ta - greenA); if (diff < 0.3) { score += 10; Sounds.sfx.win(); } else { Sounds.sfx.deny(); } updateHUD(); }
  const onClick = () => click();
  canvas.addEventListener('mousedown', onClick);
  reset();
  loop = Games.tickLoop(update, 1000/60);
  return () => { loop(); canvas.removeEventListener('mousedown', onClick); };
});

// ============================================================
// 109. 跳跳棋 JUMP CHECKERS
// ============================================================
Games.define('jumperp', {
  name: '跳跳人',
  desc: '点击跳到对岸',
  icon: '🦘',
  cat: 'casual',
  controls: '点击跳一格'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 200);
  const W = 360, H = 200;
  let frog, target, jumps;
  function reset() { frog = { x: 30, y: 100 }; target = { x: 330, y: 100 }; jumps = 0; updateHUD(); draw(); }
  function draw() { Games.clear(ctx, W, H, '#0a002a'); ctx.fillStyle = '#552200'; ctx.fillRect(0, 80, 20, 40); ctx.fillRect(W - 20, 80, 20, 40); ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(frog.x, frog.y, 12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(target.x, target.y, 10, 0, Math.PI*2); ctx.fill(); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `JUMPS ${jumps}`; }
  function click(x, y) { if (Math.abs(x - frog.x) > 80 || Math.abs(y - frog.y) > 30) { Sounds.sfx.deny(); return; } const dx = x - frog.x, dy = y - frog.y; const d = Math.sqrt(dx * dx + dy * dy); if (d > 30 && d < 80) { frog.x = x; frog.y = y; jumps++; Sounds.sfx.jump(); if (Math.abs(frog.x - target.x) < 30 && Math.abs(frog.y - target.y) < 30) { Sounds.sfx.win(); } updateHUD(); draw(); } }
  const onClick = (e) => { const r = canvas.getBoundingClientRect(); click((e.clientX - r.left) * (W/r.width), (e.clientY - r.top) * (H/r.height)); };
  canvas.addEventListener('mousedown', onClick);
  reset();
  return () => canvas.removeEventListener('mousedown', onClick);
});

// ============================================================
// 110. 数学速度 SPEED MATH
// ============================================================
Games.define('speedmath', {
  name: '速算',
  desc: '60 秒内做多少题',
  icon: '🧠',
  cat: 'casual',
  controls: '输入数字 · 回车提交'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 480);
  const W = 360, H = 480;
  let problem, score, time, input, loop;
  function gen() { const a = Math.floor(Math.random() * 50), b = Math.floor(Math.random() * 50); problem = { q: `${a} + ${b}`, ans: a + b }; input = ''; }
  function reset() { score = 0; time = 60; gen(); updateHUD(); draw(); }
  function update() { if (Math.floor(time) !== Math.floor(time - 1/60)) { time -= 1/60; if (time <= 0) { Sounds.sfx.gameover(); reset(); } updateHUD(); draw(); } }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); ctx.fillStyle = '#00ffff'; ctx.font = '60px VT323'; ctx.textAlign = 'center'; ctx.fillText(problem.q, W/2, 200); ctx.fillText(input, W/2, 280); }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `SCORE ${score} | ${Math.ceil(time)}s`; }
  const handler = Games.key({
    '0': () => input += '0', '1': () => input += '1', '2': () => input += '2', '3': () => input += '3', '4': () => input += '4', '5': () => input += '5', '6': () => input += '6', '7': () => input += '7', '8': () => input += '8', '9': () => input += '9',
    'backspace': () => input = input.slice(0, -1),
    'enter': () => { if (parseInt(input) === problem.ans) { score++; Sounds.sfx.blip(); } else { Sounds.sfx.deny(); } gen(); draw(); }
  });
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(update, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});

// ============================================================
// 111. 记忆数字 NUMBER MEMORY
// ============================================================
Games.define('numbermem', {
  name: '数字记忆',
  desc: '记住显示的数字并复述',
  icon: '🔢',
  cat: 'casual',
  controls: '输入看到的数字'
}, (stage, hud, status) => {
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const ctx = Games.fitCanvas(canvas, 360, 360);
  const W = 360, H = 360;
  let num, level, state, input, t, loop;
  function reset() { level = 1; state = 'show'; num = ''; for (let i = 0; i < level; i++) num += Math.floor(Math.random() * 10); t = level * 1000; updateHUD(); draw(); }
  function update() { if (state === 'show') { t -= 16; if (t <= 0) { state = 'input'; } draw(); } }
  function draw() { Games.clear(ctx, W, H, '#0a0014'); if (state === 'show') { ctx.fillStyle = '#00ffff'; ctx.font = '60px VT323'; ctx.textAlign = 'center'; ctx.fillText(num, W/2, H/2); } else { ctx.fillStyle = '#fff'; ctx.font = '40px VT323'; ctx.fillText(input || '_', W/2, H/2); } }
  function updateHUD() { hud.querySelector('.hud-score').textContent = `LEVEL ${level}`; }
  const handler = Games.key({
    '0': () => { input += '0'; draw(); check(); }, '1': () => { input += '1'; draw(); check(); }, '2': () => { input += '2'; draw(); check(); }, '3': () => { input += '3'; draw(); check(); }, '4': () => { input += '4'; draw(); check(); }, '5': () => { input += '5'; draw(); check(); }, '6': () => { input += '6'; draw(); check(); }, '7': () => { input += '7'; draw(); check(); }, '8': () => { input += '8'; draw(); check(); }, '9': () => { input += '9'; draw(); check(); }, 'backspace': () => { input = input.slice(0, -1); draw(); }
  });
  function check() { if (input.length === num.length) { if (input === num) { Sounds.sfx.win(); level++; state = 'show'; input = ''; num = ''; for (let i = 0; i < level; i++) num += Math.floor(Math.random() * 10); t = level * 1000; updateHUD(); } else { Sounds.sfx.gameover(); reset(); } } }
  reset();
  window.addEventListener('keydown', handler);
  loop = Games.tickLoop(update, 1000/60);
  return () => { loop(); window.removeEventListener('keydown', handler); };
});



