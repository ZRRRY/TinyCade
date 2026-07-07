# TINYCADE 游戏 Bug 汇总报告

> 检查日期：2026-07-07  
> 检查范围：`games/` 目录下 103 款游戏  
> 检查方法：
> 1. 复跑既有自动化测试（`npm test`、unit/audit/lint/coverage/replay）
> 2. 静态代码审查（逐文件人工审阅 + 自定义 fuzz/static 脚本）
> 3. 浏览器实机验证（Playwright）部分关键 bug

## 1. 概览

- **既有已知 bug（GAME_ISSUES.md 2026-07-05）**：4 个运行时崩溃、1 个死循环、3 个 `over` 未初始化、48 个画布尺寸失配。
- **当前状态**：上述 bug 已全部修复，`npm test` 全绿（7 组测试 0 fail，119 个 replay 金样本全部通过）。
- **本次新发现 bug**：约 **70+** 个，分布在 **55+** 款游戏中。
  - 🔴 P0 — 严重（游戏无法玩 / 必然卡死 / 核心机制损坏）：~20 个
  - 🟠 P1 — 中等（逻辑错误 / 计分错误 / AI 异常 / 无法结束）：~35 个
  - 🟡 P2 — 轻微（事件名不对 / 文案与操作不符 / 视觉偏差）：~20 个

> 注：部分 bug 兼具多种影响，下文按最严重的维度归类。

## 2. 既有 Bug 修复验证

| 文件 | 旧 Bug | 状态 |
|------|--------|------|
| `games/connect4.js` | `checkWin` 数组越界 | ✅ 已修复，边界检查完整 |
| `games/jetpack.js` | `render()` 引用未定义 `input` | ✅ 已修复，`player.thrust` 缓存 |
| `games/match3.js` | 消除循环数组越界 | ✅ 已修复，`i + 1 < N` 判断 |
| `games/ringtoss.js` | 命中后 `ring = null` 未 break | ✅ 已修复，加了 `break` |
| `games/mathrush.js` | `gen()` 死循环 | ✅ 已修复，safety + fallback |
| `games/dotsboxes.js` | `over` 未初始化 | ✅ 已修复，`reset()` 初始化 `over=false` |
| `games/go.js` | `over` 未初始化 | ✅ 已修复 |
| `games/sudoku.js` | `over` 未初始化 | ✅ 已修复 |
| 48 款游戏 | 画布尺寸失配 | ✅ 已全部补齐 `meta.width/height` |

自动化测试结果：

```
npm test        → 7 pass / 0 fail
npm run test:unit  → 33 pass / 0 fail
npm run test:audit → 2 pass / 0 fail
npm run test:lint  → 1187 pass / 0 fail
test-cov3.cjs   → Total issues: 0
test-cov6.cjs   → Total issues: 0
replay-test.js  → 119 个金样本全部通过
```


## 3. 🔴 P0 — 严重 Bug（游戏无法玩 / 必然卡死 / 核心机制损坏）

### 3.1 `games/frogjump.js` — 谜题无解

- **位置**：`create()` 初始状态 + `move()` 逻辑
- **问题**：初始状态为 `[null,null,null,'g','r','r','r']`，规则要求 `'g'` 最终到达索引 6、`'r'` 在 3–5。但 `'g'` 只能向左跳（`'r'` 只能向右跳），而 `'g'` 左侧有 3 个空位，右侧被红蛙占据，永远无法到达右端。
- **修复**：使用经典初始 `['g','g','g',null,'r','r','r']`，并反转移动方向（绿蛙向右、红蛙向左）。

### 3.2 `games/skijump.js` — 无法离开蓄力阶段

- **位置**：`update()` 中 `var prevA` 声明
- **问题**：`prevA` 在 `charge` 分支内用 `var` 声明，函数作用域但每次 `update` 重新赋值，导致释放检测永远为 `undefined`，玩家无法起跳。
- **修复**：将 `let prevA = false;` 提升到 `create()` 作用域，在 `reset()` 中重置，并在 `charge` 分支末尾更新。

### 3.3 `games/whackamole.js` — 只有中心洞可击中

- **位置**：`update()` 第 47–50 行
- **问题**：`input.pressed.a` 硬编码 `const i = 4`，只有 9 个洞中的中心洞能被敲到。
- **修复**：用方向键移动光标，按 A 敲击光标所在洞；或接入真实鼠标/触摸坐标。

### 3.4 `games/pac.js` — 下方向无效 + 地图列数不一致

- **位置**：第 22–44 行（`MAP`）、第 76 行（方向映射）
- **问题**：
  1. `MAP` 各行长度 19–21 不等，但 `COLS = 21`，短行右侧出现 `undefined`，程序将其视为可行走，会穿墙。
  2. `input.pressed.down` 被映射为 `pac.dir = 0`，而 `if (pac.dir)` 会跳过方向 0，且移动数组索引 0 都是 0，导致“下”完全无效。
- **修复**：统一 `MAP` 每行长度为 21；将 down 映射为独立方向（如 4），并扩展 `nx/ny` 数组。

### 3.5 `games/kakuro.js` — 首格正确即判胜

- **位置**：`check()` 第 41 行
- **问题**：只要“已填”的格子都正确就触发 `win`，但棋盘大部分是空的，填对第一个数字即可获胜。
- **修复**：要求整个棋盘完全填满且与 `SOL` 一致才判胜。

### 3.6 `games/mini4.js` — 开局已是完整解

- **位置**：`reset()` 第 25–41 行
- **问题**：`reset()` 把完整解复制到 `board`，只标记 6 个给定格，其余非空格也从未清空，玩家一开始面对的就是答案。
- **修复**：`board` 初始化为空，仅填入 6 个给定数字。

### 3.7 `games/sokoban.js` — 关卡无法获胜

- **位置**：`MAP` 第 20 行
- **问题**：地图含未定义字符 `'X'`，箱子 `'$'` 仅 2 个而目标点 `'.'` 有 5 个，`done === total` 永远不满足。
- **修复**：重制地图，使箱子数=目标点数，并将 `'X'` 替换为合法字符（墙/地板/箱子等）。

### 3.8 `games/colorcode.js` — 无法真正选择颜色/提交

- **位置**：`update()` 第 55 行
- **问题**：`sel` 初始 `[0,0,0,0]` 后从未被玩家输入修改，`pressed.a` 只能触发自动猜测，玩家无法按描述选色或提交。
- **修复**：增加光标移动与颜色切换逻辑；或修改 `meta.controls` 以匹配自动演示行为。

### 3.9 `games/jigsaw.js` — 无法真正交换拼图块

- **位置**：`update()`
- **问题**：`meta.controls` 写“点击两个相邻块交换”，但代码只有 `pressed.a` 触发随机 `autoSwap`，无选择与交换逻辑。
- **修复**：实现选块与相邻交换；或更新 controls 文案。

### 3.10 `games/path.js` — 无法手动连线

- **位置**：`update()`
- **问题**：controls 写“拖动连接所有点”，但只处理 `pressed.a` 随机自动连接。
- **修复**：实现拖拽/点击连线；或更新 controls 文案。

### 3.11 `games/dash.js` — 地面障碍物必然碰撞

- **位置**：`spawn()` / `update()` 第 47 行
- **问题**：低矮障碍物 `y: GROUND - 30, h: 30` 贴地生成，而玩家没有跳跃能力，无法躲避。
- **修复**：仅生成高位障碍，或给玩家跳跃能力。

### 3.12 `games/bowling.js` — 球提前停止，无法全中

- **位置**：第 45、50、66 行
- **问题**：`ball.vx = 0`，且 `ball.y < 100` 时清零垂直速度，球会在约 y=92 处冻结，只能打到前两排瓶子。
- **修复**：保持球持续前进，或按输入时机给水平速度；延长/重置时间限制。

### 3.13 `games/knight.js` — 骑士永远打不到龙

- **位置**：第 43、49、63 行
- **问题**：
  1. `knight.x` 被钳制在 `[20, 200]`，龙在 `x=380`，无法进入攻击范围。
  2. 火球生成高度 `y=130` 与骑士碰撞高度 `GROUND-20=260` 不一致，永远打不到。
  3. 一次挥砍持续 10 帧，可连续多次命中龙。
- **修复**：放宽移动范围；火球生成在骑士高度；挥砍命中后加 flag 防止重复伤害。

### 3.14 `games/rps.js` — 游戏永远不会结束

- **位置**：`get over()` 第 35 行
- **问题**：`get over() { return false; }`，与 `meta` 描述的“三局两胜”不符。
- **修复**：`return wins[0] >= 2 || wins[1] >= 2;` 并在 `update` 中结束后忽略输入。

### 3.15 `games/speedmath.js` — 答案不可能输入

- **位置**：第 24–25 行
- **问题**：`a, b` 均在 0–49，答案可达 98，但玩家只能用 left/right 在 0–9 之间循环，大量题目无解。
- **修复**：限制答案为个位数，或实现多位数输入。

### 3.16 `games/reversi.js` — AI 不会翻转棋子

- **位置**：第 78–79 行
- **问题**：AI 先落子再调用 `getFlips`，但 `getFlips` 对非空起点返回空数组，导致 AI 只放子不翻转。
- **修复**：先计算翻转列表，再落子并应用翻转。

### 3.17 `games/checkers.js` — AI 无合法步时死锁

- **位置**：第 108–112 行
- **问题**：黑方无合法步时 `blackAutoStep()` 返回 `false`，`turn` 不切换，每 tick 重复失败，游戏卡死。
- **修复**：无步可走时判该方负。

### 3.18 `games/laser.js` — 激光方向与出口检测全错

- **位置**：第 32、53、57–58、70 行
- **问题**：
  1. 激光始终创建为水平条，方向切换逻辑与移动逻辑不一致。
  2. 出口检测只判断“在出口左上角右下方”，玩家远离出口矩形也能触发胜利。
- **修复**：垂直激光用 `w:4, h:H` 并振荡 y；出口做完整矩形碰撞。

### 3.19 `games/shapematch.js` — 按 A 永远正确

- **位置**：第 25、33–43 行
- **问题**：`current.type` 总是被设为目标形状类型，导致比较永远为真，`deny` 分支永不执行。
- **修复**：`current.type` 应独立于目标，按 A 时只比较当前类型与目标类型。

### 3.20 数组遍历中删除元素导致跳过（多处）

以下游戏在 `forEach` 中调用 `splice` 删除当前元素，导致后续元素被跳过：

| 文件 | 位置 | 影响 |
|------|------|------|
| `games/bomber.js` | 第 84–86 行 | 敌人/火焰检测跳过 |
| `games/brick.js` | 第 64 行 | 砖块消除跳过、可能误删 |
| `games/centipede.js` | 第 60 行 | 子弹/蜈蚣检测跳过 |
| `games/robo.js` | 第 57–63 行 | 子弹/敌人检测跳过 |

- **修复**：改用 `for` 倒序遍历，或用 `filter` 在循环结束后移除。


## 4. 🟠 P1 — 中等 Bug（逻辑错误 / 计分错误 / AI 异常 / 无法正常结束）

### 4.1 游戏结束状态异常

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `flash.js` | `over` 永远为 `false`，不 emit 任何结束事件 | 第 45 行 | 设置 `over=true` 并 emit `gameover` |
| `bridges.js` | `over` 声明但从未设为 `true` | 第 69–76 行 | 所有岛度数匹配时设 `over=true` 并 emit `win` |
| `bombthrow.js` | 消灭全部坦克后 `over` 仍为 `false` | 第 23 行 | `if (tanks.every(t=>!t.alive)) { over=true; api.emit('win'); }` |
| `castle.js` | 超时/胜利后直接 `reset()`，`over` 不生效 | 第 52–58 行 | 设 `over=true` 并 emit 结束事件后再决定重置 |
| `colorswitch.js` | 碰撞后 emit `gameover` 但立即 `reset()` | 第 25、49、69 行 | 碰撞时设 `over=true` 并停止更新 |
| `runnerplat.js` | 碰撞 emit `gameover` 并 `reset()`，但 `over` 仍为 `false` | 第 55 行 | 设 `over=true` 或去掉 `gameover` 事件 |
| `platformer.js` | `over` 后仍继续处理输入/物理 | 第 74–82 行 | `update` 开头 `if (over) return;` |
| `planedodge.js` | `over` 后仍继续计分/生成障碍 | 第 58 行 | `update` 开头 `if (over) return;` |
| `avalanche.js` | `over` 后仍继续生成球和加分 | 第 36、51 行 | `update` 开头 `if (over) return;` |
| `thunder.js` | 撞机只 emit `gameover` 并 `reset()`，`over` 不生效 | 第 71–75 行 | `if (dead) { over=true; api.emit('gameover'); return; }` |
| `tictactoe.js` | 结束后 `BTN.b` 无法重开 | 第 53 行 | 把 `p.b` 重开判断放到 `if (over) return;` 之前 |
| `frogger.js` | 超时无 `gameover` 事件；到岸只发 `win` | 第 68–69 行 | 超时 emit `gameover`；完成 5 圈 emit 最终胜利事件 |

### 4.2 计分 / 状态重置错误

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `brick.js` | 清完砖块调用 `reset()` 把 `score` 清零 | 第 68 行 | 保留 `score` 或分层处理胜利 |
| `castle.js` | `reset()` 清空 `score` | 同上 | 胜利/超时不应清空分数 |
| `letters.js` | 猜对后 emit `win` 然后 `reset()`，`score` 与 `over` 全丢 | 第 28、30 行 | 获胜后不要 `reset()` |
| `fruitpunch.js` | 超时 emit `gameover` 后 `reset()`，`score` 丢失 | 第 43 行 | 设 `over=true` 并保留分数 |
| `mathrush.js` | 超时后按 A 仍可加分 | 第 53 行 | `if (input.pressed.a && !over)` |
| `speedmath.js` | 超时后按 A 仍可加分 | 第 44–48 行 | `if (time <= 0) return;` |
| `slot.js` | `score <= 0` 后仍继续扣费，可变成负数 | 第 33–39 行 | `if (score <= 0) return;` |
| `stacker.js` | `reset()` 保留 base block 但 `score=0`，显示不一致 | 第 26、43 行 | 初始 `score=1` 或用 `stack.length-1` 计算 |
| `runner.js` | 碰撞在非最后一条命时也 emit `gameover` | 第 52 行 | 有命时 emit `hit`，命尽才 emit `gameover` |
| `pong.js` | 每次失分都 emit `gameover` | 第 50–51 行 | 失分发 `score`，比赛结束才发 `gameover` |
| `wordsearch.js` | 找到一个单词就 emit `win`，且最后一词会 emit 两次 | 第 75–76 行 | 单个单词发 `found`，全部找完才发 `win` |
| `connect4.js` | 棋盘满时无和棋检测，游戏死锁 | 第 61–68 行 | `aiPickCol` 返回 -1 或每步后检查满盘 |
| `gomoku.js` | 棋盘满时无和棋检测 | 第 62–80 行 | 满盘且无人五连则判和 |
| `go.js` | AI 20 次自杀点后 turn 不切换，玩家被锁死 | 第 81–86 行 | 尝试耗尽后 pass 或认输 |

### 4.3 碰撞 / 移动 / 控制逻辑错误

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `golf.js` | 速度方向与方向键/箭头相反 | 第 45–46、97 行 | 修正 `cos/sin` 符号（canvas y 向下） |
| `glider.js` | 碰撞箱与渲染精灵不匹配 | 第 50–51、60 行 | 使用与 `fillRect` 一致的 `y-4` 到 `y+4` 范围 |
| `jetpack.js` | 碰撞只检测中心点，16px 高角色头尾可穿墙 | 第 54 行 | 检测完整高度 `player.y ± 8` |
| `planedodge.js` | 墙壁与飞机碰撞区间计算错误 | 第 31–32 行 | 用真实区间重叠和完整飞机高度检测 |
| `pong.js` | 球已飞过球拍仍可能判定击中 | 第 44、47 行 | 检测球边与球拍边的重叠 |
| `runner.js` | 跳跃时碰撞仍使用地面 y | 第 51 行 | 用当前渲染的 `py` 计算碰撞 |
| `dino.js` | 下蹲 hitbox 未降低；`fly` 标志被忽略 | 第 49、55、57、76 行 | 下蹲时降低 hitbox；按 `o.fly` 直接判断 |
| `frogger.js` | 越界判断 `frog.x > COLS` 应为 `>=` | 第 63 行 | `frog.x >= COLS` |
| `bowling.js` | 见 P0 | - | - |
| `ski.js` | 撞后保留危险树、删除安全树，易连续撞 | 第 52 行 | 清除屏幕附近树或全部清空 |

### 4.4 AI / 规则 / 判定错误

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `mancala.js` | `sow()` 按种子数判断所有者，应使用坑索引 | 第 37 行 | `const owner = start >= 7 ? 1 : 0;` |
| `match3.js` | 只记录匹配起点，长匹配/垂直匹配清除不全 | 第 28–31、62–65 行 | 标记所有匹配格再整列下落 |
| `blackjack.js` | 长手可能把 52 张牌抽完，`deck.pop()` 返回 `undefined` | 第 43、47、52、72 行 | 抽空前重新洗牌 |
| `hex.js` | 邻居列表错误，漏掉 `[x+1,y-1]`/`[x-1,y+1]`，多了 `[x-1,y-1]`/`[x+1,y+1]` | 第 43 行 | 修正六轴邻居坐标 |
| `guess.js` | 重复数字会重复计算 B | 第 36–37 行 | 先算 A，再用剩余数字配对 |
| `knight.js` | 见 P0 | - | - |
| `kungfu.js` | `rng.range(0,1)` 永远返回 0；攻击多段伤害 | 第 53、64–69、72–80 行 | `rng.range(0,2)`；加单次攻击命中 flag |
| `sudoku.js` | `fillNext()` 光标在给定格时直接返回 | 第 75 行 | 移除提前返回，让函数搜索下一个空格 |
| `timing.js` | 绿区命中判断 off-by-one，终点被排除 | 第 36–39 行 | 归一化角度后用区间中心判断 |
| `wordsearch.js` | 单词可能未放入网格仍被随机“找到” | 第 30–50、55–62 行 | 保证放置或只从已放置列表中抽取 |
| `pipes.js` | 旋转不影响连通性，胜利条件无效 | 第 46、49–56 行 | 根据 `r` 计算实际开口方向 |
| `spiral.js` | 首次按 A 时 `vy=0`，`vy=-vy` 仍为零，球不垂直移动 | 第 25、52 行 | 首次给非零垂直初速度 |
| `sword.js` | counter 阶段自动命中，不按 A | 第 64–68 行 | `if (input.pressed.a && rng() < 0.05)` |
| `swordslash.js` | 炸弹命中后不被移除，可反复扣命 | 第 54 行 | 炸弹分支返回 `false` 或设 `over=true` |
| `snake.js` | 食物极小概率生成在蛇身上 | 第 30–32 行 | 预计算空格列表再随机 |
| `dotsboxes.js` | 填完盒子后 `over` 不设置；`serialize` 硬编码 `over:false` | 第 69、90、94、129 行 | 满盘检测；返回真实 `over` |
| `dotsboxes.js` | `select` 切换 kind 后坐标可能越界 | 第 85 行 | kind 切换后钳制坐标 |
| `colorcode.js` | 见 P0 | - | - |

### 4.5 控制映射 / 文案不符

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `mazeball.js` | 用 `input.held.a/b` 当作方向键，实际应为方向键 | 第 52–53 行 | 使用 `left/right/up/down` |
| `minesweeper.js` | `meta.controls` 写“R 重开”但无 R 处理 | `meta.controls` | 增加 R 键处理或改文案 |
| `killer.js` | `meta.controls` 写“点击格子 · 输入 1-9”，实际用方向键+a/b | `meta.controls` | 更新文案 |
| `platformer.js` | 注释写“space 跳跃”但只检测 `up` | 第 46 行 | `input.pressed.up || input.pressed.space` |
| `dice.js` | 只按 `select` 能进入下一轮，controls 未说明 | 第 38、49 行 | 自动重置 `you/cpu` 或更新 controls |
| `sudoku.js` | controls 写数字键/空格，实际只有 a/b | `meta.controls` | 更新文案 |
| `kakuro.js` | controls 写“输入 1-9”，实际用 a/b 循环 | `meta.controls` | 更新文案 |
| `jigsaw.js` | 见 P0 | - | - |
| `path.js` | 见 P0 | - | - |


## 5. 🟡 P2 — 轻微 Bug（事件名 / 文案 / 视觉 / 边界体验）

| 文件 | 问题 | 位置 | 修复建议 |
|------|------|------|----------|
| `connect4.js` | `meta` 缺少 `width/height`（内部 420×360） | `meta` | 添加 `width:420, height:360` |
| `bullethell.js` | `meta` 缺少 `height`（内部 H=480） | `meta` | 添加 `width:400, height:480` |
| `rps.js` | 开局前渲染 `GEST[you]` 为 `undefined` | 第 59 行 | `you >= 0 ? ... : 'CHOOSE!'` |
| `dice.js` | 平局结果颜色为绿色 | 第 66 行 | 平局用黄色 |
| `bean.js` | 分数文字 baseline 导致顶部可能出界 | 第 65 行 | 使用 `top` baseline 或调整 y |
| `fishing.js` | 未钓中后 `hook.y` 不重置，逐渐下沉 | 第 56 行 | 返回 wait 时 `hook.y = 50` |
| `fishing.js` | 5 条鱼死后不再刷新，分数封顶 | 第 23–29、52–54 行 | 钓中后生成新鱼 |
| `blackjack.js` | 平局（push）不 emit 事件 | 第 76–79 行 | `else if (state === 'push') api.emit('push');` |
| `pong.js` | 见 P1 事件问题 | - | - |
| `platformer.js` | 平台碰撞严格 `>` 导致每帧抖动 | 第 57 行 | 使用 `>=` |
| `fruitninja.js` | 炸弹切片后不被移除，可多次扣命 | 第 58 行 | 炸弹分支返回 `false` |
| `dotsboxes.js` | AI 走完最后一线后游戏卡住 | 见 P1 | 满盘检测 |
| `runner.js` | 见 P1 事件问题 | - | - |
| `mathrush.js` | 见 P1 | - | - |
| `speedmath.js` | 见 P1 | - | - |

## 6. 已确认 OK 的游戏

以下游戏在本次审查中未发现运行时错误、数组越界、空引用、死循环、明显逻辑/计分/AI 缺陷：

`archery`, `asteroids`, `balldrop`, `catapult`, `clicker`, `coinflip`, `colormemory`, `dots`, `duckshoot`, `fifteen`, `fill`, `flappy`, `g2048`, `gunslinger`, `hangman`, `hunter`, `ice`, `jumperp`, `make24`, `maze`, `memory`, `mousetest`, `nim`, `ninja`, `numbermem`, `reaction`, `shikaku`, `shooter`, `simon`, `slide3`, `sliding`, `space`, `tetris`。

> 注：这些游戏在本次审查范围内未发现需要修复的 bug，但不排除存在非常隐蔽的平衡性或体验问题。

## 7. 浏览器实机验证记录

- **`frogjump.js`**：初始画面显示 3 只红蛙在右、绿蛙在左，与代码一致，谜题确实无解。
- **`skijump.js`**：进入画面后显示 “CHARGE”，按操作说明按住/松开 A 无法进入跳跃，证实 stuck-in-charge bug。

## 8. 修复优先级建议

1. **立即修复 P0**：`frogjump`, `skijump`, `whackamole`, `pac`, `kakuro`, `mini4`, `sokoban`, `colorcode`, `jigsaw`, `path`, `dash`, `bowling`, `knight`, `rps`, `speedmath`, `reversi`, `checkers`, `laser`, `shapematch` 以及所有 `forEach` 中 `splice` 的问题。
2. **尽快修复 P1**：游戏结束状态异常、计分重置错误、AI/判定错误、碰撞检测错误。
3. **最后处理 P2**：事件名、controls 文案、缺失的 meta 尺寸、视觉微调。

---
*报告生成时间：2026-07-07*  
*检查者：Kimi Code CLI*
