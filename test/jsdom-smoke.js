// TINYCADE lightweight DOM smoke
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  PASS ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`); }
}

function makeElement(tag) {
  const el = {
    children: [], childNodes: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, attributes: {}, listeners: {},
    _qCache: {},
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); this.childNodes = this.childNodes.filter(x => x !== c); return c; },
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    removeEventListener() {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    querySelector(sel) {
      if (this._qCache[sel]) return this._qCache[sel];
      const child = makeElement('span');
      this._qCache[sel] = child;
      return child;
    },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {},
    getContext() { return new Proxy({}, { get: () => () => ({}) }); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 480 }; },
    width: 480, height: 480,
    innerHTML: '', textContent: '', value: ''
  };
  Object.defineProperty(el, 'tagName', { get() { return (tag || 'div').toUpperCase(); } });
  return el;
}

const fakeDoc = {
  readyState: 'complete',
  hidden: false,
  addEventListener() {}, removeEventListener() {},
  getElementById(id) { return makeElement(['input','button','span'].includes(id) ? id : 'div'); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(tag) { return makeElement(tag); },
  body: makeElement('body')
};

const fakeWindow = {
  devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
  innerWidth: 1024, innerHeight: 768,
  AudioContext: undefined, webkitAudioContext: undefined,
  requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
  TINYCADE_VERSION: 'test', TINYCADE_BUILD: 'test'
};
fakeWindow.document = fakeDoc;
fakeWindow.window = fakeWindow;

const sandbox = {
  window: fakeWindow,
  document: fakeDoc,
  console,
  Math, Date, JSON, Number, Array, Object, String, Boolean, Error, Promise, Map, Set, Symbol, RegExp, performance,
  setTimeout, clearTimeout, setInterval, clearInterval,
  parseInt, parseFloat, isNaN, isFinite,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
};
sandbox.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
sandbox.cancelAnimationFrame = (id) => clearTimeout(id);
sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);

function loadScript(file) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const wrap = code + '\n\nglobalThis.__exports = globalThis.__exports || {};\ntry { globalThis.__exports.Sounds = Sounds; } catch(e) {}\ntry { globalThis.__exports.Games = Games; } catch(e) {}\n';
  vm.runInContext(wrap, ctx, { filename: file });
}

try {
  loadScript('version.js');
  loadScript('sounds.js');
  loadScript('games.js');
  loadScript('games-extra.js');

  const exports = ctx.__exports || {};
  ok('Sounds exposed', typeof exports.Sounds === 'object');
  ok('Games exposed', typeof exports.Games === 'object');
  if (typeof exports.Sounds !== 'object' || typeof exports.Games !== 'object') {
    console.log('\nJS smoke: ' + passed + ' pass / ' + failed + ' fail');
    process.exit(1);
  }

  const Sounds = exports.Sounds;
  const Games = exports.Games;

  ok('Sounds.sfx', typeof Sounds.sfx === 'object');
  ok('Sounds.sfx.start', typeof Sounds.sfx.start === 'function');
  ok('Games.list is function', typeof Games.list === 'function');
  const all = Games.list();
  ok('game count >= 100', all.length >= 100, 'actual=' + all.length);
  ok('Games.loop available', typeof Games.loop === 'function');
  ok('Games.count available', typeof Games.count === 'function');
  ok('count() matches', Games.count() === all.length);

  // Verify each game has a name, desc, icon, cat, controls, factory
  let schemaOk = 0, schemaFail = [];
  for (const g of all) {
    if (typeof g.id !== 'string' || typeof g.name !== 'string' || typeof g.desc !== 'string' ||
        typeof g.icon !== 'string' || typeof g.cat !== 'string' || typeof g.controls !== 'string' ||
        typeof g.factory !== 'function') {
      schemaFail.push(g.id || '(no id)');
    } else {
      schemaOk++;
    }
  }
  ok('every game has required meta + factory', schemaFail.length === 0, 'fail=' + schemaFail.join(','));

  // Try running a representative sample
  const sample = ['snake','tetris','flappy','minesweeper','g2048','pong','gomoku','dino','fruitninja','sudoku','memory','reaction','reversi'];
  let ran = 0, ranFail = [];
  for (const id of sample) {
    const g = Games.get(id);
    if (!g) { ranFail.push(id + ':missing'); continue; }
    try {
      const stage = makeElement('div'); const hud = makeElement('div'); const status = makeElement('span');
      const c = g.factory(stage, hud, status);
      ran++;
      if (typeof c === 'function') { try { c(); } catch(e) {} }
    } catch (e) {
      ranFail.push(id + ':' + e.message);
    }
  }
  ok('sample factories ran', ran === sample.length, 'ran=' + ran + ' of ' + sample.length);
  ok('no factory errors', ranFail.length === 0, ranFail.join(';'));
} catch (e) {
  console.error('JS load crash:', e.message);
  failed++;
}

console.log('\nJS smoke: ' + passed + ' pass / ' + failed + ' fail');
process.exit(failed ? 1 : 0);
