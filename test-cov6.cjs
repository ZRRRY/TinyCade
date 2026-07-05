const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const GAMES_DIR = path.resolve('games');
const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && f !== 'manifest.js' && f !== '_extract-manifest.cjs' && f !== 'mathrush.js');
const rngMod = require('./engine/rng.js');

const noop = () => {};
const gradientObj = { addColorStop: noop };
function makeFakeCtx() {
  const ctx = { canvas: { width: 400, height: 400 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px monospace',
    textAlign: 'left', textBaseline: 'top', globalAlpha: 1,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    fill: noop, stroke: noop, save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    fillText: noop, strokeText: noop, measureText: () => ({ width: 10 }),
    createLinearGradient: () => gradientObj, createRadialGradient: () => gradientObj, createPattern: () => gradientObj,
    drawImage: noop, getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: noop, setTransform: noop, resetTransform: noop, transform: noop,
  };
  return new Proxy(ctx, { get(t, k) { if (k in t) return t[k]; return noop; }, set(t, k, v) { t[k] = v; return true; } });
}
function makeFakeInput() {
  const held = { up:false, down:false, left:false, right:false, a:false, b:false, start:false, select:false };
  const pressed = { up:false, down:false, left:false, right:false, a:false, b:false, start:false, select:false };
  return { held, pressed, sample() { return { held: {...held}, pressed: {...pressed} }; } };
}

(async () => {
  const issues = [];
  for (const f of files) {
    const url = pathToFileURL(path.join(GAMES_DIR, f)).href;
    let mod, def;
    try { mod = await import(url); def = mod.default; } catch (e) { continue; }
    if (!def || !def.create) continue;
    
    // Test: long sequence to find late-occurring bugs
    let error = null;
    try {
      const rng = rngMod.makeRng(98765);
      const inst = def.create(rng, { emit: () => {} });
      for (let i = 0; i < 1500; i++) {
        const input = makeFakeInput();
        // Vary inputs
        if (i % 50 === 0) input.pressed.a = true;
        if (i % 70 === 0) input.pressed.b = true;
        if (i % 30 === 0) input.pressed.left = true;
        if (i % 40 === 0) input.pressed.right = true;
        if (i % 60 === 0) input.pressed.up = true;
        if (i % 80 === 0) input.pressed.down = true;
        inst.update(input);
        if (inst.over) break;
      }
      inst.render(makeFakeCtx());
    } catch (e) { error = e; }
    if (error) issues.push(f + ': ' + error.message);
  }
  console.log('Total issues:', issues.length);
  for (const i of issues) console.log('  ' + i);
})();
