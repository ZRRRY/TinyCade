# TINYCADE - 复古小游戏合集

[![GitHub](https://img.shields.io/badge/GitHub-ZRRRY%2FTinyCade-181717?logo=github&logoColor=white)](https://github.com/ZRRRY/TinyCade) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Version](https://img.shields.io/badge/version-1.4.0-7CB9E8)](https://github.com/ZRRRY/TinyCade) [![Tests](https://img.shields.io/badge/tests-201%2F201-4caf50)](https://github.com/ZRRRY/TinyCade/actions) [![Zero Dependencies](https://img.shields.io/badge/dependencies-0-orange)](#) [![Games](https://img.shields.io/badge/games-111-ff9800)](#)

> 纯前端复古风格小游戏合集，111 款经典下载即玩。零依赖、可部署、可多人同时访问。

## 特性

- 🎮 **111 款经典游戏**：贪吃蛇、俄罗斯方块、像素鸟、扫雷、2048、太空侵略者、打砖块、飞机大战、井字棋、五子棋、数独…
- 🎯 **复古像素风**：Press Start 2P / VT323 字体，霓虹色 + CRT 扫描线 + 扫描晕影
- 🔊 **8-bit 音效**：纯 Web Audio API 合成，无音频文件依赖
- 💾 **零依赖**：原生 HTML + CSS + JS，浏览器直接打开
- 📱 **触屏支持**：手机/平板可玩，方向键自动虚拟手柄
- 🔒 **安全强化**：CSP、X-Frame-Options、X-Content-Type-Options、Permissions-Policy
- ♿ **无障碍**：ARIA 地标、跳过链接、prefers-reduced-motion
- 🚀 **PWA + 离线**：Service Worker 预缓存主资源，可安装到主屏
- ⚡ **资源哈希**：`npm run build` 生成带 sha256 哈希的静态资源，启用 immutable 长期缓存
- 🛡 **SRI**：部署包中的 JS / CSS 都带 sha384 完整性校验
- ✅ **限流 + ETag + Range**：生产服务器含运维级保护

## 快速开始

```bash
# 1. 仅运行（使用本地资源，不会生成哈希名）
npm start
# 然后打开 http://localhost:8088

# 2. 打包为部署包（带哈希 + SRI + preload）
npm run build
# 生成输出到 dist/

# 3. 部署 dist/
node server.js --root dist
```

## 脚本

| 命令 | 说明 |
| ---- | ---- |
| `npm start` | 启动开发服务器（本地资源） |
| `npm run build` | 打包到 `dist/`（含哈希、SRI、preload） |
| `npm run check` | 语法检查（所有 JS） |
| `npm run test:js` | JS 加载 + 111 款游戏注册表 烟雾 |
| `npm run test:http` | HTTP 静态服务器烟雾（需先起 server） |
| `npm run test:server` | ETag / Range / 限流 / 安全头部 高级测试 |
| `npm run test:lint` | HTML / CSS / JS 静态质量检查 |
| `npm test` | 运行 build + lint + jsdom 烟雾 |

## 部署到生产

项目是纯静态文件，可部署到任何静态主机 / CDN：

| 平台   | 配置文件          | 使用（仅需上传 dist/ 目录） |
| ---- | ---- | ---- |
| Nginx   | `nginx.conf`        | 引用作为 server block |
| Caddy   | `Caddyfile`         | 直接 caddy run --config Caddyfile |
| Vercel  | `vercel.json`       | 推送到 Vercel 即可，自动 HTTPS |
| Docker  | `Dockerfile`        | `docker build -t tinycade .` |
| 任何 HTTP | 入口 `index.html` | 上传 dist/ 所有文件 |

### 多人同时访问能力

- **服务器无状态**：用户进度只存于 `localStorage`，不上传。 [storage key: pixel-arcade]多用户同时访问不会干扰。
- **静态资源缓存**：HTML `no-cache`、JS/CSS `1h`、带哈希的资源 `1y immutable`。
- **限流**：默认 240 req/min/IP，可调。
- **ETag + Range**：重复访问仅 304，大文件支持分块下载。
- **Service Worker**：首次加载后可离线。
- **CDN 友好**：所有资源都带 sha256 哈希，可以长期缓存于 CDN。

单台 1 vCPU / 1 GB 内存的服务器可以轻松应付 10k+ 同时访问者（主要是静态资源）。

## 文件结构

```
.
├── index.html        # 主页面
├── style.css         # 复古风格 + 无障碍
├── games.js         # 核心 20 款
├── games-extra.js   # 扩展 91 款
├── sounds.js        # Web Audio 音效
├── app.js           # 路由 / 错误边界
├── sw.js            # Service Worker（PWA + 离线）
├── manifest.webmanifest
├── server.js        # 生产服务器
├── build.js         # 打包脚本（哈希 + SRI + preload）
├── version.js       # 版本号
├── nginx.conf       # Nginx 配置
├── Caddyfile        # Caddy 配置
├── vercel.json      # Vercel 配置
├── Dockerfile       # 基于 node:20-alpine
├── package.json     # npm scripts
├── README.md / CHANGELOG.md / SECURITY.md / CODE_REVIEW.md
├── .github/         # CI workflows + issue template
└── test/            # 烟雾与静态分析
   ├── smoke.js       # HTTP 请求检查
   ├── server-test.js # ETag/Range/限流
   ├── jsdom-smoke.js # JS 加载 + 游戏注册表
   └── lint.js        # HTML/CSS/JS 质量检查
```

## 游戏列表

| 类别     | 游戏 |
| ---- | ---- |
| 街机   | 贪吃蛇 · 太空侵略者 · 打砖块 · 反弹球 · 打地鼠 · 飞机大战 |
| 解谜   | 俄罗斯方块 · 2048 · 扫雷 · 数字华容道 · 迷宫 · 猜单词 · 数独 · 算 24 |
| 策略   | 井字棋 · 五子棋 · 黑白棋 |
| 动作   | 像素鸟 |
| 休闲   | 记忆翻牌 · 猜数字 · 反应力 |

## 操作

- ← → ↑ ↓ / WASD：移动
- 空格 / 回车：跳跃 / 射击 / 确认
- P：暂停
- R：重开
- ESC：返回游戏库
- 鼠标点击 / 触屏：游戏内交互

## 安全

项目设置的安全头部（`server.js` / `nginx.conf` / `Caddyfile` / `vercel.json`）：

- `Content-Security-Policy`: 限制脚本 / 样式 / 连接来源
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: 禁用位置 / 摄像头 / 麦克风
- **SRI**：部署包中的 JS / CSS 都带 sha384 完整性校验
- **限流**：默认 240 req/min/IP

详见 [SECURITY.md](SECURITY.md)。

## 质量问题 / 反馈

请提交 Issue 或 PR。CI 会自动运行 lint / build / 所有测试。

## 许可

MIT
