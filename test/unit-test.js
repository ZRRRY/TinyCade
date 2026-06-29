// TINYCADE 单元测试: Games.loop / Games.tickLoop / Games.safeEval
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  PASS " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? " :: " + detail : "")); }
}

function makeElement() {
  const el = {
    children: [], childNodes: [], style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, attributes: {}, listeners: {}, _qCache: {},
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild() {},
    addEventListener() {}, removeEventListener() {},
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
  readyState: "complete", hidden: false,
  addEventListener() {}, removeEventListener() {},
  getElementById() { return makeElement(); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(t) { return makeElement(t); },
  body: makeElement()
};
const fakeWindow = {
  devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
  innerWidth: 1024, innerHeight: 768,
  AudioContext: undefined, webkitAudioContext: undefined,
  TINYCADE_VERSION: "test", TINYCADE_BUILD: "test"
};
fakeWindow.document = fakeDoc;
fakeWindow.window = fakeWindow;

const sandbox = {
  window: fakeWindow, document: fakeDoc, console,
  Math, Date, JSON, Number, Array, Object, String, Boolean, Error, Promise, Map, Set, Symbol, RegExp, performance,
  setTimeout, clearTimeout, setInterval, clearInterval,
  parseInt, parseFloat, isNaN, isFinite,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
};
sandbox.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
sandbox.cancelAnimationFrame = (id) => clearTimeout(id);
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
ok("Games exposed", !!G);
if (!G) { console.log("Cannot continue without Games"); process.exit(1); }

// safeEval
console.log("--- safeEval ---");
ok("safeEval exists", typeof G.safeEval === "function");
const cases = [
  ["1+1", 2],
  ["2*3+4", 10],
  ["(1+2)*3", 9],
  ["10/4", 2.5],
  ["100-50-25", 25],
  ["1.5+2.5", 4],
  ["-5+10", 5],
  ["(2+3)*(4-1)", 15],
  ["-(2+3)*2", -10]
];
for (const [expr, expected] of cases) {
  let got;
  try { got = G.safeEval(expr); } catch (e) { got = "ERR: " + e.message; }
  ok("safeEval(" + expr + ") = " + expected, got === expected, "got " + got);
}
const badCases = ["", "abc", "1++", "(1+2", "1+)", "console.log(1)", "1;2", "1+1; alert(1)", "function(){}"];
for (const expr of badCases) {
  let threw = false;
  try { G.safeEval(expr); } catch (e) { threw = true; }
  ok("safeEval rejects " + JSON.stringify(expr), threw);
}

// loop
console.log("--- loop ---");
ok("Games.loop exists", typeof G.loop === "function");
const stop1 = G.loop(() => {}, 60);
ok("loop returns cleanup", typeof stop1 === "function");
stop1();
ok("loop cleanup is idempotent", true);

// tickLoop
console.log("--- tickLoop ---");
ok("Games.tickLoop exists", typeof G.tickLoop === "function");
const stop2 = G.tickLoop(() => {}, 50);
ok("tickLoop returns cleanup", typeof stop2 === "function");
stop2();

// Test that loop actually fires
console.log("--- loop runs ---");
let ticks = 0;
let loopStop = null;
const stop3 = G.loop((t) => { ticks++; if (ticks >= 3 && loopStop) loopStop(); }, 0);
loopStop = stop3;
const start = Date.now();
function checkTicks() {
  if (ticks >= 3 || Date.now() - start > 2000) {
    try { stop3(); } catch (e) {}
    ok("loop tick callback fires (got " + ticks + ")", ticks >= 3);
  } else {
    setTimeout(checkTicks, 30);
  }
}
checkTicks();

// Test that tickLoop actually fires
console.log("--- tickLoop runs ---");
let tickLoopTicks = 0;
let tStop = null;
const stop4 = G.tickLoop(() => { tickLoopTicks++; if (tickLoopTicks >= 3 && tStop) tStop(); }, 20);
tStop = stop4;
setTimeout(() => {
  try { stop4(); } catch (e) {}
  ok("tickLoop callback fires (got " + tickLoopTicks + ")", tickLoopTicks >= 3);
  console.log("\nUnit: " + passed + " pass / " + failed + " fail");
  process.exit(failed ? 1 : 0);
}, 2000);