# TINYCADE 下阶段工作清单

> 状态：阶段 0–3 已完成（111 款游戏引擎化 + 金样本全绿），阶段 4 产品功能及工程收口进行中。
> 当前进度：A、B、C1、C2、C3、C4 均已完成并通过 `npm test` 与浏览器冒烟；**D1、D2、D3、D4、D5、D6 全部已完成**。TODO.md 目标全部收敛。
> 本清单按「先还技术债，再兑现红利」排序，每一项均可独立提交 PR。

---

## 当前已知问题

1. ~~**并存期未结束**：`games.js` / `games-extra.js` 仍参与构建、lint 与 fallback 路径，新架构背负旧包袱。~~ ✅ 已解决
2. ~~**画布被强制 400×400**：俄罗斯方块（300×600）、Pong（480×320）、像素鸟（400×500）等原尺寸被压成正方形，存在视觉与手感回归。~~ ✅ 已解决
3. **阶段 4 产品能力全部完成**：每日挑战、深链路由、分享回放、OG 图均已实现。
4. **公共绘制沉淀不足**：`engine/draw.js` 已建立，但大量游戏尚未迁移使用。

---

## A. 结束并存期（最高优先级）✅ 已完成

目标：彻底移除旧 `Games` 工厂与旧注册表，让新引擎架构成为唯一路径。

- [x] **A1** 删除 `app.js` 中的 `ensureLegacyGames()` 函数及 `launchGame` 内的 fallback 分支。
- [x] **A2** 从 `index.html` 移除 `games.js` 与 `games-extra.js` 的 `<script>` 引用。
- [x] **A3** 从 `build.js` 的 `ASSETS_TOP` / `STATIC_FILES` 移除 `games.js` / `games-extra.js`。
- [x] **A4** 从 `test/lint.js` 的 `files.js` 数组移除 `games.js` / `games-extra.js`，并删除「老游戏总数 >= 100」检查。
- [x] **A5** 删除根目录 `games.js` 与 `games-extra.js`（或移入 `legacy/` 并更新 `.gitignore`）。
- [x] **A6** 清理 `app.js` 中 `const Games = () => window.Games;` 等仅用于 fallback 的全局引用。
- [x] **A7** 运行 `npm run build && npm test && npm run test:replay` 全绿。

**验收标准**：构建产物 `dist/` 不再包含旧游戏文件；lint 通过；111 个金样本回放全绿。

---

## B. 画布尺寸自适应（高优先级）✅ 已完成

目标：让每款游戏按自身声明的尺寸渲染，结束 400×400 一刀切。

- [x] **B1** 在游戏契约中增加尺寸声明：采用 `meta: { width, height, ... }`，由 `app.js` 读取。
- [x] **B2** 修改 `app.js` 的 `launchGame`，根据 `meta.width` / `meta.height` 创建 canvas，并复用 DPR / CSS 缩放逻辑。
- [x] **B3** 优先修复三款尺寸敏感游戏：
  - `games/tetris.js` → 300×600
  - `games/pong.js` → 480×320
  - `games/flappy.js` → 400×500
- [x] **B4** 将 DPR 适配与 CSS 缩放逻辑抽取到 `engine/draw.js` 的 `setupCanvas(ctx, w, h, maxCssW)`。
- [x] **B5** 更新 `build.js` / `test/lint.js` 中可能受影响的硬编码尺寸检查（如有）。
- [x] **B6** 在浏览器中验证三款游戏的视觉比例与旧版一致。

**验收标准**：俄罗斯方块竖屏、Pong 横屏、Flappy 纵向比例正确；`npm test` 全绿。

---

## C. 阶段 4 产品功能（按实现难度升序）

### C1. 每日挑战（零后端）✅ 已完成

- [x] 在主页增加「DAILY」入口按钮。
- [x] 实现 `seedFrom(dateString)`，每日固定日期作为 seed。
- [x] 每日挑战进入游戏时使用固定 seed，而非随机 seed。
- [x] 在 HUD 中显示今日日期与挑战说明。
- [x] 保存用户今日最高分至 `localStorage`。

**验收标准**：不同设备在同一天进入同一游戏，初始局面一致；日期切换后局面变化。

> **导师备注**：C1 已完成。当前最高分逻辑读取 `serialize().score/lines/moves`，不同游戏计分字段不统一。若后续要跨游戏排行榜，需要先约定一个统一的 `score` 字段契约。

---

### C2. 分享回放链接 ✅ 已完成

- [x] 游戏结束后生成分享 URL：`/#/replay?g=snake&s=<seed>&frames=<compressed>`。
- [x] 实现 frames 压缩：将 `{tick, held}` 数组转为 `[[tick, mask], ...]` 的 JSON + URL-safe base64。
- [x] 在 `app.js` 中解析 `/replay` 路由，以 demo 模式自动回放（不采集输入、不可操作）。
- [x] 提供「复制分享链接」按钮，并处理 URL 超过 4000 字符的 fallback。

**验收标准**：分享的链接在另一浏览器打开后，能复现相同终局；`replay-test.js` 能解析压缩格式。

**实现摘要**：

- `engine/recorder.js` 新增 `encodeFrames(frames)` / `decodeFrames(str)`：
  - 用 8 位掩码表示 `BTN` 顺序的 8 个按键（up/down/left/right/a/b/start/select）。
  - `JSON.stringify([[tick, mask], ...])` 后做 URL-safe base64（替换 `+/=`）。
  - 零依赖，录带通常几百字节到 2KB；超过 4000 字符时 `generateShareUrl()` 返回空串。
- `engine/input.js` 新增 `createDemoInput(frames)`：按录制帧逐 tick 注入 `held/pressed`，不监听真实输入。
- `app.js`：
  - `launchGame(id, {demo, seed, frames})` 支持 demo 模式；普通模式始终录制，供分享。
  - `generateShareUrl()` 从 `State.recorder` 导出并编码，超过 `SHARE_URL_LIMIT = 4000` 返回空。
  - `route()` 的 `/#/replay` 分支解码 frames 并以 demo 模式启动游戏。
  - 游戏结束（`gameover`/`win`）时自动生成 `State.shareUrl`。
  - 控制区注入「🔗 复制分享链接」按钮；demo 模式不显示；过长或尚未结束时给出明确提示。
  - `?debug=1` 时暴露 `window.__tinycadeState`，便于端到端测试（普通用户不可见）。
- `test/unit-test.js` 新增 encode/decode 互逆、URL-safe、全按钮掩码 round-trip 测试。
- 浏览器冒烟（Playwright）：
  - snake 直接撞墙终局 → 复制分享链接 → 新标签页打开 replay URL，终局 `serialize()` 完全一致。
  - flappy 输入后终局 → 点击分享按钮复制 URL → replay URL 进入 demo 回放并正常结束。

> **导师备注**：C2 已完成。demo 回放依赖 `document.hidden` 与 rAF 的实时性；在普通用户流程下（页面始终可见）终局一致。后续若发现特定游戏在后台/节流场景下 tick 对齐偏差，可在 `engine/engine.js` 把 `tick` 改为单调逻辑时钟，进一步隔离渲染与逻辑时间。

---

### C3. 深链路由 `/#/gameId` ✅ 已完成

- [x] 将 `?game=snake` 升级为 `/#/snake`（hash 路由，纯静态友好）。
- [x] 保留 `?game=` 兼容重定向，避免外部旧链接失效。
- [x] 在 `app.js` 中监听 `hashchange`，刷新后直接启动对应游戏。

**验收标准**：访问 `/#/tetris` 直接进入俄罗斯方块；`?game=tetris` 自动跳转。

> **实现摘要**：
> 
> - 新增纯函数路由模块 `engine/router.js`，负责解析 `/#/` 风格 hash、生成游戏/每日/回放 URL。
> - `app.js` 中新增 `route()` 作为统一路由入口，支持：
>   - `/#/:gameId` → 启动游戏
>   - `/#/daily` → 每日挑战
>   - `/#/replay?g=&s=&frames=` → C2 回放占位
>   - `/#/` 或非法路由 → 回游戏库
> - 旧 `?game=` 通过 `history.replaceState` 重写成 `/#/gameId`，不刷新、不新增历史堆栈。
> - 所有用户返回操作（ESC、返回按钮、触摸返回）统一改为 `location.hash = '#/'`，通过 `hashchange` 走 `route()`。
> - 顺手清理了 `launchGame` 中遗留的多余 `}` 与不可达错误处理代码（旧 fallback 移除后的残留）。
> - 单元测试新增 `engine/router.js` 的 `parseHash` 覆盖；`package.json` 的 `check` 脚本加入 `engine/router.js` 语法检查。

---

### C4. OG 图生成 ✅ 已完成

- [x] 在 `build.js` 中为每个 `meta` 生成 `dist/og/<id>.svg`。
- [x] 生成默认 `dist/og/default.svg` 作为站点通用封面。
- [x] 在 `index.html` 注入 `og:title` / `og:description` / `og:image` / `og:type` / `twitter:card` 等默认 meta。

**验收标准**：社交媒体调试工具能抓取到正确的标题、描述与封面。

**实现摘要**：

- `build.js` 在打包阶段读取 `games/manifest.js`，为每个游戏生成 1200×630 的静态 SVG：
  - 背景：`#0a0014` 深色网格。
  - 边框：青色半透明方框。
  - 分类标签（洋红大写）。
  - 游戏图标（emoji，字号 140）。
  - 游戏名称（青色大字）。
  - 游戏描述（白色小字）。
  - 底部品牌：TINYCADE · 复古小游戏合集。
- 同时生成 `dist/og/default.svg`：像素块装饰 + TINYCADE 品牌 + 副标题。
- 所有 SVG 都经过 `gzip` / `brotli` 压缩，零额外依赖。
- `index.html` 加入默认 Open Graph / Twitter Card meta，指向 `og/default.svg`。

> **导师备注**：C4 MVP 已完成。由于 `index.html` 是单页静态文件，社交平台抓取时只能拿到默认封面；已生成的 111 张 `dist/og/<id>.svg` 可在后续部署 SSR/edge 重写或生成 `dist/g/<id>/index.html` 时直接使用。不要为动态按游戏区分封面阻塞上线。

---

## D. 慢性工程优化（可穿插进行）

- [x] **D1** 统计并推动更多游戏使用 `engine/draw.js` 中的 `strokeGrid` / `pixelText` / `centerText` / `pulse` / `flash`（batch 1：snake / tetris / shikaku 网格；batch 2：shikaku / mini4 文字；batch 3：kakuro / wordsearch / fifteen / sliding / slide3 文字）。
- [x] **D2** 录制器导出时加入 `maxTicks`，`replay-test.js` 优先使用 tape 自带上限而非默认 100000。
- [x] **D3** 规范金样本覆盖策略：每款游戏至少 1 条，状态复杂或分支多的游戏 2–3 条。
- [x] **D4** 确认 `.github/workflows` 中已执行 `npm run test:replay`，未执行则补充。
- [x] **D5** 为 `engine/*.js` 增加单元测试（`test/unit-test.js` 已存在，可扩展）。
- [x] **D6** 定期审计 `games/*.js` 中是否仍有游戏未使用 `rng`（lint 已拦截，但可抽检）。

**实现摘要**：

- **D1** `games/snake.js` / `games/tetris.js` / `games/shikaku.js` / `games/mini4.js`
  - batch 1（网格）：三处手写网格循环统一替换为 `strokeGrid(...)`。
    - `snake`：`rgba(0,255,255,0.06)` 透明网格 → `{ color: '#00ffff', alpha: 0.06 }`。
    - `tetris`：`rgba(255,255,255,0.05)` 透明网格 → `{ color: '#ffffff', alpha: 0.05 }`。
    - `shikaku`：`#888` 居中棋盘网格 → `{ x: ox, y: oy, cols: N, rows: N, cell: CELL, color: '#888' }`。
  - batch 2（文字）：`shikaku` / `mini4` 的手写居中文字替换为 `centerText(...)`，y 坐标按 `size/2` 补偿以保持视觉居中。
  - batch 3（文字）：`kakuro` / `wordsearch` / `fifteen` / `sliding` / `slide3` 的手写居中文字替换为 `centerText(...)`。
  - 仅改动 `render()`，逻辑不变；`npm test` 119 条金样本全绿。
- **D3** 金样本覆盖
  - 为 `snake` / `tetris` / `g2048` / `sudoku` 各补 2 条金样本，均达到 3 条覆盖。
  - 新增脚本 `scripts/record-random-tape.mjs`，可用独立输入 RNG 生成确定性随机按键序列。
  - `scripts/record-tape.mjs` 新增 `--out` 参数，支持写入自定义文件名（如 `snake-2.tape.json`）。
  - `games/tetris.js` 的 `serialize()` 增加 `board` 与 `piece`，让不同输入路径产生可区分的终局哈希。
  - 金样本总数从 111 提升到 119，全部通过 `npm run test:replay`。
- **D6** rng 使用审计
  - `test/lint.js` 已逐文件检查 `Math.random` / `Date.now` / `new Date()` / `performance.now()`。
  - 手动抽检 `games/*.js`：上述非确定性源零命中。
- **D2** `engine/recorder.js`
  - `createRecorder.export()` 现在返回 `{seed, frames, maxTicks}`，其中 `maxTicks = 最后记录 tick + 1`。
  - `scripts/record-snake-tape.js` 写入的 tape 也同步写入 `maxTicks`。
  - `test/unit-test.js` 新增断言 `tape.maxTicks === 6`。
  - `test/replay-test.js` 优先使用 `tape.maxTicks`，回退到默认 `100000`。
- **D4** `.github/workflows/ci.yml`
  - 在 Lint 步骤后新增 `- name: Replay tests / run: npm run test:replay`。
- **D5** `test/unit-test.js`
  - 导入 `engine/draw.js`，对 `pulse`、`flash`、`pixelText`、`centerText`、`strokeGrid` 用 fake ctx 做行为测试。
  - `pulse` 验证正弦周期与 [0,1] 范围；`flash` 验证阈值跳变；`pixelText` / `centerText` 验证字体、颜色、对齐与坐标；`strokeGrid` 验证行列线与样式。

> **导师指导（必读）**：
> 
> - ~~**D1** 是长期的代码质量工作，不要一次性改 111 个文件。每次改一个游戏或一类绘制函数时顺手迁移。优先迁移那些绘制代码重复度高的游戏（如网格类游戏、文字类游戏）。~~ ✅ 已完成三批（snake/tetris/shikaku 网格 + shikaku/mini4/kakuro/wordsearch/fifteen/sliding/slide3 文字）
> - ~~**D2** 与 C2 强相关。回放分享需要知道「这一局什么时候结束」。如果 `maxTicks` 写在 tape 里，回放引擎可以直接读取，避免用固定上限硬跑。~~ ✅ 已完成
> - ~~**D3** 金样本是项目质量的核心资产。新增功能前先加一条会失败的金样本，再实现功能让它通过，这是 TDD 的最佳实践。Snake、Tetris、2048、Sudoku 这类状态分支多的游戏建议 3 条。~~ ✅ 已完成（snake/tetris/g2048/sudoku 各 3 条，总数 119）
> - ~~**D4** 检查 `.github/workflows/ci.yml` 的 `test:replay` 步骤。CI 跑一次 111 条回放应该很快（<30 秒），如果慢，考虑并行或只抽样跑。~~ ✅ 已完成
> - ~~**D5** `engine/draw.js`、`engine/rng.js`、`engine/recorder.js` 都值得单测。`rng.js` 的确定性是每日挑战和回放的根基，必须有测试保证相同 seed 产生相同序列。~~ ✅ 已完成（已覆盖 `engine/draw.js`；`rng.js` / `recorder.js` 可继续扩展）
> - ~~**D6** 抽检即可，lint 已经做了 90% 的工作。重点抽检新加入的游戏和最近重写的游戏。~~ ✅ 已完成（`games/*.js` 中 `Math.random` / `Date.now` / `performance.now` 零命中）

---

## 推荐执行顺序

1. ~~**先做 A**：结束并存期，减少后续每处改动的兼容面。~~ ✅ 已完成
2. ~~**再做 B**：修复最明显的体验回归，同时把 canvas 尺寸逻辑统一成新契约的一部分。~~ ✅ 已完成
3. ~~**再做 C1**：每日挑战是「确定性架构」最直接的卖点，实现成本低、传播价值高。~~ ✅ 已完成
4. ~~**再做 C2 / C3 / C4**：按产品优先级挑选，C2 与 C3 可并行。~~ ✅ 已完成
   - ~~**C3 深链路由** 先做，因为它是 C2 分享链接的基础。~~ ✅ 已完成
   - ~~**C2 分享回放** 随后，依赖 C3 的路由能力。~~ ✅ 已完成
   - ~~**C4 OG 图** 最后，它是营销增强。~~ ✅ 已完成
5. ~~**穿插 D**：D1 / D3 / D6 适合在其他任务之间顺手推进，不单独占用一个阶段。D2 / D4 / D5 已完成。~~ ✅ 已完成（D1–D6 全部完成）

---

## 全局验收标准

- `npm run build` 成功且 `dist/` 结构清晰。
- `npm test`（含 build + lint + jsdom + replay）全绿。
- 119 个金样本 `npm run test:replay` 全绿。
- 主页、游戏内、移动端触摸、PWA 离线四项手动冒烟通过。

---

## 下一步行动（立即可以开始）

1. ~~在 `app.js` 中实现 `route()` 函数与 hash 路由，完成 C3。~~ ✅ 已完成
2. ~~实现 C2 分享回放链接。~~ ✅ 已完成
3. ~~在 `index.html` 增加默认 Open Graph meta 标签，完成 C4 的 MVP。~~ ✅ 已完成
4. ~~进入 **D. 慢性工程优化** 阶段，推荐从以下顺手项开始：D2 / D4 / D5。~~ ✅ 已完成
   - ~~**D1 batch 1 + batch 2 + batch 3**（snake / tetris / shikaku 网格 + shikaku / mini4 / kakuro / wordsearch / fifteen / sliding / slide3 文字迁移至 `engine/draw.js`）✅ 已完成。~~
   - ~~**D3**（金样本覆盖策略：snake / tetris / g2048 / sudoku 各 3 条，总数 119）✅ 已完成。~~
   - ~~**D6**（rng 使用抽检：`games/*.js` 无非确定性源）✅ 已完成。~~
5. （可选）把 `engine/engine.js` 的 `tick` 计数器升级为单调逻辑时钟，彻底消除后台/节流对回放对齐的潜在影响。
