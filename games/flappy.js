/* ============================================================
   games/flappy.js — 像素鸟（action）
   - 原版 games.js:366 — 经典 Flappy Bird：点一下飞一下
   - 输入：a (空格/点击) 拍翅膀；按下时 ready→play、over→reset
   - 决定论：管道间隔与管道间隙由 rng 驱动，无时间相关 API
   ============================================================ */

export default {
  meta: {
    id: 'flappy',
    name: '像素鸟',
    desc: '小鸟穿管道，点一下飞一下',
    icon: '🐦',
    cat: 'action',
    controls: '空格/点击/触屏 跳跃 · 撞到管道就重来',
    width: 400,
    height: 500,
  },
  tickHz: 60,

  create(rng, api) {
    const W = 400, H = 500, GROUND_H = 60;
    const PIPE_W = 60, PIPE_GAP = 140, PIPE_INTERVAL = 90;

    let bird, pipes, score, frame, state, ground, over;

    function reset() {
      bird = { x: 80, y: 250, vy: 0, r: 12 };
      pipes = []; score = 0; frame = 0; state = 'ready'; ground = 0;
      over = false;
    }

    function flap() {
      if (state === 'ready') { state = 'play'; api.emit('start'); }
      if (state === 'play') { bird.vy = -7; api.emit('jump'); }
      if (state === 'over') { reset(); state = 'ready'; api.emit('start'); }
    }

    reset();

    const events = [];
    api.emit = (s) => events.push(s);

    return {
      events,
      get over() { return over; },
      update(input) {
        // 输入：a 边沿（press）触发拍翅
        if (input.pressed.a) flap();
        if (state !== 'play') { frame++; ground = (ground + 3) % 24; return; }
        frame++;
        bird.vy += 0.35; bird.y += bird.vy;
        ground = (ground + 3) % 24;

        // 生成管道（间隔固定，topH 来自 rng）
        if (frame % PIPE_INTERVAL === 0) {
          const topH = 60 + rng.range(0, 200);
          pipes.push({ x: W, topH, scored: false });
        }
        pipes.forEach((p) => { p.x -= 2.5; });
        pipes = pipes.filter((p) => p.x + PIPE_W > 0);

        // 碰撞地面
        if (bird.y + bird.r >= H - GROUND_H) {
          bird.y = H - GROUND_H - bird.r;
          state = 'over'; over = true; api.emit('gameover'); return;
        }
        // 碰撞管道 + 得分
        for (const p of pipes) {
          if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
            if (bird.y - bird.r < p.topH || bird.y + bird.r > p.topH + PIPE_GAP) {
              state = 'over'; over = true; api.emit('hit'); return;
            }
          }
          if (!p.scored && p.x + PIPE_W < bird.x) {
            p.scored = true; score++; api.emit('blip');
          }
        }
      },
      render(ctx) {
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
        pipes.forEach((p) => {
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
        ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vy * 0.05)));
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-12, -10, 24, 20);
        ctx.fillRect(-8, -14, 16, 4);
        ctx.fillStyle = '#ff8800';
        const wingFlap = Math.sin(frame * 0.3) * 4;
        ctx.fillRect(-6, -2 + wingFlap, 12, 8);
        ctx.fillStyle = '#fff'; ctx.fillRect(4, -6, 6, 6);
        ctx.fillStyle = '#000'; ctx.fillRect(6, -4, 3, 3);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, -2, 6, 4);
        ctx.fillRect(12, 0, 4, 2);
        ctx.restore();

        // 分数
        ctx.fillStyle = '#fff'; ctx.font = '48px "Press Start 2P", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(String(score), W / 2, 40);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.strokeText(String(score), W / 2, 40);

        // 状态文字
        if (state === 'ready') {
          ctx.fillStyle = '#ffff00'; ctx.font = '18px "Press Start 2P", monospace';
          ctx.fillText('TAP TO START', W / 2, H / 2 - 20);
        } else if (state === 'over') {
          ctx.fillStyle = '#ff0066'; ctx.font = '24px "Press Start 2P", monospace';
          ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
          ctx.fillStyle = '#00ffff'; ctx.font = '14px "Press Start 2P", monospace';
          ctx.fillText('TAP TO RESTART', W / 2, H / 2 + 10);
        }
      },
      serialize() { return { score, frame, state, over }; },
    };
  },
};