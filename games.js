/* ============================================================
   TINYCADE - 游戏库（20 款经典游戏 + 91 款扩展）
   ============================================================ */

const Games = (() => {

  // ================== 公共工具 ==================
  function fitCanvas(canvas, w, h) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = Math.min(w, 480) + 'px';
    canvas.style.height = (Math.min(w, 480) * h / w) + 'px';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function clear(ctx, w, h, color = '#000') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function pxrect(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }

  function text(ctx, str, x, y, size, color, font = 'VT323', align = 'left') {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(str, x, y);
  }

  function key(map) {
    return (e) => {
      const k = e.key.toLowerCase();
      if (map[k]) { map[k](e); e.preventDefault(); return true; }
      if (map.any) map.any(e);
      return false;
    };
  }

  // 基于 requestAnimationFrame 的游戏循环，自动后台暂停。
  // 使用：const stop = Games.loop(tick, 16);  return () => stop();
  // 安全的数字表达式汇编：shunting-yard。只接受数字与 + - * / ( )。
  // 用于 make24 等交互式计算器游戏。
  function safeEval(expr) {
    const src = String(expr).replace(/\s+/g, '');
    // 预处理一元负号：在开头或 ( 后插入 0
    const pre = src.replace(/(^|[(])([-+])/g, (m, p, op) => p + '0' + op);
    const tokens = pre.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
    const cleaned = tokens.join('');
    if (cleaned !== pre) throw new Error('invalid');
    const out = []; const ops = []; const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
    for (const t of tokens) {
      if (/^\d/.test(t)) out.push(parseFloat(t));
      else if (t === '(') ops.push(t);
      else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()); if (!ops.length) throw new Error('mismatched'); ops.pop(); }
      else { while (ops.length && ops[ops.length - 1] !== '(' && (prec[ops[ops.length - 1]] || 0) >= prec[t]) out.push(ops.pop()); ops.push(t); }
    }
    while (ops.length) { const o = ops.pop(); if (o === '(') throw new Error('mismatched'); out.push(o); }
    const stack = [];
    for (const t of out) {
      if (typeof t === 'number') stack.push(t);
      else {
        const b = stack.pop(); const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error('empty');
        let r;
        if (t === '+') r = a + b;
        else if (t === '-') r = a - b;
        else if (t === '*') r = a * b;
        else if (t === '/') { if (b === 0) throw new Error('div0'); r = a / b; }
        stack.push(r);
      }
    }
    if (stack.length !== 1) throw new Error('extra');
    return stack[0];
  }

  // rAF 游戏循环（带 fps 限制、后台暂停）
  function loop(stepFn, fps) {
    let last = 0;
    const interval = fps && fps > 0 ? 1000 / fps : 0;
    let rafId = 0;
    let stopped = false;
    function frame(t) {
      if (stopped) return;
      if (document.hidden) { rafId = requestAnimationFrame(frame); return; }
      if (interval === 0 || t - last >= interval) {
        last = t;
        try { stepFn(t); } catch (e) { console.error('loop step error', e); }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(rafId); };
  }

  // ================== 游戏注册表 ==================
  const registry = {};

  function define(id, meta, factory) { registry[id] = { ...meta, id, factory }; }
  function list() { return Object.values(registry); }
  function get(id) { return registry[id]; }
  function count() { return Object.keys(registry).length; }

  // ============================================================
  // 1. 贪吃蛇 SNAKE
  // ============================================================
  define('snake', {
    name: '贪吃蛇',
    desc: '经典永不褪色，吃到果实变大但别撞墙',
    icon: '🐍',
    cat: 'arcade',
    controls: '方向键/WASD 移动 · 空格暂停 · R 重开'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 400);
    const COLS = 20, ROWS = 20, CELL = 20;
    let snake, dir, nextDir, food, score, alive, paused, loop;

    function reset() {
      snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
      dir = {x:1,y:0}; nextDir = dir;
      score = 0; alive = true; paused = false;
      spawnFood(); updateHUD();
    }
    function spawnFood() {
      if (snake.length >= COLS * ROWS) { alive = false; Sounds.sfx.win(); updateHUD(); return; }
      let attempts = 0;
      do {
        food = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
        attempts++;
      } while (snake.some(s => s.x === food.x && s.y === food.y) && attempts < 1000);
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
      status.textContent = paused ? 'PAUSED' : (alive ? '' : 'GAME OVER');
    }
    function step() {
      if (!alive || paused) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
          snake.some(s => s.x === head.x && s.y === head.y)) {
        alive = false; Sounds.sfx.gameover(); updateHUD(); return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10; Sounds.sfx.eat(); spawnFood(); updateHUD();
      } else snake.pop();
    }
    function draw() {
      clear(ctx, 400, 400, '#0a0014');
      // 网格
      ctx.strokeStyle = 'rgba(0,255,255,0.06)';
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i*CELL, 0); ctx.lineTo(i*CELL, 400); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*CELL); ctx.lineTo(400, i*CELL); ctx.stroke();
      }
      // 食物
      const pulse = Math.sin(Date.now()/200) * 2;
      rect(ctx, food.x*CELL+2-pulse/2, food.y*CELL+2-pulse/2, CELL-4+pulse, CELL-4+pulse, '#ff00ff');
      // 蛇
      snake.forEach((s, i) => {
        const isHead = i === 0;
        rect(ctx, s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2, isHead ? '#00ffff' : `hsl(${(180 + i*4) % 360}, 100%, 50%)`);
        if (isHead) {
          // 眼睛
          ctx.fillStyle = '#000';
          const ex = s.x*CELL + (dir.x === 1 ? 14 : dir.x === -1 ? 6 : 10);
          const ey = s.y*CELL + (dir.y === 1 ? 14 : dir.y === -1 ? 6 : 10);
          ctx.fillRect(ex, ey, 3, 3);
        }
      });
    }

    const handler = key({
      'arrowup': () => nextDir.y === 1 ? null : (nextDir = {x:0,y:-1}, Sounds.sfx.move()),
      'arrowdown': () => nextDir.y === -1 ? null : (nextDir = {x:0,y:1}, Sounds.sfx.move()),
      'arrowleft': () => nextDir.x === 1 ? null : (nextDir = {x:-1,y:0}, Sounds.sfx.move()),
      'arrowright': () => nextDir.x === -1 ? null : (nextDir = {x:1,y:0}, Sounds.sfx.move()),
      'w': () => nextDir.y === 1 ? null : (nextDir = {x:0,y:-1}, Sounds.sfx.move()),
      's': () => nextDir.y === -1 ? null : (nextDir = {x:0,y:1}, Sounds.sfx.move()),
      'a': () => nextDir.x === 1 ? null : (nextDir = {x:-1,y:0}, Sounds.sfx.move()),
      'd': () => nextDir.x === -1 ? null : (nextDir = {x:1,y:0}, Sounds.sfx.move()),
      ' ': () => { paused = !paused; Sounds.sfx.select(); updateHUD(); },
      'r': () => { Sounds.sfx.start(); reset(); },
    });
    window.addEventListener('keydown', handler);

    reset();
    loop = Games.tickLoop(() => { step(); draw(); }, 100);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 2. 俄罗斯方块 TETRIS
  // ============================================================
  define('tetris', {
    name: '俄罗斯方块',
    desc: '消方块的永恒经典，叠高高看你能撑多久',
    icon: '🧱',
    cat: 'puzzle',
    controls: '←→ 移动 · ↑/X 旋转 · ↓ 加速 · 空格硬降 · P 暂停'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 300, 600);
    const COLS = 10, ROWS = 20, SIZE = 30;
    const COLORS = ['#000','#00ffff','#ffff00','#aa00ff','#ff8800','#00ff66','#ff0066','#0088ff'];
    const SHAPES = [
      [[1,1,1,1]], // I
      [[2,2],[2,2]], // O
      [[0,3,0],[3,3,3]], // T
      [[0,4,4],[4,4,0]], // S
      [[5,5,0],[0,5,5]], // Z
      [[6,0,0],[6,6,6]], // J
      [[0,0,7],[7,7,7]], // L
    ];

    let board, current, next, score, lines, dropTime, lastDrop, paused, gameOver, loop;

    function emptyBoard() { return Array.from({length:ROWS}, () => Array(COLS).fill(0)); }
    function spawn() {
      const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
      current = {
        shape,
        color: SHAPES.indexOf(shape) + 1,
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
      };
      if (collide(current.x, current.y, current.shape)) gameOver = true;
    }
    function collide(px, py, shape) {
      for (let y = 0; y < shape.length; y++)
        for (let x = 0; x < shape[y].length; x++)
          if (shape[y][x]) {
            const nx = px + x, ny = py + y;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
      return false;
    }
    function merge() {
      current.shape.forEach((row, y) => row.forEach((v, x) => {
        if (v) {
          const ny = current.y + y;
          if (ny >= 0) board[ny][current.x + x] = current.color;
        }
      }));
    }
    function rotate(shape) {
      const r = [];
      for (let x = 0; x < shape[0].length; x++) {
        r.push([]);
        for (let y = shape.length - 1; y >= 0; y--) r[x].push(shape[y][x]);
      }
      return r;
    }
    function tryRotate() {
      const r = rotate(current.shape);
      if (!collide(current.x, current.y, r)) { current.shape = r; Sounds.sfx.blip(); }
      else if (!collide(current.x-1, current.y, r)) { current.shape = r; current.x--; Sounds.sfx.blip(); }
      else if (!collide(current.x+1, current.y, r)) { current.shape = r; current.x++; Sounds.sfx.blip(); }
    }
    function clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(v => v)) {
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          cleared++; y++;
        }
      }
      if (cleared) {
        const pts = [0,100,300,500,800][cleared];
        score += pts; lines += cleared; Sounds.sfx.line();
      }
    }
    function tick() {
      if (paused || gameOver) return;
      const now = Date.now();
      const speed = Math.max(100, 800 - Math.floor(lines/5)*50);
      if (now - lastDrop > dropTime) {
        if (!collide(current.x, current.y + 1, current.shape)) {
          current.y++;
        } else {
          merge(); clearLines(); spawn();
        }
        lastDrop = now; dropTime = speed;
      }
    }
    function hardDrop() {
      while (!collide(current.x, current.y + 1, current.shape)) current.y++;
      merge(); clearLines(); spawn(); Sounds.sfx.drop();
    }
    function draw() {
      clear(ctx, 300, 600, '#0a0014');
      // 网格
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*SIZE, 0); ctx.lineTo(x*SIZE, 600); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y*SIZE); ctx.lineTo(300, y*SIZE); ctx.stroke(); }
      // 已落方块
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (board[y][x]) drawCell(ctx, x, y, COLORS[board[y][x]]);
      // 当前方块
      if (current) current.shape.forEach((row, y) => row.forEach((v, x) => {
        if (v) drawCell(ctx, current.x + x, current.y + y, COLORS[current.color]);
      }));
      // 边框
      ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 300, 600);
      // HUD
      text(ctx, `LINES ${lines}`, 10, 10, 14, '#00ffff');
    }
    function drawCell(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x*SIZE+1, y*SIZE+1, SIZE-2, SIZE-2);
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x*SIZE+1, y*SIZE+1, SIZE-2, 3);
      ctx.fillRect(x*SIZE+1, y*SIZE+1, 3, SIZE-2);
    }

    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
      status.textContent = paused ? 'PAUSED' : (gameOver ? 'GAME OVER' : '');
    }

    const handler = key({
      'arrowleft': () => !collide(current.x-1, current.y, current.shape) && (current.x--, Sounds.sfx.move()),
      'arrowright': () => !collide(current.x+1, current.y, current.shape) && (current.x++, Sounds.sfx.move()),
      'arrowdown': () => !collide(current.x, current.y+1, current.shape) && (current.y++, Sounds.sfx.move()),
      'arrowup': () => tryRotate(),
      'x': () => tryRotate(),
      ' ': () => hardDrop(),
      'p': () => { paused = !paused; Sounds.sfx.select(); updateHUD(); },
    });

    function reset() {
      board = emptyBoard(); score = 0; lines = 0; gameOver = false; paused = false;
      dropTime = 800; lastDrop = Date.now();
      spawn(); updateHUD();
    }
    reset();
    window.addEventListener('keydown', handler);
    loop = Games.tickLoop(() => { tick(); draw(); updateHUD(); }, 30);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 3. 像素鸟 FLAPPY BIRD
  // ============================================================
  define('flappy', {
    name: '像素鸟',
    desc: '小鸟穿管道，点一下飞一下',
    icon: '🐦',
    cat: 'action',
    controls: '空格/点击/触屏 跳跃 · 撞到管道就重来'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 500);
    let bird, pipes, score, frame, state, ground;
    const W = 400, H = 500, GROUND_H = 60;
    const PIPE_W = 60, PIPE_GAP = 140;

    function reset() {
      bird = { x: 80, y: 250, vy: 0, r: 12 };
      pipes = []; score = 0; frame = 0; state = 'ready'; ground = 0;
      updateHUD();
    }
    function flap() {
      if (state === 'ready') { state = 'play'; Sounds.sfx.start(); }
      if (state === 'play') { bird.vy = -7; Sounds.sfx.jump(); }
      if (state === 'over') { reset(); Sounds.sfx.start(); }
    }
    function update() {
      if (state !== 'play') return;
      frame++;
      bird.vy += 0.35; bird.y += bird.vy;
      ground = (ground + 3) % 24;

      // 生成管道
      if (frame % 90 === 0) {
        const topH = 60 + Math.random() * 200;
        pipes.push({ x: W, topH, scored: false });
      }
      pipes.forEach(p => p.x -= 2.5);
      pipes = pipes.filter(p => p.x + PIPE_W > 0);

      // 碰撞
      if (bird.y + bird.r >= H - GROUND_H) { state = 'over'; Sounds.sfx.gameover(); }
      for (const p of pipes) {
        if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
          if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + PIPE_GAP) {
            state = 'over'; Sounds.sfx.hit();
          }
        }
        if (!p.scored && p.x + PIPE_W < bird.x) { p.scored = true; score++; Sounds.sfx.blip(); updateHUD(); }
      }
    }
    function draw() {
      // 天空
      const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      grad.addColorStop(0, '#000033'); grad.addColorStop(1, '#ff8800');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H - GROUND_H);
      // 远山
      ctx.fillStyle = '#1a0030';
      for (let i = 0; i < 5; i++) {
        const h = 60 + Math.sin(i * 1.3) * 30;
        ctx.beginPath();
        ctx.moveTo(i * 100, H - GROUND_H);
        ctx.lineTo(i * 100 + 50, H - GROUND_H - h);
        ctx.lineTo(i * 100 + 100, H - GROUND_H);
        ctx.fill();
      }
      // 管道
      pipes.forEach(p => {
        ctx.fillStyle = '#00aa00';
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.fillRect(p.x - 4, p.topH - 20, PIPE_W + 8, 20);
        ctx.fillRect(p.x, p.topH + PIPE_GAP, PIPE_W, H - GROUND_H - p.topH - PIPE_GAP);
        ctx.fillRect(p.x - 4, p.topH + PIPE_GAP, PIPE_W + 8, 20);
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(p.x + 4, 0, 6, p.topH);
        ctx.fillRect(p.x + 4, p.topH + PIPE_GAP, 6, H - GROUND_H - p.topH - PIPE_GAP);
      });
      // 地面
      ctx.fillStyle = '#aa6600'; ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = '#ffff00'; ctx.fillRect(0, H - GROUND_H, W, 4);
      ctx.fillStyle = '#553300';
      for (let x = -ground; x < W; x += 24) ctx.fillRect(x, H - GROUND_H + 20, 12, 40);
      // 小鸟
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.vy * 0.05)));
      // 身体
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-12, -10, 24, 20);
      ctx.fillRect(-8, -14, 16, 4);
      // 翅膀
      ctx.fillStyle = '#ff8800';
      const wingFlap = Math.sin(frame * 0.3) * 4;
      ctx.fillRect(-6, -2 + wingFlap, 12, 8);
      // 眼睛
      ctx.fillStyle = '#fff'; ctx.fillRect(4, -6, 6, 6);
      ctx.fillStyle = '#000'; ctx.fillRect(6, -4, 3, 3);
      // 嘴
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(10, -2, 6, 4);
      ctx.fillRect(12, 0, 4, 2);
      ctx.restore();

      // 分数
      text(ctx, String(score), W/2, 40, 48, '#fff', 'Press Start 2P', 'center');
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      ctx.strokeText(String(score), W/2, 40);

      // 状态文字
      if (state === 'ready') {
        text(ctx, 'TAP TO START', W/2, H/2 - 20, 18, '#ffff00', 'Press Start 2P', 'center');
      } else if (state === 'over') {
        text(ctx, 'GAME OVER', W/2, H/2 - 40, 24, '#ff0066', 'Press Start 2P', 'center');
        text(ctx, 'TAP TO RESTART', W/2, H/2 + 10, 14, '#00ffff', 'Press Start 2P', 'center');
      }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
      status.textContent = state === 'over' ? 'GAME OVER' : '';
    }

    const onClick = (e) => { flap(); e.preventDefault(); };
    const handler = key({
      ' ': () => flap(),
      'arrowup': () => flap(),
    });

    canvas.addEventListener('mousedown', onClick);
    canvas.addEventListener('touchstart', onClick, {passive:false});
    window.addEventListener('keydown', handler);

    reset();
    const loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
    return () => { loop(); canvas.removeEventListener('mousedown', onClick); canvas.removeEventListener('touchstart', onClick); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 4. 扫雷 MINESWEEPER
  // ============================================================
  define('minesweeper', {
    name: '扫雷',
    desc: 'Windows 经典，找出所有地雷',
    icon: '💣',
    cat: 'puzzle',
    controls: '左键翻开 · 右键标记 · R 重开'
  }, (stage, hud, status) => {
    const W = 10, H = 10, MINES = 15;
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 400);
    const SIZE = 40;
    let board, revealed, flagged, gameOver, win, firstClick;

    function reset() {
      board = Array.from({length:H}, () => Array(W).fill(0));
      revealed = Array.from({length:H}, () => Array(W).fill(false));
      flagged = Array.from({length:H}, () => Array(W).fill(false));
      gameOver = false; win = false; firstClick = true;
      updateHUD();
    }
    function placeMines(sx, sy) {
      let placed = 0;
      while (placed < MINES) {
        const x = Math.floor(Math.random()*W), y = Math.floor(Math.random()*H);
        if (board[y][x] === -1) continue;
        if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue;
        board[y][x] = -1; placed++;
      }
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (board[y][x] === -1) continue;
          let n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H && board[ny][nx] === -1) n++;
            }
          board[y][x] = n;
        }
    }
    function reveal(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H || revealed[y][x] || flagged[y][x]) return;
      revealed[y][x] = true;
      if (board[y][x] === 0) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) reveal(x + dx, y + dy);
      }
    }
    function checkWin() {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (board[y][x] !== -1 && !revealed[y][x]) return false;
      return true;
    }
    function updateHUD() {
      const flags = flagged.flat().filter(f => f).length;
      hud.querySelector('.hud-score').textContent = `🚩 ${flags}/${MINES}`;
      status.textContent = gameOver ? (win ? 'YOU WIN!' : 'BOOM!') : '';
    }
    function draw() {
      clear(ctx, 400, 400, '#0a0014');
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const px = x * SIZE, py = y * SIZE;
          if (revealed[y][x]) {
            ctx.fillStyle = '#2a2a4a'; ctx.fillRect(px+1, py+1, SIZE-2, SIZE-2);
            if (board[y][x] === -1) {
              ctx.fillStyle = '#ff0066'; ctx.fillRect(px+8, py+8, SIZE-16, SIZE-16);
              text(ctx, '💣', px + SIZE/2, py + SIZE/2 - 8, 18, '#000', 'sans-serif', 'center');
            } else if (board[y][x] > 0) {
              const colors = ['#0000ff','#008800','#ff0000','#000080','#800000','#008080','#000000','#808080'];
              text(ctx, String(board[y][x]), px + SIZE/2, py + 8, 24, colors[board[y][x]-1], 'Press Start 2P', 'center');
            }
          } else {
            ctx.fillStyle = '#4a4a8a'; ctx.fillRect(px+1, py+1, SIZE-2, SIZE-2);
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(px+1, py+1, SIZE-2, 3);
            ctx.fillRect(px+1, py+1, 3, SIZE-2);
            if (flagged[y][x]) {
              text(ctx, '⚑', px + SIZE/2, py + 8, 20, '#ff0000', 'Press Start 2P', 'center');
            }
          }
          ctx.strokeStyle = '#000'; ctx.strokeRect(px, py, SIZE, SIZE);
        }
    }

    function getCell(e) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * W);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * H);
      return { x, y };
    }
    const onClick = (e) => {
      if (gameOver) return;
      const { x, y } = getCell(e);
      if (firstClick) { placeMines(x, y); firstClick = false; }
      reveal(x, y);
      if (board[y][x] === -1) {
        gameOver = true; Sounds.sfx.explode();
        for (let yy = 0; yy < H; yy++)
          for (let xx = 0; xx < W; xx++)
            if (board[yy][xx] === -1) revealed[yy][xx] = true;
      } else {
        Sounds.sfx.blip();
        if (checkWin()) { win = true; gameOver = true; Sounds.sfx.win(); }
      }
      updateHUD(); draw();
    };
    const onRight = (e) => {
      e.preventDefault();
      if (gameOver) return;
      const { x, y } = getCell(e);
      if (!revealed[y][x]) { flagged[y][x] = !flagged[y][x]; Sounds.sfx.flagged ? Sounds.sfx.flagged() : Sounds.sfx.beep(); updateHUD(); draw(); }
    };
    const handler = key({ 'r': () => { Sounds.sfx.start(); reset(); draw(); } });

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onRight);
    window.addEventListener('keydown', handler);
    reset(); draw();
    return () => { canvas.removeEventListener('click', onClick); canvas.removeEventListener('contextmenu', onRight); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 5. 2048
  // ============================================================
  define('g2048', {
    name: '2048',
    desc: '合并数字挑战极限，2014 年火爆全球',
    icon: '🔢',
    cat: 'puzzle',
    controls: '方向键移动方块 · 同数合并 · 达到 2048 获胜'
  }, (stage, hud, status) => {
    const N = 4;
    const container = document.createElement('div');
    container.style.cssText = 'display:inline-block;background:#1a0030;padding:12px;border:3px solid #ff00ff;box-shadow:6px 6px 0 #00ffff;';
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${N},80px);grid-template-rows:repeat(${N},80px);gap:8px;background:#0a0014;padding:8px;`;
    container.appendChild(grid);
    stage.appendChild(container);

    let cells = [];
    let score = 0; let best = 0; let won = false; let over = false;
    for (let i = 0; i < N*N; i++) {
      const d = document.createElement('div');
      d.style.cssText = 'background:#2d0050;color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Press Start 2P";font-size:18px;border-radius:4px;transition:all 0.15s;';
      grid.appendChild(d); cells.push(d);
    }

    const COLORS = {
      0:'#2d0050', 2:'#553388', 4:'#7744aa', 8:'#ff8800', 16:'#ff6600',
      32:'#ff4400', 64:'#ff0066', 128:'#ffff00', 256:'#ffee00',
      512:'#ffdd00', 1024:'#ffcc00', 2048:'#ffbb00'
    };
    let board;

    function reset() {
      board = Array.from({length:N}, () => Array(N).fill(0));
      score = 0; won = false; over = false;
      addRandom(); addRandom();
      render(); updateHUD();
    }
    function addRandom() {
      const empty = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) empty.push({x,y});
      if (!empty.length) return false;
      const { x, y } = empty[Math.floor(Math.random() * empty.length)];
      board[y][x] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }
    function render() {
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = board[y][x];
          const c = cells[y*N+x];
          c.textContent = v || '';
          c.style.background = COLORS[v] || '#ff00ff';
          c.style.fontSize = v >= 1000 ? '14px' : v >= 100 ? '16px' : '18px';
          c.style.color = v >= 8 ? '#000' : '#fff';
          c.style.boxShadow = v ? 'inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3)' : 'none';
        }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
      status.textContent = won ? 'YOU WIN!' : over ? 'GAME OVER' : '';
    }
    function move(dir) {
      if (over) return false;
      const old = JSON.stringify(board);
      const lines = [];
      for (let i = 0; i < N; i++) {
        let line = [];
        for (let j = 0; j < N; j++) {
          const y = dir === 'up' ? j : dir === 'down' ? N-1-j : i;
          const x = dir === 'left' ? j : dir === 'right' ? N-1-j : i;
          if (board[y][x]) line.push(board[y][x]);
        }
        // 合并
        for (let k = 0; k < line.length - 1; k++) {
          if (line[k] === line[k+1]) {
            line[k] *= 2;
            score += line[k];
            if (line[k] === 2048 && !won) { won = true; Sounds.sfx.win(); }
            line.splice(k+1, 1);
          }
        }
        while (line.length < N) line.push(0);
        if (dir === 'right' || dir === 'down') line.reverse();
        lines.push(line);
      }
      // 写回
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const y = dir === 'left' || dir === 'right' ? i : j;
          const x = dir === 'up' || dir === 'down' ? i : j;
          board[y][x] = lines[i][j];
        }
      if (JSON.stringify(board) === old) return false;
      Sounds.sfx.move();
      addRandom(); render(); updateHUD();
      if (isOver()) { over = true; Sounds.sfx.gameover(); updateHUD(); }
      return true;
    }
    function isOver() {
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!board[y][x]) return false;
          if (x < N-1 && board[y][x] === board[y][x+1]) return false;
          if (y < N-1 && board[y][x] === board[y+1][x]) return false;
        }
      return true;
    }
    const handler = key({
      'arrowleft': () => move('left'),
      'arrowright': () => move('right'),
      'arrowup': () => move('up'),
      'arrowdown': () => move('down'),
      'a': () => move('left'),
      'd': () => move('right'),
      'w': () => move('up'),
      's': () => move('down'),
      'r': () => { reset(); Sounds.sfx.start(); },
    });

    reset();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ============================================================
  // 6. 打地鼠 WHACK-A-MOLE
  // ============================================================
  define('whackamole', {
    name: '打地鼠',
    desc: '9 个洞口，地鼠乱窜，锤它！',
    icon: '🔨',
    cat: 'arcade',
    controls: '点击/点击地鼠 · 限时 60 秒'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 400);
    const SIZE = 130;
    let moles, score, time, lastSpawn, lastHide;
    function reset() {
      moles = Array.from({length:9}, () => ({ up: false, t: 0, x: 0, y: 0 }));
      score = 0; time = 60; lastSpawn = 0; lastHide = 0;
      updateHUD();
    }
    function spawn() {
      const idx = Math.floor(Math.random()*9);
      moles[idx].up = true; moles[idx].t = Date.now();
    }
    function update(dt) {
      time -= dt;
      if (time <= 0) { time = 0; Sounds.sfx.gameover(); updateHUD(); return; }
      if (Date.now() - lastSpawn > 700) { spawn(); lastSpawn = Date.now(); }
      moles.forEach(m => { if (m.up && Date.now() - m.t > 1500) m.up = false; });
    }
    function draw() {
      clear(ctx, 400, 400, '#553300');
      // 土堆
      for (let i = 0; i < 9; i++) {
        const x = (i % 3) * SIZE + 20, y = Math.floor(i / 3) * SIZE + 20;
        ctx.fillStyle = '#332200';
        ctx.beginPath();
        ctx.ellipse(x + SIZE/2, y + SIZE - 20, SIZE/2 - 10, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#221100';
        ctx.fillRect(x + 10, y + SIZE - 30, SIZE - 20, 30);
        // 洞口
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x + SIZE/2, y + SIZE - 20, SIZE/2 - 20, 22, 0, 0, Math.PI);
        ctx.fill();
        // 地鼠
        const m = moles[i];
        if (m.up) {
          const t = Math.min(1, (Date.now() - m.t) / 200);
          const dy = (1 - t) * 50;
          ctx.save();
          ctx.translate(x + SIZE/2, y + SIZE - 20 + dy);
          // 身体
          ctx.fillStyle = '#aa6633';
          ctx.fillRect(-30, -40, 60, 50);
          // 脸
          ctx.fillStyle = '#cc8855';
          ctx.fillRect(-25, -55, 50, 30);
          // 眼睛
          ctx.fillStyle = '#fff';
          ctx.fillRect(-15, -50, 8, 8);
          ctx.fillRect(7, -50, 8, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(-12, -48, 4, 4);
          ctx.fillRect(10, -48, 4, 4);
          // 鼻子
          ctx.fillStyle = '#ff00ff';
          ctx.fillRect(-3, -38, 6, 4);
          // 牙
          ctx.fillStyle = '#fff';
          ctx.fillRect(-6, -32, 4, 8);
          ctx.fillRect(2, -32, 4, 8);
          // 锤子动画（被打）
          const hit = (Date.now() - m.t) < 300 ? (1 - (Date.now()-m.t)/300) * 30 : 0;
          if (hit) {
            ctx.fillStyle = '#888';
            ctx.fillRect(-50, -60 + hit, 30, 8);
            ctx.fillStyle = '#ff0000';
            ctx.fillText('WHAM!', -30, -80);
          }
          ctx.restore();
        }
      }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `SCORE ${score}`;
      status.textContent = `TIME ${Math.ceil(time)}s`;
    }
    const onClick = (e) => {
      if (time <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 400;
      const y = ((e.clientY - rect.top) / rect.height) * 400;
      const cx = Math.floor(x / SIZE) + Math.floor(y / SIZE) * 3;
      if (moles[cx] && moles[cx].up) {
        moles[cx].up = false; moles[cx].t = Date.now() - 1200;
        score += 10; Sounds.sfx.hit(); updateHUD();
      }
    };
    canvas.addEventListener('click', onClick);
    reset();
    let lastT = Date.now();
    const loop = Games.tickLoop(() => {
      const dt = (Date.now() - lastT) / 1000; lastT = Date.now();
      update(dt); draw();
      if (time % 1 < dt) updateHUD();
    }, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); };
  });

  // ============================================================
  // 7. 记忆翻牌 MEMORY
  // ============================================================
  define('memory', {
    name: '记忆翻牌',
    desc: '翻开两张相同图案的卡牌，考验记忆',
    icon: '🃏',
    cat: 'casual',
    controls: '点击/触屏翻开卡牌 · 限时挑战最少步数'
  }, (stage, hud, status) => {
    const PAIRS = 8;
    const container = document.createElement('div');
    container.style.cssText = 'display:grid;grid-template-columns:repeat(4,80px);grid-template-rows:repeat(4,80px);gap:8px;padding:12px;background:#0a0014;border:3px solid #ff00ff;box-shadow:6px 6px 0 #00ffff;width:max-content;margin:0 auto;';
    stage.appendChild(container);
    const SYMBOLS = ['🍎','🍌','🍇','🍓','🍑','🍒','🥝','🍍'];
    let cards = [], flipped = [], matched = 0, moves = 0, locked = false;

    function reset() {
      container.innerHTML = '';
      const syms = [...SYMBOLS.slice(0,PAIRS), ...SYMBOLS.slice(0,PAIRS)].sort(() => Math.random() - 0.5);
      cards = []; flipped = []; matched = 0; moves = 0; locked = false;
      for (let i = 0; i < PAIRS*2; i++) {
        const c = document.createElement('div');
        c.style.cssText = 'background:#2d0050;border:2px solid #00ffff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;cursor:pointer;user-select:none;transition:transform 0.3s;transform-style:preserve-3d;';
        c.textContent = '?';
        c.addEventListener('click', () => flip(c, i));
        container.appendChild(c);
        cards.push({ el: c, sym: syms[i], open: false, done: false });
      }
      updateHUD();
    }
    function flip(el, idx) {
      if (locked || cards[idx].open || cards[idx].done) return;
      cards[idx].open = true;
      el.textContent = cards[idx].sym; el.style.background = '#aa00ff';
      flipped.push(idx); Sounds.sfx.flip();
      if (flipped.length === 2) {
        moves++; locked = true;
        const [a, b] = flipped;
        if (cards[a].sym === cards[b].sym) {
          cards[a].done = cards[b].done = true;
          cards[a].el.style.background = cards[b].el.style.background = '#00ff66';
          matched++; Sounds.sfx.powerup();
          flipped = []; locked = false;
          if (matched === PAIRS) Sounds.sfx.win();
          updateHUD();
        } else {
          setTimeout(() => {
            cards[a].open = cards[b].open = false;
            cards[a].el.textContent = cards[b].el.textContent = '?';
            cards[a].el.style.background = cards[b].el.style.background = '#2d0050';
            flipped = []; locked = false;
            updateHUD();
          }, 800);
        }
      }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `MOVES ${moves}`;
      status.textContent = matched === PAIRS ? `CLEAR! ${moves} moves` : `${matched}/${PAIRS} PAIRS`;
    }
    reset();
    return () => {};
  });

  // ============================================================
  // 8. 反弹球 PONG
  // ============================================================
  define('pong', {
    name: '反弹球',
    desc: '经典街机，两边挡板对打',
    icon: '🏓',
    cat: 'arcade',
    controls: 'W/S 移动左挡板 · ↑/↓ 移动右挡板 · 1P/2P 同屏对战'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 480, 320);
    let ball, p1, p2, score1, score2;
    function reset() {
      ball = { x: 240, y: 160, vx: 3, vy: 2 };
      p1 = { y: 130 }; p2 = { y: 130 };
      score1 = 0; score2 = 0;
      updateHUD();
    }
    function update() {
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y <= 4 || ball.y >= 316) ball.vy *= -1;
      if (ball.x <= 14 && ball.y >= p1.y && ball.y <= p1.y + 60) {
        ball.vx = Math.abs(ball.vx); ball.vy += (Math.random() - 0.5) * 2; Sounds.sfx.blip();
      }
      if (ball.x >= 466 && ball.y >= p2.y && ball.y <= p2.y + 60) {
        ball.vx = -Math.abs(ball.vx); ball.vy += (Math.random() - 0.5) * 2; Sounds.sfx.blip();
      }
      if (ball.x < 0) { score2++; Sounds.sfx.gameover(); reset(0); }
      if (ball.x > 480) { score1++; Sounds.sfx.gameover(); reset(0); }
      ball.vy = Math.max(-6, Math.min(6, ball.vy));
      p1.y = Math.max(0, Math.min(260, p1.y));
      p2.y = Math.max(0, Math.min(260, p2.y));
    }
    function reset(scored) {
      ball = { x: 240, y: 160, vx: scored === 1 ? -3 : 3, vy: 2 };
      updateHUD();
    }
    function draw() {
      clear(ctx, 480, 320, '#000');
      ctx.strokeStyle = '#444'; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(240, 0); ctx.lineTo(240, 320); ctx.stroke();
      ctx.setLineDash([]);
      // 挡板
      ctx.fillStyle = '#00ffff'; ctx.fillRect(4, p1.y, 10, 60);
      ctx.fillStyle = '#ff00ff'; ctx.fillRect(466, p2.y, 10, 60);
      // 球
      ctx.fillStyle = '#ffff00'; ctx.fillRect(ball.x-4, ball.y-4, 8, 8);
      // 分数
      text(ctx, String(score1), 200, 20, 32, '#00ffff', 'Press Start 2P', 'center');
      text(ctx, String(score2), 280, 20, 32, '#ff00ff', 'Press Start 2P', 'center');
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `${score1} - ${score2}`;
      status.textContent = '';
    }
    const handler = key({
      'w': () => p1.y -= 5,
      's': () => p1.y += 5,
      'arrowup': () => p2.y -= 5,
      'arrowdown': () => p2.y += 5,
    });
    reset();
    window.addEventListener('keydown', handler);
    const loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 9. 井字棋 TIC-TAC-TOE
  // ============================================================
  define('tictactoe', {
    name: '井字棋',
    desc: '三连成一线，电脑不算太强',
    icon: '⭕',
    cat: 'strategy',
    controls: '点击格子落子 · 你 X，电脑 O'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 360, 360);
    const SIZE = 120;
    let board, turn, win, draw, over;
    function reset() {
      board = Array(9).fill(null);
      turn = 'X'; win = null; draw = false; over = false;
      updateHUD();
    }
    function checkWin() {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const l of lines) {
        if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) return board[l[0]];
      }
      if (board.every(c => c)) return 'draw';
      return null;
    }
    function aiMove() {
      // 优先获胜
      for (let i = 0; i < 9; i++) if (!board[i]) {
        board[i] = 'O'; if (checkWin() === 'O') { board[i] = null; return i; } board[i] = null;
      }
      // 阻止玩家获胜
      for (let i = 0; i < 9; i++) if (!board[i]) {
        board[i] = 'X'; if (checkWin() === 'X') { board[i] = null; return i; } board[i] = null;
      }
      // 中心 > 角 > 边
      const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
      for (const i of order) if (!board[i]) return i;
    }
    function move(i) {
      if (over || board[i]) return;
      board[i] = 'X';
      Sounds.sfx.place();
      const w = checkWin();
      if (w) { over = true; win = w; if (w === 'X') Sounds.sfx.win(); else if (w === 'draw') Sounds.sfx.beep(); else Sounds.sfx.gameover(); updateHUD(); return; }
      // AI
      setTimeout(() => {
        const ai = aiMove(); board[ai] = 'O'; Sounds.sfx.blip();
        const w2 = checkWin();
        if (w2) { over = true; win = w2; updateHUD(); Sounds.sfx[w2 === 'O' ? 'gameover' : 'beep'](); }
      }, 400);
    }
    function draw2() {
      clear(ctx, 360, 360, '#0a0014');
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i*SIZE, 0); ctx.lineTo(i*SIZE, 360); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*SIZE); ctx.lineTo(360, i*SIZE); ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const x = (i % 3) * SIZE, y = Math.floor(i / 3) * SIZE;
        if (board[i] === 'X') {
          ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 12;
          ctx.beginPath(); ctx.moveTo(x+20, y+20); ctx.lineTo(x+SIZE-20, y+SIZE-20); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x+SIZE-20, y+20); ctx.lineTo(x+20, y+SIZE-20); ctx.stroke();
        } else if (board[i] === 'O') {
          ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 12;
          ctx.beginPath(); ctx.arc(x+SIZE/2, y+SIZE/2, SIZE/2 - 20, 0, Math.PI*2); ctx.stroke();
        }
      }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = 'YOU vs AI';
      status.textContent = over ? (win === 'draw' ? 'DRAW!' : win === 'X' ? 'YOU WIN!' : 'AI WINS!') : `YOUR TURN (X)`;
    }
    const onClick = (e) => {
      if (over) { reset(); return; }
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * 360 / SIZE);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * 360 / SIZE);
      move(y * 3 + x);
    };
    canvas.addEventListener('click', onClick);
    reset();
    const loop = Games.tickLoop(draw2, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); };
  });

  // ============================================================
  // 10. 五子棋 GOMOKU
  // ============================================================
  define('gomoku', {
    name: '五子棋',
    desc: '五子连珠，先连成五的一方胜',
    icon: '⚫',
    cat: 'strategy',
    controls: '点击落子 · 黑白对弈 · 五子连一线胜'
  }, (stage, hud, status) => {
    const N = 15;
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 420, 420);
    const SIZE = 28;
    let board, turn, over;
    function reset() {
      board = Array.from({length:N}, () => Array(N).fill(null));
      turn = 'B'; over = false; updateHUD();
    }
    function checkWin(x, y) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (const [dx, dy] of dirs) {
        let cnt = 1;
        for (let s = 1; s < 5; s++) {
          const nx = x + dx*s, ny = y + dy*s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N || board[ny][nx] !== turn) break; cnt++;
        }
        for (let s = 1; s < 5; s++) {
          const nx = x - dx*s, ny = y - dy*s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N || board[ny][nx] !== turn) break; cnt++;
        }
        if (cnt >= 5) return true;
      }
      return false;
    }
    function aiMove() {
      // 简单评估：找最值得下的位置
      let best = -Infinity, bestI = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (board[y][x]) continue;
        let score = 0;
        // 周围有棋子加分
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
          if (board[ny][nx]) score += Math.abs(dx) + Math.abs(dy) < 3 ? 10 : 3;
        }
        // AI 进攻评估
        board[y][x] = 'W';
        score += evalPos(x, y, 'W') * 1.2;
        // 防守评估
        board[y][x] = 'B';
        score += evalPos(x, y, 'B') * 1.0;
        board[y][x] = null;
        if (score > best) { best = score; bestI = y * N + x; }
      }
      return bestI;
    }
    function evalPos(x, y, who) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      let total = 0;
      for (const [dx, dy] of dirs) {
        let cnt = 1, open = 0;
        for (let s = 1; s < 5; s++) {
          const nx = x + dx*s, ny = y + dy*s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N) break;
          if (board[ny][nx] === who) cnt++; else { if (board[ny][nx] === null) open++; break; }
        }
        for (let s = 1; s < 5; s++) {
          const nx = x - dx*s, ny = y - dy*s;
          if (nx < 0 || nx >= N || ny < 0 || ny >= N) break;
          if (board[ny][nx] === who) cnt++; else { if (board[ny][nx] === null) open++; break; }
        }
        if (cnt >= 4) total += 10000;
        else if (cnt === 3 && open > 0) total += 1000;
        else if (cnt === 2 && open > 0) total += 100;
        else if (cnt === 1) total += 10;
      }
      return total;
    }
    function move(x, y) {
      if (over || board[y][x]) return;
      board[y][x] = turn; Sounds.sfx.place();
      if (checkWin(x, y)) { over = true; Sounds.sfx.win(); updateHUD(); return; }
      turn = turn === 'B' ? 'W' : 'B';
      if (turn === 'W' && !over) {
        setTimeout(() => {
          const idx = aiMove(); const ax = idx % N, ay = Math.floor(idx / N);
          board[ay][ax] = 'W'; Sounds.sfx.blip();
          if (checkWin(ax, ay)) { over = true; Sounds.sfx.gameover(); updateHUD(); return; }
          turn = 'B'; updateHUD();
        }, 400);
      }
    }
    function draw2() {
      clear(ctx, 420, 420, '#ddbb77');
      ctx.strokeStyle = '#553300'; ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        ctx.beginPath(); ctx.moveTo(SIZE/2 + i*SIZE, SIZE/2); ctx.lineTo(SIZE/2 + i*SIZE, 420 - SIZE/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SIZE/2, SIZE/2 + i*SIZE); ctx.lineTo(420 - SIZE/2, SIZE/2 + i*SIZE); ctx.stroke();
      }
      // 星位
      ctx.fillStyle = '#553300';
      [[3,3],[3,11],[11,3],[11,11],[7,7]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.arc(SIZE/2 + x*SIZE, SIZE/2 + y*SIZE, 3, 0, Math.PI*2); ctx.fill();
      });
      // 棋子
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!board[y][x]) continue;
          const cx = SIZE/2 + x*SIZE, cy = SIZE/2 + y*SIZE;
          const grad = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, 12);
          if (board[y][x] === 'B') {
            grad.addColorStop(0, '#666'); grad.addColorStop(1, '#000');
          } else {
            grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#aaa');
          }
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
        }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = turn === 'B' ? 'YOUR TURN (BLACK)' : 'AI THINKING...';
      status.textContent = over ? (turn === 'B' ? 'AI WINS!' : 'YOU WIN!') : '';
    }
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width * 420 - SIZE/2) / SIZE);
      const y = Math.round(((e.clientY - rect.top) / rect.height * 420 - SIZE/2) / SIZE);
      if (x >= 0 && x < N && y >= 0 && y < N) move(x, y);
    };
    canvas.addEventListener('click', onClick);
    reset();
    const loop = Games.tickLoop(draw2, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); };
  });

  // ============================================================
  // 11. 数字华容道 15-PUZZLE
  // ============================================================
  define('fifteen', {
    name: '数字华容道',
    desc: '滑动数字 1-15 还原顺序',
    icon: '🔢',
    cat: 'puzzle',
    controls: '点击/方向键移动数字方块'
  }, (stage, hud, status) => {
    const N = 4;
    const container = document.createElement('div');
    container.style.cssText = 'display:grid;grid-template-columns:repeat(4,80px);grid-template-rows:repeat(4,80px);gap:6px;padding:8px;background:#0a0014;border:3px solid #00ffff;box-shadow:6px 6px 0 #ff00ff;width:max-content;margin:0 auto;';
    stage.appendChild(container);
    let board, moves;

    function reset() {
      // 生成可解的随机局面
      do {
        const arr = Array.from({length:N*N-1}, (_,i) => i+1).concat(0);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        board = [];
        for (let y = 0; y < N; y++) board.push(arr.slice(y*N, (y+1)*N));
      } while (!isSolvable(board) || isSolved(board));
      moves = 0; updateHUD();
    }
    function isSolved(b) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (x === N-1 && y === N-1) continue; if (b[y][x] !== y*N + x + 1) return false; } return true; }
    function isSolvable(b) {
      let inv = 0;
      const flat = b.flat();
      for (let i = 0; i < flat.length; i++) for (let j = i+1; j < flat.length; j++) if (flat[i] && flat[j] && flat[i] > flat[j]) inv++;
      let emptyRow = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!b[y][x]) emptyRow = N - y;
      if (N % 2 === 1) return inv % 2 === 0;
      return (inv + emptyRow) % 2 === 1;
    }
    function findEmpty() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) return {x,y}; }
    function tryMove(x, y) {
      const e = findEmpty();
      if (Math.abs(e.x - x) + Math.abs(e.y - y) === 1) {
        board[e.y][e.x] = board[y][x]; board[y][x] = 0; moves++; Sounds.sfx.move();
        render(); updateHUD();
        if (isSolved(board)) Sounds.sfx.win();
      }
    }
    function render() {
      container.innerHTML = '';
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = board[y][x];
          const d = document.createElement('div');
          d.style.cssText = `background:${v ? '#aa00ff' : '#000'};border:2px solid #00ffff;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P';font-size:20px;cursor:${v?'pointer':'default'};`;
          d.textContent = v || '';
          if (v) d.addEventListener('click', () => tryMove(x, y));
          container.appendChild(d);
        }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `MOVES ${moves}`;
      status.textContent = isSolved(board) ? 'SOLVED!' : '';
    }
    const handler = key({
      'arrowleft': () => { const e = findEmpty(); if (e.x < N-1) tryMove(e.x+1, e.y); },
      'arrowright': () => { const e = findEmpty(); if (e.x > 0) tryMove(e.x-1, e.y); },
      'arrowup': () => { const e = findEmpty(); if (e.y < N-1) tryMove(e.x, e.y+1); },
      'arrowdown': () => { const e = findEmpty(); if (e.y > 0) tryMove(e.x, e.y-1); },
    });
    reset();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ============================================================
  // 12. 猜数字 BULLS AND COWS
  // ============================================================
  define('guess', {
    name: '猜数字',
    desc: '4 位数字，A 表示位置对，B 表示数字对',
    icon: '🔐',
    cat: 'casual',
    controls: '输入 4 位不重复数字 · 提交看反馈'
  }, (stage, hud, status) => {
    const container = document.createElement('div');
    container.style.cssText = 'max-width:480px;margin:0 auto;padding:16px;background:#0a0014;border:3px solid #ff00ff;box-shadow:6px 6px 0 #00ffff;font-family:"Press Start 2P";color:#fff;';
    stage.appendChild(container);

    let target, history, input;
    function reset() {
      const digits = '0123456789'.split('');
      for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
      }
      target = digits.slice(0, 4).join('');
      history = []; input = '';
      render();
    }
    function guess() {
      if (input.length !== 4) return;
      let a = 0, b = 0;
      for (let i = 0; i < 4; i++) {
        if (input[i] === target[i]) a++;
        else if (target.includes(input[i])) b++;
      }
      history.unshift({ guess: input, a, b });
      Sounds.sfx.beep();
      if (a === 4) Sounds.sfx.win();
      input = ''; render();
    }
    function render() {
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:12px;color:#00ffff;margin-bottom:8px;">输入 4 位数字</div>
          <input id="guess-input" value="${input}" readonly style="font-family:'Press Start 2P';font-size:24px;width:200px;padding:8px;text-align:center;background:#1a0030;color:#ffff00;border:2px solid #ff00ff;letter-spacing:8px;" />
          <div id="keypad" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:12px;"></div>
        </div>
        <div style="margin-top:16px;">
          <div style="font-size:10px;color:#00ffff;margin-bottom:8px;">历史 (最新在上)</div>
          <div id="history"></div>
        </div>`;
      const kp = container.querySelector('#keypad');
      for (let i = 0; i <= 9; i++) {
        const b = document.createElement('button');
        b.className = 'pixel-btn';
        b.textContent = i;
        b.onclick = () => { if (input.length < 4 && !input.includes(String(i))) { input += i; Sounds.sfx.beep(); render(); } };
        kp.appendChild(b);
      }
      const submit = document.createElement('button');
      submit.className = 'pixel-btn primary';
      submit.textContent = 'GO';
      submit.onclick = guess;
      kp.appendChild(submit);
      const back = document.createElement('button');
      back.className = 'pixel-btn danger';
      back.textContent = '←';
      back.onclick = () => { input = input.slice(0, -1); Sounds.sfx.beep(); render(); };
      kp.appendChild(back);
      const clr = document.createElement('button');
      clr.className = 'pixel-btn danger';
      clr.textContent = 'CLR';
      clr.onclick = () => { input = ''; Sounds.sfx.beep(); render(); };
      kp.appendChild(clr);

      const hist = container.querySelector('#history');
      if (!history.length) hist.innerHTML = '<div style="color:#888;font-size:10px;">暂无记录</div>';
      else history.forEach(h => {
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px;margin-bottom:4px;background:#1a0030;border-left:4px solid #00ffff;font-size:12px;';
        row.innerHTML = `<span style="color:#ffff00;letter-spacing:4px;">${h.guess}</span> <span style="color:#ff00ff;">→</span> <span style="color:#00ffff;">${h.a}A${h.b}B</span>`;
        hist.appendChild(row);
      });
      hud.querySelector('.hud-score').textContent = `${history.length} TRIES`;
      status.textContent = history.length && history[0].a === 4 ? `WIN! Answer: ${target}` : '';
    }
    reset();
    return () => {};
  });

  // ============================================================
  // 13. 反应力测试 REACTION TEST
  // ============================================================
  define('reaction', {
    name: '反应力',
    desc: '看颜色变化瞬间点击，测你的反应速度',
    icon: '⚡',
    cat: 'casual',
    controls: '等屏幕变绿立刻点击 · 太早点击失败'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 480, 320);
    let phase, startT, best, state;
    function reset() { phase = 'wait'; state = 'ready'; best = Infinity; updateHUD(); }
    function start() {
      state = 'wait';
      const wait = 1500 + Math.random() * 3000;
      setTimeout(() => { state = 'go'; startT = Date.now(); }, wait);
    }
    function click() {
      if (state === 'wait') { state = 'fail'; Sounds.sfx.error(); }
      else if (state === 'go') {
        const r = Date.now() - startT;
        if (r < best) best = r;
        state = 'result'; state = 'result-' + r; Sounds.sfx[r < 300 ? 'powerup' : r < 500 ? 'win' : 'beep']();
      }
      else if (typeof state === 'string' && state.startsWith('result')) { start(); return; }
      else if (state === 'fail') { start(); return; }
      updateHUD();
    }
    function draw() {
      const colors = { wait: '#aa0000', go: '#00aa00', fail: '#aa6600' };
      const c = colors[state] || '#aa0000';
      ctx.fillStyle = c; ctx.fillRect(0, 0, 480, 320);
      ctx.fillStyle = '#fff';
      const f = 'Press Start 2P';
      if (state === 'wait') text(ctx, 'WAIT FOR GREEN...', 240, 130, 18, '#fff', f, 'center');
      else if (state === 'go') text(ctx, 'CLICK NOW!', 240, 130, 28, '#fff', f, 'center');
      else if (state === 'fail') text(ctx, 'TOO EARLY!', 240, 130, 22, '#fff', f, 'center');
      else if (typeof state === 'string' && state.startsWith('result-')) {
        const r = parseInt(state.split('-')[1]);
        text(ctx, `${r} ms`, 240, 100, 36, '#fff', f, 'center');
        text(ctx, best === Infinity ? '' : `BEST: ${best} ms`, 240, 160, 14, '#ffff00', f, 'center');
        text(ctx, 'CLICK TO TRY AGAIN', 240, 220, 12, '#fff', f, 'center');
      } else {
        text(ctx, 'CLICK TO START', 240, 130, 22, '#fff', f, 'center');
        if (best < Infinity) text(ctx, `BEST: ${best} ms`, 240, 180, 14, '#ffff00', f, 'center');
      }
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = best < Infinity ? `BEST ${best}ms` : '---';
      status.textContent = '';
    }
    const onClick = (e) => { e.preventDefault(); click(); };
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onClick, {passive:false});
    reset();
    const loop = Games.tickLoop(draw, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); canvas.removeEventListener('touchstart', onClick); };
  });

  // ============================================================
  // 14. HANGMAN
  // ============================================================
  define('hangman', {
    name: '猜单词',
    desc: '经典 Hangman，猜单词拯救小人',
    icon: '🪢',
    cat: 'puzzle',
    controls: '点击字母猜 · 6 次机会'
  }, (stage, hud, status) => {
    const WORDS = ['PIXEL','ARCADE','RETRO','NINTENDO','MARIO','TETRIS','SNAKE','SONIC','KIRBY','ZELDA','METROID','POKEMON','MINECRAFT','CANNON','FOLDER','GAMING','COMPUTER','KEYBOARD'];
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 480, 320);
    let word, guessed, wrong;
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function reset() {
      word = WORDS[Math.floor(Math.random() * WORDS.length)];
      guessed = new Set(); wrong = 0;
      updateHUD();
    }
    function guess(letter) {
      if (guessed.has(letter)) return;
      guessed.add(letter);
      if (!word.includes(letter)) { wrong++; Sounds.sfx.error(); }
      else Sounds.sfx.blip();
      updateHUD();
      if (word.split('').every(c => guessed.has(c))) Sounds.sfx.win();
    }
    function draw() {
      clear(ctx, 480, 320, '#0a0014');
      // 绞架
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(50, 280); ctx.lineTo(150, 280); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(100, 280); ctx.lineTo(100, 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(100, 60); ctx.lineTo(200, 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(200, 60); ctx.lineTo(200, 100); ctx.stroke();
      // 人
      ctx.strokeStyle = '#fff';
      if (wrong > 0) { ctx.beginPath(); ctx.arc(200, 120, 20, 0, Math.PI*2); ctx.stroke(); } // 头
      if (wrong > 1) { ctx.beginPath(); ctx.moveTo(200, 140); ctx.lineTo(200, 220); ctx.stroke(); } // 身
      if (wrong > 2) { ctx.beginPath(); ctx.moveTo(200, 160); ctx.lineTo(170, 190); ctx.stroke(); } // 左臂
      if (wrong > 3) { ctx.beginPath(); ctx.moveTo(200, 160); ctx.lineTo(230, 190); ctx.stroke(); } // 右臂
      if (wrong > 4) { ctx.beginPath(); ctx.moveTo(200, 220); ctx.lineTo(170, 260); ctx.stroke(); } // 左腿
      if (wrong > 5) { ctx.beginPath(); ctx.moveTo(200, 220); ctx.lineTo(230, 260); ctx.stroke(); } // 右腿
      // 单词
      text(ctx, word.split('').map(c => guessed.has(c) ? c : '_').join(' '), 280, 80, 24, '#ffff00', 'Press Start 2P');
      // 字母键盘
      ALPHA.forEach((l, i) => {
        const x = 280 + (i % 9) * 22, y = 160 + Math.floor(i / 9) * 30;
        ctx.fillStyle = guessed.has(l) ? (word.includes(l) ? '#00aa00' : '#aa0000') : '#00ffff';
        text(ctx, l, x, y, 12, ctx.fillStyle, 'Press Start 2P');
      });
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `LEFT ${6 - wrong}/6`;
      const won = word.split('').every(c => guessed.has(c));
      status.textContent = won ? `YOU WIN! ${word}` : wrong >= 6 ? `GAME OVER: ${word}` : '';
    }
    const onClick = (e) => {
      if (wrong >= 6 || word.split('').every(c => guessed.has(c))) { reset(); return; }
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 480;
      const y = ((e.clientY - rect.top) / rect.height) * 320;
      if (x < 280 || y < 160) return;
      const col = Math.floor((x - 280) / 22);
      const row = Math.floor((y - 160) / 30);
      const i = row * 9 + col;
      if (i >= 0 && i < 26) guess(ALPHA[i]);
    };
    canvas.addEventListener('click', onClick);
    reset();
    const loop = Games.tickLoop(draw, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); };
  });

  // ============================================================
  // 15. 太空侵略者 SPACE INVADERS
  // ============================================================
  define('space', {
    name: '太空侵略者',
    desc: '左右移动射击外星人，1978 年街机经典',
    icon: '👾',
    cat: 'arcade',
    controls: '← → 移动 · 空格射击 · P 暂停'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 480, 480);
    const W = 480, H = 480;
    let player, bullets, enemies, eBullets, score, lives, level, dir, drop, paused, over, win;

    function reset() {
      player = { x: W/2, y: H - 40 };
      bullets = []; enemies = []; eBullets = [];
      score = 0; lives = 3; level = 1; over = false; win = false; paused = false;
      spawnEnemies(); updateHUD();
    }
    function spawnEnemies() {
      enemies = [];
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 8; c++) {
          enemies.push({ x: 60 + c * 50, y: 60 + r * 40, w: 32, h: 24, type: r, alive: true });
        }
      dir = 1; drop = false;
    }
    function update() {
      if (paused || over) return;
      // 子弹
      bullets.forEach(b => b.y -= 6);
      bullets = bullets.filter(b => b.y > 0);
      eBullets.forEach(b => b.y += 4);
      eBullets = eBullets.filter(b => b.y < H);
      // 敌人移动
      let hitEdge = false;
      enemies.forEach(e => { if (e.alive && (e.x <= 10 || e.x + e.w >= W - 10)) hitEdge = true; });
      if (hitEdge) { dir *= -1; enemies.forEach(e => e.y += 16); }
      enemies.forEach(e => { if (e.alive) e.x += dir * (1 + level * 0.3); });
      // 碰撞
      bullets.forEach(b => enemies.forEach(e => {
        if (e.alive && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.alive = false; b.dead = true;
          score += (5 - e.type) * 10; Sounds.sfx.explode();
          if (enemies.every(en => !en.alive)) {
            level++; spawnEnemies(); Sounds.sfx.powerup();
          }
        }
      }));
      bullets = bullets.filter(b => !b.dead);
      // 敌人射击
      const alive = enemies.filter(e => e.alive);
      if (alive.length && Math.random() < 0.02 + level * 0.01) {
        const e = alive[Math.floor(Math.random() * alive.length)];
        eBullets.push({ x: e.x + e.w/2, y: e.y + e.h });
      }
      // 玩家被击中
      eBullets.forEach(b => {
        if (b.x > player.x - 20 && b.x < player.x + 20 && b.y > player.y - 15 && b.y < player.y + 15) {
          b.dead = true; lives--; Sounds.sfx.hit();
          if (lives <= 0) { over = true; Sounds.sfx.gameover(); }
        }
      });
      eBullets = eBullets.filter(b => !b.dead);
      // 敌人到达底部
      if (alive.some(e => e.y + e.h > H - 50)) { over = true; Sounds.sfx.gameover(); }
      updateHUD();
    }
    function draw() {
      clear(ctx, W, H, '#000');
      // 星
      for (let i = 0; i < 50; i++) {
        const x = (i * 37) % W, y = (i * 73) % H;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 3) * 0.3})`;
        ctx.fillRect(x, y, 2, 2);
      }
      // 玩家
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(player.x - 16, player.y, 32, 16);
      ctx.fillRect(player.x - 8, player.y - 8, 16, 8);
      ctx.fillRect(player.x - 4, player.y - 12, 8, 4);
      // 敌人
      enemies.forEach(e => {
        if (!e.alive) return;
        const colors = ['#ff00ff', '#ff0066', '#ff6600', '#ffff00', '#00ffff'];
        ctx.fillStyle = colors[e.type];
        const ox = e.x, oy = e.y;
        ctx.fillRect(ox + 8, oy, 16, 8);
        ctx.fillRect(ox + 4, oy + 8, 24, 8);
        ctx.fillRect(ox, oy + 16, 32, 8);
        // 眼睛
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + 8, oy + 12, 4, 4);
        ctx.fillRect(ox + 20, oy + 12, 4, 4);
      });
      // 子弹
      ctx.fillStyle = '#ffff00';
      bullets.forEach(b => ctx.fillRect(b.x-2, b.y, 4, 12));
      ctx.fillStyle = '#ff0066';
      eBullets.forEach(b => ctx.fillRect(b.x-2, b.y, 4, 12));
      // HUD
      text(ctx, `SCORE ${score}`, 10, 10, 12, '#ffff00', 'Press Start 2P');
      text(ctx, `LIVES ${lives}`, W - 10, 10, 12, '#00ff66', 'Press Start 2P', 'right');
      text(ctx, `LV ${level}`, W/2, 10, 12, '#ff00ff', 'Press Start 2P', 'center');
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `S:${score} L:${lives} LV:${level}`;
      status.textContent = paused ? 'PAUSED' : over ? (win ? 'WIN!' : 'GAME OVER') : '';
    }
    const handler = key({
      'arrowleft': () => player.x = Math.max(20, player.x - 5),
      'arrowright': () => player.x = Math.min(W-20, player.x + 5),
      ' ': () => { if (!paused && !over && bullets.length < 3) { bullets.push({ x: player.x, y: player.y - 12 }); Sounds.sfx.shoot(); } },
      'p': () => { paused = !paused; updateHUD(); },
      'r': () => { reset(); Sounds.sfx.start(); },
    });
    reset();
    window.addEventListener('keydown', handler);
    const loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 16. 打砖块 BREAKOUT
  // ============================================================
  define('breakout', {
    name: '打砖块',
    desc: '弹球打砖块，1976 年雅达利经典',
    icon: '🧱',
    cat: 'arcade',
    controls: '← → 移动挡板 · 空格发射球 · 不让球落地'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 480, 480);
    const W = 480, H = 480;
    let paddle, ball, bricks, score, lives, over, win, attached;

    function reset() {
      paddle = { x: W/2, y: H - 30, w: 80 };
      ball = { x: W/2, y: H - 50, vx: 0, vy: 0 };
      attached = true;
      score = 0; lives = 3; over = false; win = false;
      buildBricks();
      updateHUD();
    }
    function buildBricks() {
      bricks = [];
      const colors = ['#ff0066', '#ff8800', '#ffff00', '#00ff66', '#00ffff'];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 10; c++) {
          bricks.push({ x: c * 48, y: 50 + r * 24, w: 46, h: 22, color: colors[r % colors.length], alive: true });
        }
    }
    function update() {
      if (over) return;
      if (attached) { ball.x = paddle.x; ball.y = paddle.y - 10; return; }
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x < 4 || ball.x > W-4) ball.vx *= -1;
      if (ball.y < 4) ball.vy *= -1;
      // 挡板
      if (ball.y > paddle.y - 8 && ball.y < paddle.y + 8 && ball.x > paddle.x - paddle.w/2 && ball.x < paddle.x + paddle.w/2) {
        ball.vy = -Math.abs(ball.vy);
        const hit = (ball.x - paddle.x) / (paddle.w/2);
        ball.vx = hit * 5;
        Sounds.sfx.blip();
      }
      // 砖块
      bricks.forEach(b => {
        if (!b.alive) return;
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.alive = false; ball.vy *= -1; score += 10; Sounds.sfx.hit();
        }
      });
      // 落地
      if (ball.y > H) {
        lives--; Sounds.sfx.gameover();
        if (lives <= 0) { over = true; Sounds.sfx.gameover(); }
        else { attached = true; ball.x = paddle.x; ball.y = paddle.y - 10; ball.vx = ball.vy = 0; }
      }
      if (bricks.every(b => !b.alive)) { win = true; over = true; Sounds.sfx.win(); }
      updateHUD();
    }
    function draw() {
      clear(ctx, W, H, '#000');
      // 挡板
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(paddle.x - paddle.w/2, paddle.y, paddle.w, 8);
      ctx.fillStyle = '#00aaaa';
      ctx.fillRect(paddle.x - paddle.w/2, paddle.y, paddle.w, 2);
      // 球
      ctx.fillStyle = '#fff';
      ctx.fillRect(ball.x - 4, ball.y - 4, 8, 8);
      // 砖块
      bricks.forEach(b => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 3);
      });
      text(ctx, `SCORE ${score}`, 10, 10, 14, '#ffff00', 'Press Start 2P');
      text(ctx, `LIVES ${lives}`, W - 10, 10, 14, '#ff00ff', 'Press Start 2P', 'right');
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `S:${score} L:${lives}`;
      status.textContent = over ? (win ? 'YOU WIN!' : 'GAME OVER') : (attached ? 'PRESS SPACE' : '');
    }
    const handler = key({
      'arrowleft': () => paddle.x = Math.max(paddle.w/2, paddle.x - 8),
      'arrowright': () => paddle.x = Math.min(W - paddle.w/2, paddle.x + 8),
      ' ': () => { if (attached) { ball.vx = (Math.random() - 0.5) * 4; ball.vy = -5; attached = false; Sounds.sfx.shoot(); } },
      'r': () => { reset(); Sounds.sfx.start(); },
    });
    reset();
    window.addEventListener('keydown', handler);
    const loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 17. 飞机大战 SHOOT 'EM UP
  // ============================================================
  define('shooter', {
    name: '飞机大战',
    desc: '竖版射击，躲避弹幕击落敌机',
    icon: '✈️',
    cat: 'arcade',
    controls: '← → ↑ ↓ 移动 · 空格射击 · 收集道具'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 600);
    const W = 400, H = 600;
    let player, bullets, enemies, eBullets, particles, powerups, score, lives, over, invuln;

    function reset() {
      player = { x: W/2, y: H - 60, w: 32, h: 32, power: 1 };
      bullets = []; enemies = []; eBullets = []; particles = []; powerups = [];
      score = 0; lives = 3; over = false; invuln = 0;
      updateHUD();
    }
    function spawnEnemy() {
      const r = Math.random();
      if (r < 0.7) {
        // 普通敌机
        enemies.push({ x: 20 + Math.random() * (W - 60), y: -30, w: 28, h: 28, hp: 1, type: 0, vy: 2 + Math.random() * 2 });
      } else if (r < 0.9) {
        // 射击敌机
        enemies.push({ x: 20 + Math.random() * (W - 60), y: -30, w: 32, h: 32, hp: 2, type: 1, vy: 1.5, fire: 0 });
      } else {
        // 大型机
        enemies.push({ x: 20 + Math.random() * (W - 80), y: -40, w: 48, h: 48, hp: 8, type: 2, vy: 0.8 });
      }
    }
    function update() {
      if (over) return;
      // 玩家限制
      player.x = Math.max(20, Math.min(W-20, player.x));
      player.y = Math.max(20, Math.min(H-20, player.y));
      // 子弹
      bullets.forEach(b => b.y -= 8);
      bullets = bullets.filter(b => b.y > -10);
      eBullets.forEach(b => b.y += b.vy || 4);
      eBullets = eBullets.filter(b => b.y < H + 10);
      // 敌机生成
      if (Math.random() < 0.03 + score / 5000) spawnEnemy();
      enemies.forEach(e => { e.y += e.vy; if (e.fire !== undefined && (e.fire = (e.fire || 0) + 1) % 60 === 0) eBullets.push({ x: e.x, y: e.y + e.h, vy: 5 }); });
      enemies = enemies.filter(e => e.y < H + 60);
      // 击中
      bullets.forEach(b => enemies.forEach(e => {
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.hp--; b.dead = true;
          if (e.hp <= 0) {
            e.dead = true; score += e.type === 2 ? 200 : e.type === 1 ? 50 : 20; Sounds.sfx.explode();
            // 爆炸粒子
            for (let i = 0; i < 8; i++) particles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20, color: e.type === 2 ? '#ff00ff' : '#ff8800' });
            // 道具
            if (Math.random() < 0.2) powerups.push({ x: e.x + e.w/2, y: e.y, vy: 2, type: Math.random() < 0.5 ? 'power' : 'life' });
          }
        }
      }));
      bullets = bullets.filter(b => !b.dead);
      enemies = enemies.filter(e => !e.dead);
      // 玩家被击
      if (!invuln) {
        eBullets.forEach(b => {
          if (b.x > player.x - 16 && b.x < player.x + 16 && b.y > player.y - 16 && b.y < player.y + 16) {
            b.dead = true; lives--; Sounds.sfx.hit(); invuln = 60;
            for (let i = 0; i < 12; i++) particles.push({ x: player.x, y: player.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 30, color: '#ff0066' });
            if (lives <= 0) { over = true; Sounds.sfx.gameover(); }
          }
        });
        enemies.forEach(e => {
          if (e.x < player.x + 16 && e.x + e.w > player.x - 16 && e.y < player.y + 16 && e.y + e.h > player.y - 16) {
            e.dead = true; lives--; invuln = 60; Sounds.sfx.hit();
            if (lives <= 0) { over = true; Sounds.sfx.gameover(); }
          }
        });
      }
      eBullets = eBullets.filter(b => !b.dead);
      enemies = enemies.filter(e => !e.dead);
      // 道具
      powerups.forEach(p => { p.y += p.vy; if (Math.abs(p.x - player.x) < 20 && Math.abs(p.y - player.y) < 20) { p.dead = true; if (p.type === 'power') { player.power = Math.min(3, player.power + 1); Sounds.sfx.powerup(); } else { lives = Math.min(5, lives + 1); Sounds.sfx.eat(); } } });
      powerups = powerups.filter(p => !p.dead && p.y < H + 20);
      // 粒子
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      particles = particles.filter(p => p.life > 0);
      if (invuln > 0) invuln--;
      updateHUD();
    }
    function draw() {
      // 背景滚动
      const t = Date.now() / 30;
      clear(ctx, W, H, '#0a0033');
      ctx.fillStyle = '#1a0050';
      for (let y = -50 + (t % 50); y < H; y += 50) {
        ctx.fillRect(0, y, W, 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 73 + t * 0.5) % W, sy = (i * 113 + t) % H;
        ctx.fillRect(sx, sy, 2, 2);
      }
      // 玩家
      if (!invuln || Math.floor(invuln / 4) % 2) {
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(player.x - 16, player.y - 12, 32, 24);
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x - 8, player.y - 16, 16, 8);
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(player.x - 4, player.y + 12, 4, 4);
        ctx.fillRect(player.x, player.y + 12, 4, 4);
      }
      // 子弹
      ctx.fillStyle = '#ffff00';
      bullets.forEach(b => ctx.fillRect(b.x-2, b.y-6, 4, 12));
      // 敌机
      enemies.forEach(e => {
        if (e.type === 2) ctx.fillStyle = '#ff00ff';
        else if (e.type === 1) ctx.fillStyle = '#ff8800';
        else ctx.fillStyle = '#ff0066';
        ctx.fillRect(e.x + 4, e.y, e.w - 8, e.h);
        ctx.fillRect(e.x, e.y + 8, e.w, e.h - 16);
        if (e.type === 2) { ctx.fillStyle = '#fff'; ctx.fillRect(e.x + e.w/2 - 4, e.y + 10, 8, 8); }
      });
      // 敌弹
      ctx.fillStyle = '#ff8800';
      eBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
      // 粒子
      particles.forEach(p => { ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color; ctx.fillRect(p.x-2, p.y-2, 4, 4); });
      ctx.globalAlpha = 1;
      // 道具
      powerups.forEach(p => {
        ctx.fillStyle = p.type === 'power' ? '#ffff00' : '#00ff66';
        ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
        text(ctx, p.type === 'power' ? 'P' : '+', p.x, p.y - 6, 10, '#000', 'Press Start 2P', 'center');
      });
      text(ctx, `SCORE ${score}`, 10, 10, 12, '#fff', 'Press Start 2P');
      text(ctx, `LIVES ${lives}`, W - 10, 10, 12, '#fff', 'Press Start 2P', 'right');
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `S:${score} L:${lives} POW:${player.power}`;
      status.textContent = over ? 'GAME OVER' : '';
    }
    const handler = key({
      'arrowleft': () => player.x -= 5,
      'arrowright': () => player.x += 5,
      'arrowup': () => player.y -= 5,
      'arrowdown': () => player.y += 5,
      'w': () => player.y -= 5,
      'a': () => player.x -= 5,
      's': () => player.y += 5,
      'd': () => player.x += 5,
      ' ': () => {
        if (over || !bullets) return;
        if (player.power === 1) bullets.push({ x: player.x, y: player.y - 16 });
        else if (player.power === 2) { bullets.push({ x: player.x - 8, y: player.y - 10 }); bullets.push({ x: player.x + 8, y: player.y - 10 }); }
        else { bullets.push({ x: player.x, y: player.y - 16 }); bullets.push({ x: player.x - 12, y: player.y - 8 }); bullets.push({ x: player.x + 12, y: player.y - 8 }); }
        Sounds.sfx.shoot();
      },
    });
    reset();
    window.addEventListener('keydown', handler);
    const loop = Games.tickLoop(() => { update(); draw(); }, 1000/60);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 18. 迷宫 MAZE
  // ============================================================
  define('maze', {
    name: '迷宫',
    desc: '随机生成的迷宫，从起点走到终点',
    icon: '🌀',
    cat: 'puzzle',
    controls: '方向键/WASD 移动 · R 重新生成'
  }, (stage, hud, status) => {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 400);
    const COLS = 21, ROWS = 21, CELL = 400 / COLS;
    let grid, player, end, visited;

    function generate() {
      grid = Array.from({length:ROWS}, () => Array(COLS).fill(1)); // 1=墙
      function carve(x, y) {
        grid[y][x] = 0;
        const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && grid[ny][nx] === 1) {
            grid[y + dy/2][x + dx/2] = 0;
            carve(nx, ny);
          }
        }
      }
      carve(1, 1);
      player = { x: 1, y: 1 }; end = { x: COLS - 2, y: ROWS - 2 };
      visited = Array.from({length:ROWS}, () => Array(COLS).fill(false));
      updateHUD();
    }
    function move(dx, dy) {
      const nx = player.x + dx, ny = player.y + dy;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] === 0) {
        player.x = nx; player.y = ny; Sounds.sfx.move();
        if (player.x === end.x && player.y === end.y) Sounds.sfx.win();
        updateHUD();
      }
    }
    function draw() {
      clear(ctx, 400, 400, '#000');
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] === 1) {
            // 砖墙纹理
            const px2 = x * CELL, py2 = y * CELL;
            ctx.fillStyle = (x + y) % 2 ? '#553388' : '#7744aa';
            ctx.fillRect(px2, py2, CELL, CELL);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(px2, py2, CELL, 2);
            ctx.fillRect(px2, py2, 2, CELL);
          } else {
            ctx.fillStyle = '#1a0030';
            ctx.fillRect(x*CELL, y*CELL, CELL, CELL);
          }
        }
      // 终点
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(end.x * CELL + 2, end.y * CELL + 2, CELL - 4, CELL - 4);
      text(ctx, 'END', end.x * CELL + CELL/2, end.y * CELL + CELL/2 - 6, 8, '#000', 'Press Start 2P', 'center');
      // 玩家
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(player.x * CELL + 2, player.y * CELL + 2, CELL - 4, CELL - 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(player.x * CELL + CELL/2 - 2, player.y * CELL + CELL/2 - 2, 2, 2);
      ctx.fillRect(player.x * CELL + CELL/2 + 2, player.y * CELL + CELL/2 - 2, 2, 2);
    }
    function updateHUD() {
      hud.querySelector('.hud-score').textContent = `${player.x},${player.y}`;
      status.textContent = (player.x === end.x && player.y === end.y) ? 'ARRIVED!' : '';
    }
    const handler = key({
      'arrowup': () => move(0, -1), 'w': () => move(0, -1),
      'arrowdown': () => move(0, 1), 's': () => move(0, 1),
      'arrowleft': () => move(-1, 0), 'a': () => move(-1, 0),
      'arrowright': () => move(1, 0), 'd': () => move(1, 0),
      'r': () => { generate(); Sounds.sfx.start(); },
    });
    generate();
    window.addEventListener('keydown', handler);
    const loop = Games.tickLoop(draw, 1000/30);
    return () => { loop(); window.removeEventListener('keydown', handler); };
  });

  // ============================================================
  // 19. 黑白棋 REVERSI
  // ============================================================
  define('reversi', {
    name: '黑白棋',
    desc: '围吃对方棋子，棋盘占多者胜',
    icon: '◐',
    cat: 'strategy',
    controls: '点击落子 · 围住对手棋子即可翻转'
  }, (stage, hud, status) => {
    const N = 8;
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    const ctx = fitCanvas(canvas, 400, 400);
    const CELL = 400 / N;
    let board, turn, over, scores;

    function reset() {
      board = Array.from({length:N}, () => Array(N).fill(null));
      board[3][3] = 'W'; board[4][4] = 'W';
      board[3][4] = 'B'; board[4][3] = 'B';
      turn = 'B'; over = false;
      updateHUD();
    }
    function getFlips(x, y, who) {
      if (board[y][x]) return [];
      const opp = who === 'B' ? 'W' : 'B';
      const flips = [];
      const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dx, dy] of dirs) {
        const line = [];
        let nx = x + dx, ny = y + dy;
        while (nx >= 0 && nx < N && ny >= 0 && ny < N && board[ny][nx] === opp) {
          line.push({x:nx, y:ny});
          nx += dx; ny += dy;
        }
        if (line.length && nx >= 0 && nx < N && ny >= 0 && ny < N && board[ny][nx] === who) {
          flips.push(...line);
        }
      }
      return flips;
    }
    function hasMove(who) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (getFlips(x, y, who).length) return true;
      return false;
    }
    function move(x, y) {
      if (over || board[y][x]) return;
      const flips = getFlips(x, y, turn);
      if (!flips.length) { Sounds.sfx.deny(); return; }
      board[y][x] = turn; Sounds.sfx.place();
      flips.forEach(p => board[p.y][p.x] = turn);
      turn = turn === 'B' ? 'W' : 'B';
      // 检查对手有无可走
      if (!hasMove(turn)) {
        turn = turn === 'B' ? 'W' : 'B';
        if (!hasMove(turn)) { over = true; Sounds.sfx.gameover(); }
      }
      updateHUD();
    }
    function updateHUD() {
      let b = 0, w = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] === 'B') b++; else if (board[y][x] === 'W') w++;
      hud.querySelector('.hud-score').textContent = `B:${b} W:${w}`;
      if (over) {
        status.textContent = b > w ? 'BLACK WIN!' : b < w ? 'WHITE WIN!' : 'DRAW';
      } else {
        status.textContent = `TURN: ${turn === 'B' ? 'BLACK' : 'WHITE'}`;
      }
    }
    function draw() {
      clear(ctx, 400, 400, '#006633');
      ctx.strokeStyle = '#003300'; ctx.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        ctx.beginPath(); ctx.moveTo(i*CELL, 0); ctx.lineTo(i*CELL, 400); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*CELL); ctx.lineTo(400, i*CELL); ctx.stroke();
      }
      // 提示可落子位置
      if (!over) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (getFlips(x, y, turn).length) {
            ctx.fillStyle = turn === 'B' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
            ctx.fillRect(x*CELL + CELL/2 - 4, y*CELL + CELL/2 - 4, 8, 8);
          }
        }
      }
      // 棋子
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!board[y][x]) continue;
          const cx = x*CELL + CELL/2, cy = y*CELL + CELL/2;
          const grad = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, 18);
          if (board[y][x] === 'B') { grad.addColorStop(0, '#666'); grad.addColorStop(1, '#000'); }
          else { grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#aaa'); }
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2); ctx.fill();
        }
    }
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * N);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * N);
      if (over) { reset(); return; }
      move(x, y);
    };
    canvas.addEventListener('click', onClick);
    reset();
    const loop = Games.tickLoop(draw, 1000/30);
    return () => { loop(); canvas.removeEventListener('click', onClick); };
  });

  // ============================================================
  // 20. 数独 SUDOKU
  // ============================================================
  define('sudoku', {
    name: '数独',
    desc: '经典 9×9 逻辑填数，独一无二',
    icon: '🔲',
    cat: 'puzzle',
    controls: '点击格子 + 数字键填数 · 空格清空'
  }, (stage, hud, status) => {
    const N = 9;
    const container = document.createElement('div');
    container.style.cssText = 'background:#0a0014;padding:8px;border:3px solid #00ffff;box-shadow:6px 6px 0 #ff00ff;width:max-content;margin:0 auto;';
    stage.appendChild(container);

    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${N},44px);grid-template-rows:repeat(${N},44px);gap:0;`;
    container.appendChild(grid);

    let cells = [];
    let solution, puzzle, given, selected;

    function makePuzzle() {
      // 生成完整解
      solution = Array.from({length:N}, () => Array(N).fill(0));
      fillGrid(solution);
      // 挖洞
      puzzle = solution.map(r => [...r]);
      given = puzzle.map(r => r.map(v => v !== 0));
      const holes = 45;
      for (let i = 0; i < holes; i++) {
        let x, y;
        do { x = Math.floor(Math.random()*N); y = Math.floor(Math.random()*N); } while (puzzle[y][x] === 0);
        puzzle[y][x] = 0; given[y][x] = false;
      }
      selected = null;
      render();
    }
    function fillGrid(g) {
      const empty = findEmpty(g);
      if (!empty) return true;
      const [x, y] = empty;
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
      for (const n of nums) {
        if (isValid(g, x, y, n)) {
          g[y][x] = n;
          if (fillGrid(g)) return true;
          g[y][x] = 0;
        }
      }
      return false;
    }
    function findEmpty(g) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) return [x, y];
      return null;
    }
    function isValid(g, x, y, n) {
      for (let i = 0; i < N; i++) if (g[y][i] === n || g[i][x] === n) return false;
      const sx = Math.floor(x/3)*3, sy = Math.floor(y/3)*3;
      for (let yy = sy; yy < sy+3; yy++) for (let xx = sx; xx < sx+3; xx++) if (g[yy][xx] === n) return false;
      return true;
    }
    function checkComplete() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (puzzle[y][x] !== solution[y][x]) return false;
      return true;
    }
    function render() {
      grid.innerHTML = '';
      cells = [];
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const c = document.createElement('div');
          const isGiven = given[y][x];
          const isSel = selected && selected.x === x && selected.y === y;
          const val = puzzle[y][x];
          const sameAsSol = val === solution[y][x];
          const wrong = val !== 0 && !sameAsSol;
          const borderRight = (x+1) % 3 === 0 && x < 8 ? '3px' : '1px';
          const borderBottom = (y+1) % 3 === 0 && y < 8 ? '3px' : '1px';
          c.style.cssText = `
            width:44px;height:44px;display:flex;align-items:center;justify-content:center;
            font-family:'Press Start 2P';font-size:14px;cursor:${isGiven ? 'default' : 'pointer'};
            background:${isSel ? '#ffff00' : ((Math.floor(x/3)+Math.floor(y/3)) % 2 ? '#2d0050' : '#1a0030')};
            color:${isGiven ? '#00ffff' : wrong ? '#ff0066' : sameAsSol ? '#ffffff' : '#ff8800'};
            border-top:1px solid #444;border-left:1px solid #444;
            border-right:${borderRight} solid #ff00ff;border-bottom:${borderBottom} solid #ff00ff;
          `;
          c.textContent = val || '';
          if (!isGiven) c.addEventListener('click', () => { selected = {x,y}; Sounds.sfx.click(); render(); });
          grid.appendChild(c); cells.push(c);
        }
      updateHUD();
    }
    function updateHUD() {
      let filled = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (puzzle[y][x]) filled++;
      hud.querySelector('.hud-score').textContent = `${filled}/${N*N}`;
      if (checkComplete()) status.textContent = 'SOLVED! 🎉';
      else status.textContent = '';
    }
    const handler = key({
      '1': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 1; Sounds.sfx.beep(); render(); }},
      '2': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 2; Sounds.sfx.beep(); render(); }},
      '3': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 3; Sounds.sfx.beep(); render(); }},
      '4': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 4; Sounds.sfx.beep(); render(); }},
      '5': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 5; Sounds.sfx.beep(); render(); }},
      '6': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 6; Sounds.sfx.beep(); render(); }},
      '7': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 7; Sounds.sfx.beep(); render(); }},
      '8': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 8; Sounds.sfx.beep(); render(); }},
      '9': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 9; Sounds.sfx.beep(); render(); }},
      '0': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 0; Sounds.sfx.beep(); render(); }},
      ' ': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 0; Sounds.sfx.beep(); render(); }},
      'backspace': () => { if (selected && !given[selected.y][selected.x]) { puzzle[selected.y][selected.x] = 0; Sounds.sfx.beep(); render(); }},
      'r': () => { Sounds.sfx.start(); makePuzzle(); },
    });
    makePuzzle();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // tickLoop: setInterval 的 rAF 替代，同样在后台暂停
  function tickLoop(fn, intervalMs) {
    if (typeof intervalMs !== 'number' || intervalMs <= 0) intervalMs = 16;
    let last = 0;
    let rafId = 0;
    let stopped = false;
    function frame(t) {
      if (stopped) return;
      if (!document.hidden && t - last >= intervalMs) {
        last = t;
        try { fn(t); } catch (e) { console.error('tick loop error', e); }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(rafId); };
  }

  return { list, get, count, define, fitCanvas, clear, rect, pxrect, text, key, loop, tickLoop, safeEval };
})();
// 暴露到 window，便于 app.js (ES Module) 在 fallback 路径访问老注册表。
// 顶层 const 在经典脚本间共享词法作用域，但对 ES Module 不可见，必须显式挂到 window。
window.Games = Games;
