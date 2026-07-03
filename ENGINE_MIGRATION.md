# TINYCADE 引擎化 · 完整实施文档

> **版本**: 1.2 · 2026-07-03
> **状态**: 阶段 0–3 已完成（110/110 游戏迁移 + 111 个金样本 + lint/replay 全绿）
>          阶段 4（深链/OG/每日挑战）独立提案，未启动
> **v1.2 校准**: §11.1.1 `?game=` 实际位置 app.js:730（不是 520），已实现；OG 生成确认未实现；§15 row 6 标记 fallback 文件未删。
> **适用范围**: 从"111 个独立命令式 factory"演进为"1 个确定性引擎 + 111 份薄游戏逻辑"，并在其上兑现代码分割、玩法级测试、每日挑战等能力。
> **前置阅读**: `CODE_REVIEW.md`（问题清单 C1–C3 / H3 / H5 / M6 已在此文档得到结构性解决）

---

## 0. 一句话目标

把每个游戏拆成**纯逻辑 `update` + 副作用 `render`**，让相同 `seed + 输入序列` 永远复现同一局；在这个地基上，测试、代码分割、每日挑战几乎是"免费"兑换的红利。

---

## 1. 为什么要做（问题陈述）

当前 111 个游戏各自手写了同一套东西：游戏循环、键盘监听、状态机、canvas 绘制。由此产生四个**同根**的结构性问题：

| 现状病灶 | 位置 | 根因 |
|---|---|---|
| 触摸控制靠 `dispatchEvent(new KeyboardEvent)` 伪造键盘 | `app.js:307-350` | 没有输入抽象层，只能骗每个游戏 |
| 测试只能验证"游戏能加载"，无法验证玩法对错 | `test/jsdom-smoke.js` | 逻辑与渲染耦合，无法脱离 DOM 跑逻辑 |
| `games.js`+`games-extra.js` ~320KB 一次性阻塞加载 | `build.js:14` ASSETS | 111 游戏耦合在 2 个文件，无统一模块形状 |
| `Math.random`/`Date.now` 散落各处（如 `games.js:142/172`） | 全局 | 逻辑不确定，无法复现、无法回放、无法做每日挑战 |

**根因归一**：缺一层"游戏引擎/契约"，以及"逻辑不确定性"。本文档同时解决这两点。

---

## 2. 目标与非目标

### 2.1 目标（Definition of Done）

- [ ] 存在一个引擎模块，统一托管：固定步长循环、输入采样、暂停、canvas、音效派发。
- [ ] 游戏契约明确：`update(input)` 纯逻辑无 DOM、`render(ctx)` 只读状态画图。
- [ ] 确定性：给定 `seed + 输入序列`，`update` 的输出逐帧一致（跨机器、跨帧率）。
- [ ] 录制/回放：任意一局可录成 `seed + 每 tick 输入`，可无头（headless）回放。
- [ ] 玩法级测试：以"金样本回放"验证真实玩法逻辑，而非仅加载。
- [ ] 贪吃蛇作为**垂直切片**跑通全链路（阶段 0→2）。
- [ ] 按游戏懒加载，首屏不再加载全部 111 游戏逻辑。
- [ ] 每日挑战：按日期种子，全世界同一副棋盘，**零后端**。

### 2.2 非目标（本轮不做）

- 不重写视觉/美术，不改 retro 风格。
- 不引入构建打包器（Rollup/Vite）——保持零依赖、原生 ESM。
- 不引入 TypeScript（可作为后续独立提案）。
- 排行榜的服务端**本轮只出设计与权衡，不落地**（见 §11.3，它会打破"纯静态"属性）。

---

## 3. 目标架构总览

### 3.1 演进前后对比

```
【现在】
index.html
  └─ <script defer games.js>      (~一次性 320KB)
  └─ <script defer games-extra.js>
       每个 define(id, meta, factory)
         factory 内部: canvas + 键盘监听 + tickLoop + step + draw   ← 全耦合

【目标】
index.html
  └─ <script type="module" app.js>
       engine.js        固定步长循环 / 输入采样 / 暂停 / 音效队列
       rng.js           mulberry32 种子 PRNG
       input.js         键盘 + 触摸 → 统一 InputSnapshot
       recorder.js      录制 / 回放 / 状态哈希
       games/
         manifest.js    仅元数据(id/name/cat/icon/controls)，首屏加载
         snake.js       export default { meta, create(rng) → {update,render,serialize} }
         tetris.js      ...  ← 进入游戏时 await import() 懒加载
```

### 3.2 数据流（单帧）

```
rAF(t)
  └─ engine: 累加真实 dt
       while (acc >= tickInterval):        ← 逻辑步（可 0..N 次）
            input = InputSampler.sample()   ← 当前输入快照
            recorder.record(tick, input)    ← 录制（可选）
            game.update(input)              ← 纯逻辑，改内部状态，无 DOM
            drain(game.events → Sounds)     ← 音效在这里播（测试时丢弃）
            acc -= tickInterval
       game.render(ctx, alpha)              ← 只读状态画图
```

**确定性关键**：`update` 是纯逻辑。实时游玩时"何时 tick"由时钟决定；回放/测试时"何时 tick"由录制的 tick 数决定。两者都喂**同一个** `update`，且录制的是"每个 tick 实际发生的输入"，因此累加器的时钟抖动不影响复现。

---

## 4. 模块详细设计

### 4.1 `rng.js` — 种子 PRNG

```js
// mulberry32：32 位状态，快、够随机、可序列化
export function makeRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);          // [0, n)
  rng.range = (a, b) => a + Math.floor(rng() * (b - a));
  rng.pick = (arr) => arr[rng.int(arr.length)];
  rng.getState = () => s >>> 0;                     // 便于快照
  rng.setState = (v) => { s = v >>> 0; };
  return rng;
}

// 由字符串/日期派生种子（每日挑战用）
export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i); h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
```

**铁律**：游戏逻辑内**禁止** `Math.random()` / `Date.now()` / `performance.now()` / `new Date()`。只能用注入的 `rng` 和引擎给的 `tick` 计数。§13 的 lint 规则会强制检查。

### 4.2 `input.js` — 统一输入快照

一个 `InputSnapshot` 是本 tick 的输入状态；引擎每 tick 采样一次，并计算"本 tick 刚按下（边沿）"。

```js
// 逻辑按键，与物理键/触摸解耦
export const BTN = ['up','down','left','right','a','b','start','select'];

export function createInput(target = window) {
  const held = Object.fromEntries(BTN.map(k => [k, false]));
  const KEYMAP = {
    ArrowUp:'up', w:'up',  ArrowDown:'down', s:'down',
    ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right',
    ' ':'a', Enter:'a', z:'a', x:'b', p:'start', Escape:'select',
  };
  const norm = (e) => KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  const down = (e) => { const b = norm(e); if (b) { held[b] = true; e.preventDefault(); } };
  const up   = (e) => { const b = norm(e); if (b) { held[b] = false; } };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);

  // 触摸/虚拟手柄直接写 held[btn]，不再伪造 KeyboardEvent
  const setBtn = (btn, v) => { if (btn in held) held[btn] = !!v; };

  let prev = { ...held };
  return {
    setBtn,
    // 引擎每 tick 调一次：返回本 tick 快照 + 边沿
    sample() {
      const cur = { ...held };
      const pressed = {};
      for (const k of BTN) pressed[k] = cur[k] && !prev[k];
      prev = cur;
      return { held: cur, pressed };
    },
    // 回放时用录制值覆盖
    injectSnapshot(snap) { Object.assign(held, snap); },
    destroy() { target.removeEventListener('keydown', down); target.removeEventListener('keyup', up); },
  };
}
```

> 这一步直接**删除** `app.js:307-350` 的 `createKeyDispatcher` 伪造键盘逻辑：触摸按钮的 `onStart/onEnd` 改为 `input.setBtn('up', true/false)`。

### 4.3 `engine.js` — 固定步长循环

```js
import { createInput } from './input.js';

// game: { tickHz, update(input), render(ctx, alpha), events?:[] }
export function runGame(game, ctx, opts = {}) {
  const input = opts.input || createInput();
  const tickInterval = 1000 / (game.tickHz || 60);
  let acc = 0, last = performance.now(), raf = 0, stopped = false, tick = 0;
  const recorder = opts.recorder || null;

  function frame(t) {
    if (stopped) return;
    if (document.hidden) { raf = requestAnimationFrame(frame); return; } // 后台暂停
    acc += Math.min(t - last, 250); last = t;                            // 限制补帧上限
    while (acc >= tickInterval) {
      const snap = input.sample();
      if (recorder) recorder.record(tick, snap);
      game.update(snap);
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
```

### 4.4 游戏契约（Game Contract）

每个游戏文件 `default export` 一个对象：

```js
export default {
  meta: { id, name, desc, icon, cat, controls },  // 进注册表，首屏可见
  tickHz: 10,                                       // 逻辑步频（贪吃蛇 10Hz）
  create(rng, api) {
    // api: { width, height, emit(sound) }  —— 无 DOM
    const state = { /* ... */ };
    return {
      events: [],
      update(input) { /* 纯逻辑：读 input.held/pressed + rng，改 state，emit 音效事件 */ },
      render(ctx, alpha) { /* 只读 state，画到 ctx */ },
      serialize() { return { /* 决定"这一局"的最小状态，用于哈希断言 */ }; },
    };
  },
};
```

**契约红线**：
1. `update` 内不得触碰 DOM、不得直接调 `Sounds`（改为 `api.emit('eat')` 推事件）。
2. `update` 的一切随机来自 `rng`，一切"时间"来自累计 tick。
3. `render` 只读不写状态（可读 `alpha` 做插值动画，纯视觉不影响逻辑）。
4. `serialize` 返回可 JSON 化的决定性状态，供金样本哈希。

### 4.5 `recorder.js` — 录制 / 回放 / 哈希

```js
export function createRecorder() {
  const frames = [];        // [{tick, snap}]，仅记录变化以省空间
  let lastKey = '';
  return {
    frames,
    record(tick, snap) {
      const key = JSON.stringify(snap.held);
      if (key !== lastKey) { frames.push({ tick, held: snap.held }); lastKey = key; }
    },
    export(seed) { return { seed, frames }; },
  };
}

// 无头回放：不需要 canvas/audio，纯跑 update
export function replay(gameModule, tape, maxTicks = 100000) {
  const { makeRng } = requireRng();               // 见下（Node 与浏览器共用）
  const rng = makeRng(tape.seed);
  const inst = gameModule.create(rng, { width: 400, height: 400, emit() {} });
  let fi = 0, held = allFalse();
  for (let tick = 0; tick < maxTicks; tick++) {
    while (fi < tape.frames.length && tape.frames[fi].tick === tick) { held = tape.frames[fi].held; fi++; }
    const pressed = derivePressed(held /* vs prev */);
    inst.update({ held, pressed });
    if (inst.over) break;
  }
  return inst.serialize();                          // 回放终态
}

export function hashState(obj) {                    // FNV-1a，跨端一致
  const s = JSON.stringify(obj); let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
```

> `rng.js` / `recorder.js` 用**原生 ESM**，Node 18+ 与浏览器都能 `import`，无需打包。测试在 Node 里 `import` 同一份 `snake.js` 跑 `replay`。

---

## 5. 垂直切片：贪吃蛇迁移（阶段 0→2 全链路）

这是**样板**。跑通它，其余 110 个照抄。

### 5.1 迁移前（现状，`games.js:119-205` 摘要）

- `spawnFood()` 用 `Math.random`（不确定）。
- `draw()` 用 `Date.now()` 做脉动（不确定，且在渲染里——可接受但要挪出逻辑）。
- 键盘监听 `window.addEventListener('keydown', handler)`。
- `Games.tickLoop(()=>{step();draw();}, 100)` 逻辑与渲染同频耦合。
- `step()` 内直接调 `Sounds.sfx.eat()` 等。

### 5.2 迁移后：`games/snake.js`

```js
export default {
  meta: { id:'snake', name:'贪吃蛇', desc:'经典永不褪色，吃到果实变大但别撞墙',
          icon:'🐍', cat:'arcade', controls:'方向键/WASD 移动 · P 暂停 · R 重开' },
  tickHz: 10,                                    // 原 tickLoop(…,100) == 10Hz
  create(rng, api) {
    const COLS = 20, ROWS = 20, CELL = 20;
    let snake, dir, nextDir, food, score, over, frame = 0;
    function spawnFood() {
      if (snake.length >= COLS * ROWS) { over = true; api.emit('win'); return; }
      let a = 0;
      do { food = { x: rng.int(COLS), y: rng.int(ROWS) }; a++; }
      while (snake.some(s => s.x === food.x && s.y === food.y) && a < 1000);
    }
    function reset() {
      snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
      dir = {x:1,y:0}; nextDir = dir; score = 0; over = false; spawnFood();
    }
    reset();
    const events = [];
    api.emit = (s) => events.push(s);            // 收敛到事件队列
    return {
      events,
      get over() { return over; },
      update(input) {
        const p = input.pressed;
        if (p.up && dir.y !== 1) nextDir = {x:0,y:-1};
        else if (p.down && dir.y !== -1) nextDir = {x:0,y:1};
        else if (p.left && dir.x !== 1) nextDir = {x:-1,y:0};
        else if (p.right && dir.x !== -1) nextDir = {x:1,y:0};
        if (p.start) return;                     // 暂停由引擎/外壳处理，见 §5.4
        if (over) return;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)) {
          over = true; api.emit('gameover'); return;
        }
        snake.unshift(head);
        if (head.x===food.x && head.y===food.y) { score+=10; api.emit('eat'); spawnFood(); }
        else snake.pop();
        frame++;
      },
      render(ctx) {
        ctx.fillStyle = '#0a0014'; ctx.fillRect(0,0,400,400);
        // food（脉动改用 frame 而非 Date.now，保持纯视觉）
        const pulse = Math.sin(frame/3)*2;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(food.x*CELL+2-pulse/2, food.y*CELL+2-pulse/2, CELL-4+pulse, CELL-4+pulse);
        snake.forEach((s,i)=>{ ctx.fillStyle = i===0?'#00ffff':`hsl(${(180+i*4)%360},100%,50%)`;
          ctx.fillRect(s.x*CELL+1,s.y*CELL+1,CELL-2,CELL-2); });
      },
      serialize() { return { score, len: snake.length, head: snake[0], over }; },
    };
  },
};
```

**变化清单**：`Math.random`→`rng.int`；`Date.now`→`frame`；`Sounds.sfx.*`→`api.emit`；键盘监听→引擎注入的 `input.pressed`；`step+draw` 拆成 `update+render`。**逻辑现在完全无 DOM、可无头运行。**

### 5.3 金样本测试：`test/replay/snake.tape.json`

录制流程（一次性，见 §7.2 工具）：在浏览器玩一局→导出 `recorder.export(seed)`→跑 `replay` 得终态→把 `{seed, frames, expect: hashState(终态)}` 存盘。

```jsonc
{ "game": "snake", "seed": 123456789,
  "frames": [ {"tick":0,"held":{"right":true, ...}}, {"tick":6,"held":{"down":true, ...}} ],
  "expect": "a1b2c3d4" }
```

### 5.4 外壳适配（`app.js` 侧，`launchGame` 重写）

- `launchGame` 改为 `async`，`const mod = await import('./games/'+id+'.js')`。
- 建 canvas + `ctx`，`makeRng(seedForNow)`，`runGame(mod, ctx, {onEvent: s=>Sounds.sfx[s]?.()})`。
- 暂停：外壳拦 `start` 边沿，`stopped`/`resume` 引擎循环（暂停是外壳职责，不进 `update`，保证确定性）。
- 重开：重新 `create` 实例（同 seed 或新 seed）。
- 触摸按钮回调改为 `input.setBtn(...)`。

---

## 6. 111 个游戏的推广策略

**不要横扫。分批竖切。**

1. **样板固化**：贪吃蛇跑通后，把"迁移步骤"写成 §5.2 的机械清单。
2. **分批**：每批 5–10 个，按类别归拢（`arcade`→`puzzle`→`strategy`→…），同类共享绘制/输入模式，抄起来快。
3. **每迁一个，配一条金样本**：迁移当次即录一局金样本入 `test/replay/`。测试数随游戏数线性增长，回归网自动加密。
4. **兼容并存期**：迁移期允许 `Games`(旧 IIFE) 与新 `games/*.js` 并存；注册表合并两边元数据，`launchGame` 优先走新模块，回退旧 factory。全部迁完再删旧文件。
5. **抽公共绘制**（解决 CODE_REVIEW M6）：迁移中把重复的网格/像素精灵/粒子绘制沉淀到 `engine/draw.js`。

**迁移进度看板**（放在文档尾 §14，逐个勾选）。

---

## 7. 工具链

### 7.1 无头回放测试跑法（Node，零依赖）

```
test/replay-test.js
  遍历 test/replay/*.tape.json
  动态 import 对应 games/<game>.js
  replay(mod, tape) → hashState(终态)
  断言 === tape.expect，否则红灯并打印 diff
```

接入 `package.json`：`"test:replay": "node test/replay-test.js"`，并加入 `test/run-all.js`。

### 7.2 录制工具（浏览器内，dev-only）

`?record=1` 时，`launchGame` 挂上 `recorder`，游戏结束弹出"复制金样本 JSON"按钮，人工存进 `test/replay/`。

---

## 8. 代码分割与懒加载（阶段 2 红利）

### 8.1 `index.html`

- 主脚本从 `<script defer src="games.js">` 系列，改为单一入口 `<script type="module" src="app.js">`。
- 首屏只加载：`app.js` + `engine.js` + `input.js` + `games/manifest.js`（仅元数据，几 KB）。
- `games/manifest.js` 形如：
  ```js
  export const MANIFEST = [
    { id:'snake', name:'贪吃蛇', icon:'🐍', cat:'arcade', desc:'…', controls:'…' },
    // …111 条纯元数据，不含逻辑
  ];
  ```
- `renderLibrary` 直接读 `MANIFEST`（不再依赖已加载的 factory）。

### 8.2 `app.js`：`launchGame` 懒加载

```js
async function launchGame(id) {
  const meta = MANIFEST.find(m => m.id === id);
  if (!meta) return;
  showSpinner(stage);
  let mod;
  try { mod = (await import(`./games/${id}.js`)).default; }
  catch (e) { showLoadError(stage, e); return; }        // 分割后需处理"加载失败"
  // …建 canvas/ctx/rng，runGame(...)
}
```

> 新增边界：**动态 import 可能失败**（弱网/离线未缓存）。必须有加载态 + 失败重试提示，这是分割引入的新责任。

### 8.3 `build.js`

- `ASSETS`（第 14 行）从写死的 `games.js/games-extra.js`，改为**扫描 `games/` 目录**动态生成哈希 + SRI + `asset-manifest.json`。
- `index.html` 的 SRI 注入逻辑（第 99-107 行）保持，但动态模块的完整性改用 **import map + 各模块独立 SRI**，或在 manifest 中带 hash 由 SW 校验（二选一，见 §8.4 权衡）。
- `<link rel="preload">`（第 110-112 行）预加载改为：`app.js` + `engine.js` + 最热门的 3–5 个游戏模块（可按埋点数据定）。

### 8.4 `sw.js`：离线仍要能玩

当前 `PRECACHE` 只有 `'./'` + manifest，靠运行时兜底（`sw.js:8-11`）。分割后：

- **策略**：`install` 时预缓存 `app.js/engine.js/input.js/manifest.js/style.css` + Top-N 游戏模块；其余游戏模块走 `fetch` 后写缓存（当前逻辑 `sw.js:34-39` 已支持）。
- 首次玩过的游戏即被缓存，二次离线可玩。
- **权衡**：SRI 与 SW 缓存需协调——推荐让 `build.js` 产出带 hash 文件名（immutable），SW 只按 URL 缓存，完整性由 hash 文件名 + HTTPS 保证，避免 import-map SRI 的复杂度。

### 8.5 收益量化（预期）

| 指标 | 现在 | 目标 |
|---|---|---|
| 首屏 JS（gz） | 全部游戏 ~一次性 | 入口+引擎+manifest（预计降 70%+） |
| 进入某游戏 | 已加载 | 一次 `import`（缓存后即时） |
| LCP（低端机/弱网） | 受大 JS 阻塞 | 显著改善（配合 §4.3 已有 Web Vitals 上报验证） |

> 用 `app.js` 里现成的 `observeVitals()`（第 564 行）在迁移前后各采一版 LCP/INP 数据做 A/B 佐证。

---

## 9. 音效解耦（确定性前提）

- 游戏 `update` 内 `Sounds.sfx.eat()` 全部改为 `api.emit('eat')`，推入 `events`。
- 引擎在**非无头**模式下 `opts.onEvent = s => Sounds.sfx[s]?.()` 消费。
- 无头回放/测试 `headless:true`，事件被丢弃，逻辑不受影响。
- 收益：音效不再污染纯逻辑；测试可脱离 Web Audio 运行。

---

## 10. 测试策略升级

| 层级 | 现有 | 新增 |
|---|---|---|
| 语法 | `node --check`（已全覆盖） | 新增 `games/*.js`、`engine.js` 等 |
| 加载 | `jsdom-smoke` 注册表 | 保留，改读 `MANIFEST` |
| **玩法** | ❌ 无 | ✅ `test:replay` 金样本回放（本文档核心增量） |
| 确定性 | ❌ 无 | ✅ 同一 tape 回放两次结果哈希必须一致 |
| 纯净性 | ❌ 无 | ✅ lint 规则：`games/` 内禁止 `Math.random`/`Date.now`/`document`（见 §13） |
| 静态服务器 | `server-test`（39 项） | 保留 |

CI（`.github/`）在现有 `npm test` 中追加 `test:replay`。**每个迁移的游戏至少一条金样本**为合并门槛。

---

## 11. 产品层（轴 C）

### 11.1 深链 + OG 预览

- 现有 `?game=`（`app.js:730`，走 `findById` + `launchGame`）已可工作，但 URL 不够干净。阶段 4 升级为 `/#/snake` 或 History API `/play/snake`。
- 每游戏一张 OG 图：`build.js` 阶段用无头 canvas（或预置封面）为每个 `meta` 生成 `og/<id>.png`，写入 `<meta property="og:image">`（需按路由动态，静态多页或运行时注入）。**当前未实现，待阶段 4 启动**。

### 11.2 每日挑战（技术投资的复利兑现）

- 种子 = `seedFrom('YYYY-MM-DD')`（`rng.js` 已提供 `seedFrom`）。
- 全世界同一天进入"每日挑战"→同一 `seed`→**同一副棋盘/同一序列**，因为 §4.1 的确定性保证。
- **零后端**：不需要服务端下发关卡；日期本地算即可。
- 分数分享：把 `{seed, frames, score}` 编码进 URL，别人可**回放你这一局**（回放器复用 §4.5）——天然的社交传播点。

### 11.3 排行榜（⚠️ 打破纯静态，本轮不落地）

- 需要服务端存储 + 反作弊。**关键权衡**：一旦引入，README 的"服务器无状态/纯静态/10k 并发轻松"卖点被打破，运维复杂度与成本上升。
- 若要做，最小方案：Serverless KV（如 Cloudflare Workers KV）+ 提交时带 `{seed, frames}` 由服务端**回放校验分数**（利用确定性反作弊，无需信任客户端上报的数字）——这正是阶段 0 确定性投资的又一复利。
- **决策建议**：作为独立提案单独评审，不阻塞 §5–§8 主线。

---

## 12. 分阶段实施计划（含退出标准）

> 每阶段结束都有**可运行、可验证**的产物；上一阶段的退出标准是下一阶段的准入。

### 阶段 0 · 安全网（基础设施，先行）
**做**：`rng.js`、`input.js`、`recorder.js`、`test/replay-test.js`、录制工具（`?record=1`）。
**退出标准**：能对一个"临时接线"的贪吃蛇录制并无头回放，两次回放哈希一致。

### 阶段 1 · 引擎 + 契约
**做**：`engine.js`（固定步长循环）、游戏契约定稿、音效事件化（§9）。
**退出标准**：贪吃蛇以新契约在浏览器可玩，手感与旧版一致；后台标签自动暂停。

### 阶段 2 · 垂直切片收口
**做**：`launchGame` 懒加载改造、`games/snake.js` 定稿、`test/replay/snake.tape.json` 金样本、触摸接线改 `input.setBtn`。
**退出标准**：`npm run test:replay` 贪吃蛇绿灯；触摸控制不再用伪造键盘；首屏不再加载贪吃蛇逻辑（Network 面板佐证）。

### 阶段 3 · 批量推广
**做**：按 §6 每批 5–10 个迁移，每个配金样本；沉淀 `engine/draw.js` 公共绘制。
**退出标准**：全部 111 迁完，删除旧 `games.js/games-extra.js`；`build.js` 改为扫描 `games/`；金样本覆盖率 = 游戏数。

### 阶段 4 · 产品层
**做**：深链 + OG（§11.1）、每日挑战（§11.2）。排行榜单独评审。
**退出标准**：每日挑战全端同盘；分享链接可回放。

---

## 13. 纯净性 lint（强制确定性）

在 `test/lint.js` 追加针对 `games/` 的规则（正则级即可，零依赖）：

```
禁止匹配（在 games/*.js 内）：
  \bMath\.random\b        → 用 rng
  \bDate\.now\b | new Date\b | performance\.now\b   → 用 tick/frame
  \bdocument\.\b | \bwindow\.\b（update 段内）      → 逻辑不得碰 DOM
  直接 Sounds\.               → 用 api.emit
命中即 CI 红灯。
```

> 这条 lint 是确定性长期不腐化的护栏。没有它，几个月后又会有人在某个游戏里偷偷 `Math.random`。

---

## 14. 风险与回滚

| 风险 | 影响 | 缓解 |
|---|---|---|
| 大重构引入玩法回归 | 高 | **阶段 0 金样本先行**；每迁一个当次录样本；旧新并存期可逐个回退 |
| `update`/`render` 拆分遗漏隐藏状态（如 `render` 里改了逻辑变量） | 中 | lint 禁止 `render` 写状态；code review 重点核对 |
| 确定性被浮点误差破坏（跨平台） | 中 | 逻辑尽量用整数网格；`serialize` 只哈希整数量（分数/坐标/长度），避免哈希浮点 |
| 动态 import 弱网/离线失败 | 中 | §8.2 加载态 + 重试；§8.4 SW 预缓存 Top-N |
| 迁移周期长、并存期混乱 | 中 | 注册表统一入口 + 迁移看板逐项勾选；一次只开 1–2 批 |
| 排行榜诱惑导致范围蔓延 | 中 | §11.3 明确本轮不做，单独评审 |

**回滚**：并存期任意游戏可从"新模块"退回"旧 factory"（注册表切换即可）；引擎/工具为纯新增文件，删除不影响旧路径。

---

## 15. 迁移进度看板

> 每迁一个：迁移代码 ✅ + 金样本 ✅ + lint 通过 ✅ 三项齐全才算完成。
> 2026-07-03 阶段 3 收口：110/110 全部完成，111/111 金样本（含 snake）全绿。

| 批次 | 类别 | 游戏 | 迁移 | 金样本 | 状态 |
|---|---|---|---|---|---|
| 0 | arcade | 贪吃蛇 snake（样板） | ✅ | ✅ | 阶段 0 样板 |
| 1 | arcade | 反弹球/太空侵略者/打砖块/飞机大战/恐龙跳/切水果/打地鼠/雪崩/…（27 款） | ✅ | ✅ | 阶段 3 收口 |
| 2 | puzzle | 俄罗斯方块/扫雷/2048/数独/围棋/华容道/算24/…（29 款） | ✅ | ✅ | 阶段 3 收口 |
| 3 | strategy | 井字棋/五子棋/黑白棋/围棋/点格/曼卡拉/尼姆/…（14 款） | ✅ | ✅ | 阶段 3 收口 |
| 4 | action | 像素鸟/忍者/弹幕/滑翔/打砖块/剑客/…（21 款） | ✅ | ✅ | 阶段 3 收口 |
| 5 | casual | 记忆/猜数字/西蒙说/老虎机/21点/速算/…（19 款） | ✅ | ✅ | 阶段 3 收口 |
| 6 | extra | games-extra.js 中其余迁移项 | ✅ | ✅ | 迁移完成；旧文件仍作 fallback path 保留（删除待后续单独 commit） |

---

## 附录 A · 首次落地文件清单（阶段 0–2）

```
新增:
  engine/rng.js
  engine/input.js
  engine/engine.js
  engine/recorder.js
  engine/draw.js            (阶段 3 起逐步填充)
  games/manifest.js
  games/snake.js
  test/replay-test.js
  test/replay/snake.tape.json
修改:
  app.js                    (launchGame 懒加载 + async；触摸接 input.setBtn；删 createKeyDispatcher)
  index.html                (改 type=module 入口)
  build.js                  (ASSETS 扫描 games/；preload 调整)
  sw.js                     (PRECACHE 增补入口+引擎+Top-N)
  test/lint.js              (games/ 纯净性规则)
  package.json              (test:replay 脚本 + run-all 接入)
过渡期保留 (全部迁完再删):
  games.js / games-extra.js
```

## 附录 B · 关键设计决策速查

1. **为什么固定步长而非可变 dt**：可变 dt 破坏确定性；固定步长 + 累加器兼顾平滑与可复现。
2. **为什么输入快照而非事件**：事件顺序不可复现且难录制；每 tick 快照天然可录可放，并顺带干掉伪造 KeyboardEvent 的 hack。
3. **为什么保留原生 ESM 不上打包器**：守住"零依赖"卖点；浏览器与 Node 18+ 共用同一份模块跑测试。
4. **为什么先做安全网再重构**：没有玩法级测试，动 111 个游戏等于蒙眼手术。
5. **确定性的复利**：一次投资，兑换出「回放测试 + demo/attract 模式 + 每日挑战零后端 + 排行榜服务端反作弊」四项能力。
```
