/* ============================================================
   engine/engine.js — 固定步长循环（§4.3）
   固定步长 + 累加器 + 后台暂停(document.hidden) + 补帧上限。
   调用顺序：input.sample() → recorder.record → game.update
             → 派发 game.events → render(ctx, alpha)。
   暂停由外壳拦截 input.pressed.start 边沿处理（不进 update，
   保证确定性）。
   ============================================================ */

import { createInput } from './input.js';

// game: { tickHz, update(input), render(ctx, alpha), events?:[] }
export function runGame(game, ctx, opts = {}) {
  const input = opts.input || createInput();
  const tickInterval = 1000 / (game.tickHz || 60);
  let acc = 0, last = performance.now(), raf = 0, stopped = false, tick = 0;
  const recorder = opts.recorder || null;

  function frame(t) {
    if (stopped) return;
    if (document.hidden) { raf = requestAnimationFrame(frame); return; } // 后台暂停,acc 不累加
    acc += Math.min(t - last, 250); last = t;                            // 限制补帧上限
    while (acc >= tickInterval) {
      const snap = input.sample();
      if (recorder) recorder.record(tick, snap);
      // 包裹 update 避免游戏 bug 摧毁整个帧循环; 错误记录到 console,继续下一 tick。
      try { game.update(snap); } catch (e) { console.error('[engine] game.update threw', e); }
      // 暂停由游戏/外壳拦截 (input.pressed.start 边沿)
      if (game.events && game.events.length) {                            // 音效派发
        if (!opts.headless && opts.onEvent) game.events.forEach(opts.onEvent);
        game.events.length = 0;
      }
      acc -= tickInterval; tick++;
    }
    game.render(ctx, acc / tickInterval);                                 // alpha 供插值
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); if (!opts.input) input.destroy(); };
}
