// TINYCADE - 游戏工厂清理完整性审计 (简化版, 每个游戏 cleanup 后立即验证)
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; }
  else { failed++; console.log("  FAIL " + name + (detail ? " :: " + detail : "")); }
}

function makeElement() {
  const el = {
    children: [], childNodes: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, attributes: {}, listeners: {}, _qCache: {},
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); this.childNodes = this.childNodes.filter(x => x !== c); return c; },
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    removeEventListener(ev, fn) { if (this.listeners[ev]) this.listeners[ev] = this.listeners[ev].filter(f => f !== fn); },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    querySelector(sel) { if (!this._qCache[sel]) this._qCache[sel] = makeElement(); return this._qCache[sel]; },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {},
    getContext() { return new Proxy({}, { get: () => () => ({}) }); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 480 }; },
    width: 480, height: 480,
    innerHTML: "", textContent: "", value: ""
  };
  Object.defineProperty(el, "tagName", { get() { return "DIV"; } });
  return el;
}
const fakeDoc = {
  readyState: "complete", hidden: true,  // 关键: hidden=true 让 rAF loop 不执行
  addEventListener() {}, removeEventListener() {},
  getElementById() { return makeElement(); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(t) { return makeElement(t); },
  body: makeElement()
};
const fakeWindow = {
  devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
  innerWidth: 1024, innerHeight: 768, AudioContext: function AudioContext() { throw new Error('mock'); }, webkitAudioContext: undefined,
  TINYCADE_VERSION: "test", TINYCADE_BUILD: "test",
  _listeners: {}
};
fakeWindow.addEventListener = (ev, fn) => { (fakeWindow._listeners[ev] = fakeWindow._listeners[ev] || []).push(fn); };
fakeWindow.removeEventListener = (ev, fn) => { if (fakeWindow._listeners[ev]) fakeWindow._listeners[ev] = fakeWindow._listeners[ev].filter(f => f !== fn); };
fakeWindow.document = fakeDoc;
fakeWindow.window = fakeWindow;
const sandbox = {
  window: fakeWindow, document: fakeDoc, console: { log: console.log.bind(console), warn: () => {}, error: () => {}, info: console.info.bind(console) },
  Math, Date, JSON, Number, Array, Object, String, Boolean, Error, Promise, Map, Set, Symbol, RegExp, performance,
  setTimeout, clearTimeout, setInterval, clearInterval,
  parseInt, parseFloat, isNaN, isFinite,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
};
// rAF mock 返回 id, callback 不立即调用
let _rafSeq = 0;
sandbox.requestAnimationFrame = (cb) => { const id = ++_rafSeq; sandbox._pending = sandbox._pending || {}; sandbox._pending[id] = cb; return id; };
sandbox.cancelAnimationFrame = (id) => { if (sandbox._pending) delete sandbox._pending[id]; };
sandbox.self = sandbox;
const ctx = vm.createContext(sandbox);
function load(file) {
  const code = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const wrap = code + "\n\nglobalThis.__exports = globalThis.__exports || {};\ntry { globalThis.__exports.Sounds = Sounds; } catch (e) {}\ntry { globalThis.__exports.Games = Games; } catch (e) {}\n";
  vm.runInContext(wrap, ctx, { filename: file });
}
load("version.js");
load("sounds.js");
load("games.js");
load("games-extra.js");
const G = ctx.__exports.Games;
const Sounds = ctx.__exports.Sounds; 
ok("Games exposed", !!G);
ok("Sounds exposed", !!Sounds);
if (!G) process.exit(1);
const allGames = G.list();
ok("Games list has 100+ games", allGames.length >= 100, "got " + allGames.length);
let factoryErrors = 0;
let factoriesWithCleanup = 0;
let factoriesWithoutCleanup = 0;
let leakedWindowListeners = 0;
const leakedIds = [];
const noCleanupIds = [];
const errorIds = [];
for (const meta of allGames) {
  const stage = makeElement();
  const hud = makeElement();
  const status = makeElement();
  const beforeWin = (() => { let n = 0; for (const k in fakeWindow._listeners) n += (fakeWindow._listeners[k] || []).length; return n; })();
  const beforeStage = stage.children.length;
  let cleanup;
  try {
    cleanup = meta.factory(stage, hud, status);
  } catch (e) {
    factoryErrors++;
    if (errorIds.length < 5) errorIds.push(meta.id + ": " + e.message);
    continue;
  }
  if (typeof cleanup === "function") {
    factoriesWithCleanup++;
  } else {
    factoriesWithoutCleanup++;
    if (noCleanupIds.length < 5) noCleanupIds.push(meta.id);
  }
  if (typeof cleanup === "function") {
    try { cleanup(); } catch (e) { factoryErrors++; if (errorIds.length < 5) errorIds.push(meta.id + " cleanup: " + e.message); }
  }
  const afterWin = (() => { let n = 0; for (const k in fakeWindow._listeners) n += (fakeWindow._listeners[k] || []).length; return n; })();
  if (afterWin > beforeWin) {
    leakedWindowListeners++;
    if (leakedIds.length < 8) leakedIds.push(meta.id + " (" + (afterWin - beforeWin) + " leaked)");
  }
  // canvas check skipped - app.js handles stage.innerHTML
}
console.log("factory errors: " + factoryErrors);
if (errorIds.length) console.log("  " + errorIds.join("\n  "));
console.log("factories with cleanup: " + factoriesWithCleanup);
console.log("factories without cleanup: " + factoriesWithoutCleanup);
if (noCleanupIds.length) console.log("  " + noCleanupIds.join("\n  "));
console.log("games with leaked window listeners: " + leakedWindowListeners);
if (leakedIds.length) console.log("  " + leakedIds.join("\n  "));
ok("no factory errors", factoryErrors === 0);
ok("all games return cleanup", factoriesWithoutCleanup === 0, factoriesWithoutCleanup + " games have no cleanup");
ok("no window listener leaks", leakedWindowListeners === 0, leakedWindowListeners + " games leak window listeners");
console.log("\nAudit: " + passed + " pass / " + failed + " fail");
process.exit(failed ? 1 : 0);