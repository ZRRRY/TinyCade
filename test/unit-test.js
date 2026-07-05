// TINYCADE 单元测试：engine 模块
// rng 确定性、recorder 录制/回放、input 快照边沿。

const { pathToFileURL } = require('url');
const path = require('path');

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

const root = path.join(__dirname, '..');
async function importEngine(name) {
  return import(pathToFileURL(path.join(root, 'engine', name + '.js')).href);
}

async function main() {
  const { makeRng, seedFrom } = await importEngine('rng');
  const { replay, hashState, createRecorder, encodeFrames, decodeFrames } = await importEngine('recorder');
  const { BTN } = await importEngine('input');
  const { pulse, flash, pixelText, centerText, strokeGrid } = await importEngine('draw');

  // === rng ===
  console.log('--- rng ---');
  const r1 = makeRng(12345);
  const r2 = makeRng(12345);
  const seq1 = [r1(), r1.int(100), r1.range(10, 20), r1.pick(['a', 'b', 'c'])];
  const seq2 = [r2(), r2.int(100), r2.range(10, 20), r2.pick(['a', 'b', 'c'])];
  ok('same seed -> same sequence', JSON.stringify(seq1) === JSON.stringify(seq2));

  const r3 = makeRng(12345);
  const stateBefore = r3.getState();
  r3();
  r3.setState(stateBefore);
  ok('setState restores determinism', r3() === seq1[0]);

  ok('seedFrom is deterministic', seedFrom('2026-07-05') === seedFrom('2026-07-05'));
  ok('seedFrom differs by input', seedFrom('2026-07-05') !== seedFrom('2026-07-06'));

  // === recorder ===
  console.log('--- recorder ---');
  const rec = createRecorder();
  const held = Object.fromEntries(BTN.map((k) => [k, false]));
  held.right = true;
  rec.record(0, { held });
  held.right = false; held.down = true;
  rec.record(5, { held });
  const tape = rec.export(999);
  ok('recorder exports seed', tape.seed === 999);
  ok('recorder coalesces duplicate frames', tape.frames.length === 2);
  ok('recorder export includes maxTicks', tape.maxTicks === 6);

  // === encodeFrames / decodeFrames ===
  console.log('--- encode/decode ---');
  const roundFrames = [
    { tick: 0, held: Object.fromEntries(BTN.map((k) => [k, k === 'right'])) },
    { tick: 5, held: Object.fromEntries(BTN.map((k) => [k, k === 'right' || k === 'a'])) },
    { tick: 6, held: Object.fromEntries(BTN.map((k) => [k, false])) }
  ];
  const enc = encodeFrames(roundFrames);
  ok('encodeFrames produces non-empty string', enc.length > 0);
  ok('encodeFrames is URL-safe', !/[+=/]/.test(enc));
  const dec = decodeFrames(enc);
  ok('decodeFrames round-trips length', dec.length === roundFrames.length);
  ok('decodeFrames round-trips ticks', JSON.stringify(dec.map(f => f.tick)) === JSON.stringify(roundFrames.map(f => f.tick)));
  ok('decodeFrames round-trips held', JSON.stringify(dec.map(f => f.held)) === JSON.stringify(roundFrames.map(f => f.held)));

  const allButtons = Object.fromEntries(BTN.map((k) => [k, true]));
  const full = [{ tick: 0, held: allButtons }];
  ok('all buttons mask round-trip', JSON.stringify(decodeFrames(encodeFrames(full))) === JSON.stringify(full));

  // === hashState ===
  console.log('--- hashState ---');
  const h1 = hashState({ a: 1, b: [2, 3] });
  const h2 = hashState({ a: 1, b: [2, 3] });
  const h3 = hashState({ a: 1, b: [2, 4] });
  ok('hashState deterministic', h1 === h2);
  ok('hashState sensitive', h1 !== h3);

  // === draw.js ===
  console.log('--- draw ---');
  ok('pulse is deterministic', pulse(5, 2, 0.3, 1) === pulse(5, 2, 0.3, 1));
  ok('pulse amplitude bounded', Math.abs(pulse(7, 3, 0.3, 0)) <= 3);

  function makeFakeCtx() {
    const calls = [];
    const log = (m, ...args) => calls.push({ method: m, args });
    return {
      calls,
      save: () => log('save'),
      restore: () => log('restore'),
      fillRect: (x, y, w, h) => log('fillRect', x, y, w, h),
      fillText: (t, x, y) => log('fillText', t, x, y),
      beginPath: () => log('beginPath'),
      moveTo: (x, y) => log('moveTo', x, y),
      lineTo: (x, y) => log('lineTo', x, y),
      stroke: () => log('stroke'),
    };
  }

  const fctx = makeFakeCtx();
  flash(fctx, 400, 400, 0.5, '#ff0000');
  ok('flash no-op when alpha <= 0', (() => { const c = makeFakeCtx(); flash(c, 100, 100, 0); return c.calls.length === 0; })());
  ok('flash sets fillStyle and fills full rect', fctx.calls.some(c => c.method === 'fillRect' && c.args[2] === 400 && c.args[3] === 400));

  const tctx = makeFakeCtx();
  pixelText(tctx, 'HI', 10, 20, '#00ffff', 24);
  ok('pixelText calls fillText', tctx.calls.some(c => c.method === 'fillText' && c.args[0] === 'HI'));

  const cctx = makeFakeCtx();
  centerText(cctx, 'CENTER', 200, 50, '#fff', 32);
  ok('centerText aligns center', cctx.calls.some(c => c.method === 'fillText' && c.args[0] === 'CENTER'));

  const gctx = makeFakeCtx();
  strokeGrid(gctx, { x: 0, y: 0, cols: 2, rows: 2, cell: 10, color: '#fff' });
  ok('strokeGrid calls stroke', gctx.calls.some(c => c.method === 'stroke'));
  ok('strokeGrid draws vertical + horizontal lines', gctx.calls.filter(c => c.method === 'moveTo').length >= 6);

  // === router ===
  console.log('--- router ---');
  const { parseHash } = await import(pathToFileURL(path.join(root, 'engine', 'router.js')).href);
  ok('parseHash empty -> library', parseHash('').type === 'library');
  ok('parseHash # -> library', parseHash('#').type === 'library');
  ok('parseHash #view-library -> library', parseHash('#view-library').type === 'library');
  ok('parseHash #/ -> library', parseHash('#/').type === 'library');
  const snakeRoute = parseHash('#/snake');
  ok('parseHash #/snake path', snakeRoute.type === 'route' && snakeRoute.path === 'snake');
  const replayRoute = parseHash('#/replay?g=snake&s=123');
  ok('parseHash #/replay path', replayRoute.type === 'route' && replayRoute.path === 'replay');
  ok('parseHash #/replay params g', replayRoute.params.get('g') === 'snake');
  ok('parseHash #/replay params s', replayRoute.params.get('s') === '123');
  const dailyRoute = parseHash('#/daily');
  ok('parseHash #/daily path', dailyRoute.type === 'route' && dailyRoute.path === 'daily');

  // === replay with a tiny fake game ===
  console.log('--- replay ---');
  const fakeModule = {
    default: {
      tickHz: 10,
      create(rng, api) {
        let x = 0, over = false;
        return {
          events: [],
          get over() { return over; },
          update(input) {
            if (input.held.right) x++;
            if (input.pressed.a) x += 10;
            if (x >= 20) over = true;
          },
          serialize() { return { x, over }; }
        };
      }
    }
  };
  const fakeTape = {
    seed: 1,
    frames: [
      { tick: 0, held: { right: true } },
      { tick: 5, held: { right: true, a: true } },
      { tick: 6, held: { right: true } }
    ]
  };
  const final = replay(fakeModule, fakeTape, 100);
  ok('replay returns serialized state', typeof final === 'object' && final.over === true);

  console.log('\nUnit: ' + passed + ' pass / ' + failed + ' fail');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('Unit test crash:', e); process.exit(1); });
