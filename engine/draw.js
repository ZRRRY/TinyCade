/* ============================================================
   engine/draw.js — 公共绘制原语（§6 阶段 3 沉淀）
   高频 low-level 帮手：每个函数只做一件事，无内部状态、不发明新概念。
   仍把 ctx 交给调用者，调用者自己控制 save/beginPath/字体等上下文。
   零依赖 · 原生 ESM · Node 18+ 与浏览器共用。
   ============================================================ */

// 画网格线（20x20 蛇、10x20 俄罗斯方块、围棋、扫雷等）。
//   opts: { x=0, y=0, cols, rows, cell, color, alpha=1, lineWidth=1 }
export function strokeGrid(ctx, opts) {
  const { x = 0, y = 0, cols, rows, cell, color, alpha = 1, lineWidth = 1 } = opts;
  const w = cols * cell, h = rows * cell;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i <= cols; i++) {
    const px = x + i * cell + 0.5; // +0.5 让 1px 线在像素格上不糊
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
  }
  for (let j = 0; j <= rows; j++) {
    const py = y + j * cell + 0.5;
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
  }
  ctx.stroke();
  ctx.restore();
}

// 像素风文字（默认 VT323 致敬 retro）。不做字距/换行——retro 风一般不需要。
//   size: 像素字高（与 CANVAS_SIZE 比例自定，常用 14~28）
export function pixelText(ctx, text, x, y, color, size = 16, font = 'VT323, monospace') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

// 居中文字。cx = 画布/区域中心 x 坐标。
export function centerText(ctx, text, cx, y, color, size = 16, font = 'VT323, monospace') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText(String(text), cx, y);
  ctx.restore();
}

// 脉动数值（确定性，依赖 tick 计数；不引入时间）。
//   - tick:    逻辑步计数（由 update 内的 frame 计数器传入）
//   - amp:     振幅（返回范围 [-amp, +amp]）
//   - freq:    频率（每 tick 弧度，默认 ~0.3 ≈ 蛇的食物脉动节奏）
//   - phase:   相位偏移（多对象并存时错开用）
export function pulse(tick, amp = 1, freq = 0.3, phase = 0) {
  return Math.sin(tick * freq + phase) * amp;
}

// 整屏闪烁：覆盖一层指定颜色，alpha 控制强度。
//   - 用于"击中/受伤/吃到道具"等一次性反馈；不污染逻辑（render only）。
//   - alpha=0 时 no-op（高频调用零开销）。
export function flash(ctx, w, h, alpha, color = '#fff') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
