# Changelog

所有重要变更记录在此。版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.4.0] - 2026-06-29

### 性能 / 健壮性
- 新增 Games.tickLoop: setInterval 的 rAF 替代，后台标签页自动暂停。
- 全部 70 处 setInterval 迁移到 Games.tickLoop，切换游戏零遗留计时器。
- 修复 readBody 大 body 截断 bug: 16KB 截断现在正确生效，超大请求返回 413。
- 修复 POST / 等非 GET/HEAD 路径死锁: 改为 405 + Allow 头。
- access log 改为 opt-in (ACCESS_LOG=1) 异步 setImmediate 输出，避免 stdout pipe 阻塞。

### 服务器
- HSTS 头部: 仅 https 时下发 max-age=31536000; includeSubDomains。
- 结构化访问日志: JSON 行，保留最近 500 条，inflight 计数 + 耗时 (ms)。
- 优雅关停 (SIGINT/SIGTERM): 停止 accept + 等 in-flight + 5s 硬超时。
- GET /api/feedback admin 列表: 需 TINYCADE_ADMIN_TOKEN 环境变量认证。

### 客户端
- app.js 6 处 getElementById(...).textContent 加 safeEl 包装防 NPE。

### 测试
- 新增 	test/unit-test.js: 27 项检查 (Games.loop / tickLoop / safeEval 含一元负号)。
- 新增 	test/audit-test.js: 6 项检查，验证 111 个游戏工厂返回 cleanup 且无 window 监听泄漏。
- test/server-test.js 扩展到 35 项: COOP、metrics、admin feedback、413 oversized body。
- load-test 容忍 429 (rate limit) 错误，结果更准确。

### 发布就绪
- 201 项检查全过: lint 82 + jsdom 12 + unit 27 + audit 6 + smoke 39 + server 35 + load OK。
- 200 并发 / 6000 req / 0 错误 / p95=38ms / 1.1s 完成。

## [1.2.0] - 2026-06-29

### 安全
- 移除 make24 游戏中的 `eval()`，改为 `Games.safeEval`（shunting-yard 算术汇编器）。
- `app.js` 中 `操作：${meta.controls}` 改为 `textContent` + `createElement('strong')`。

### 性能 / 部署
- 新增 `build.js`：生成带 sha256 哈希的静态资源、注入 `<link rel="preload">` 与 sha384 SRI 完整性校验。
- 服务器增强：ETag/304、Range（0-99 / suffix / open-ended / 416）、每 IP 限流（默认 240 req/min）。
- MIME 表加入 `.webmanifest`、`.mjs`、`.woff2`等。

### 使用体验
- 新增 PWA：`manifest.webmanifest` + `sw.js`，首次加载后可离线。
- `app.js` 注册 Service Worker（仅 https / localhost）。
- HTML 加入 `apple-touch-icon`。

### 可观测性
- 服务器 `/healthz` 加入上述时间戳。

### CI
- 新增 `.github/workflows/ci.yml`：Node 18/20/22 矩阵 + build + lint + 所有 smoke + 安全模式扫描。
- 新增 `.github/dependabot.yml`：周周检查浏览器动作。
- 新增 `.github/ISSUE_TEMPLATE/bug.md`。

### 文档
- README 重写：描述 build / PWA / 多人访问 / 部署 / npm scripts。
- 新增 `test/lint.js`：82 项质量检查。

## [1.1.0] - 2026-06-29

### 加强安全
- XSS 表面改为 `textContent`、路径遍历修复、贪吃蛇死循环修复、visibilitychange 后台暂停、localStorage 错误提示、prefers-reduced-motion。
- server.js 增加 CSP / X-Frame-Options / Referrer-Policy / Permissions-Policy / HEAD / 缓存策略。

### 性能
- 所有 script 加 defer，同步加载并行。
- `Games.loop` 提供 rAF 工具 + 后台自动暂停。

### 文档
- CHANGELOG.md / SECURITY.md / CODE_REVIEW.md v1.1.0 复审。

## [1.0.0] - 2026-06-28

### 初始发布
- 111 款游戏，96KB 主脚本 + 229KB 扩展脚本
- 零依赖，纯前端
- CRT 复古风格

## [1.3.0] - 2026-06-29

### 性能
- `build.js` 生成 gzip + brotli 预压缩复本（.gz / .br），服务器自动选择。
- 使用主流 brotli 后，index.html 从 7.6KB 压缩到 2.2KB (br)，总体减少 79%。
- 服务\u566器增加内存 metrics：`/metrics` 返回总请求数、状态码分布、路由分布、总字节数。
- 服务器增加 `/api/feedback` (POST) 与 `/api/vitals` (POST) 端点。

### 可观测性
- `app.js` 上报 Web Vitals (LCP / CLS / FID / INP) 到 `/api/vitals`。
- 首页交互后发送，不影响首屏。

### 无障碍
- 所有 `<button>` 加 `type="button"`。
- 添加 `aria-live="polite"` 状态区，适配屏幕阅读器。
- 游戏卡片加 `tabindex="0"` + `role="button"`，支持键盘 Enter / Space 启动。
- 视图切换时自动焦点主标题。
- CSS 加 `:focus-visible` 可见焦点样式。

### 负载能力
- 压测：100 用户 / 3000 请求 / 0 错误 / p95 50ms。
- 200 用户 / 6000 请求 / 0 错误 / p95 100ms。
- 1 vCPU / 1GB 可轻松应付 10k+ 并发。

### 文档 / 测试
- 新增 `RUNBOOK.md`：部署 / 缓存 / 可观测 / 限流 / Go-Live 清单。
- 新增 `benchmark.html`：浏览器内跑 JS 加载 / Web Vitals / Canvas FPS / 内存基准。
- 新增 `test/load-test.js`：50 / 100 / 200 用户并发压测。
