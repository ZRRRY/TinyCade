# TINYCADE 运维手册 (RUNBOOK)

面向产品 / 运维 / SRE 同学。本项目是一个纯静态网站，所以运维重点不是服务端代码，而是 **CDN / 缓存 / 可观测性**。

## 1. 部署

### 推荐: 静态代理 / CDN + 云函数

```
本项目 → npm run build → dist/ → 上传到宿主机 / CDN
```

不需要 Node 运行时。但本项目附带了一个独立的 Node 服务器（含安全头部 / 限流 / ETag / Range），可以直接使用。

| 部署方式 | 适合 | 动作 |
| ---- | ---- | ---- |
| Vercel / Cloudflare Pages | 海外用户，需要全球 CDN 加速 | `vercel deploy` 或推送到 GitHub 进行自动部署 |
| Nginx 自建 | 国内用户，需要备案 | 使用本项目附带的 `nginx.conf` |
| Caddy | 快速部署 + 自动 HTTPS | `caddy run --config Caddyfile` |
| Node 服务器 | 中小型部署，需要动态能力 | `node server.js --root dist --port 8088` |
| Docker | 跨平台 / K8s | `docker build -t tinycade . && docker run -p 8088:8088 tinycade` |

### 检查部署

```bash
# 主页可访问
curl -I https://your-domain.example.com/

# 资源压缩生效
curl -H "Accept-Encoding: br" -I https://your-domain.example.com/index.html
# 期望: Content-Encoding: br, Cache-Control: no-cache

# 安全头部
curl -I https://your-domain.example.com/ | grep -E "Content-Security|X-Frame|Content-Type-Options|Referrer|Permissions"

# 健康检查
curl https://your-domain.example.com/healthz
# 期望: {"status":"ok",...}
```

## 2. 缓存策略

本项目使用 **3 层缓存**：

| 层 | 资源 | 缓存策略 | 生效条件 |
| ---- | ---- | ---- | ---- |
| 1. 浏览器 / Service Worker | HTML, JS, CSS, sounds | Cache-Control + ETag | 每次请求都会检查 ETag |
| 2. CDN / 反向代理 | HTML | no-cache | 每次都回源 |
| 2. CDN / 反向代理 | JS/CSS 未哈希 | 1 小时 | 发布后需重启 CDN 清缓存 |
| 2. CDN / 反向代理 | 带 sha256 哈希的资源 | 1 年 immutable | 哈希变化重新部署后自动夹载 |
| 3. 源服务器 | 同上 | 同上 | 如果没有 CDN |

**发布新版本时**：

1. 运行 `npm run build`，生成新的 `dist/`
2. 所有资源名都会变化（含 sha256 哈希）
3. 推送到 CDN / 主机
4. CDN 不需手动夹载旧资源（哈希不同了）
5. 老用户会在 1 小时后拿到新 HTML，然后在 1 年内重复使用新资源

## 3. 可观测性

### 端点

- `GET /healthz` — liveness probe (返回 `{status:"ok",uptime,ts}`)
- `GET /metrics` — 请求计数、状态码分布、路由分布、总字节数
- `POST /api/feedback` — 用户反馈 (body: `{message: "..."}`)
- `POST /api/vitals` — Web Vitals 上报 (body: `{m:"LCP",v:1234,...}`)

这些都不需要底层存储，仅保留在内存中（最后 200 条）。

### 推荐接入

1. 用 Prometheus 代理 / `node_exporter` textfile 收集 `/metrics` 输出（需要中转一下）。
2. 用 Grafana 可视化 RPS / p95 / 错误率。
3. 使用 uptime 服务如 UptimeRobot / BetterStack 监控 `/healthz`。
4. 严重告警阈值：p95 > 500ms 连续 5 分钟 / 错误率 > 1% 连续 1 分钟。

### 日志

本服务器本身不记日志，依赖外部集成：

- 使用 Docker 时，容器标准输出会被 Docker / K8s 收集
- 部署到 Vercel / Cloudflare 时，他们提供访问日志
- 如需深入调试，在服务器前加个 nginx 代理打 access log

## 4. 限流

默认: 240 req/min/IP。

可以调为合适值：

```bash
node server.js --max-req 1000 --window-ms 60000
```

或者个别代理的限流（如 Cloudflare Rate Limiting）。

## 5. 部署检查清单

发布前走一遍：

- [ ] `npm test` 全部通过
- [ ] `npm run build` 生成 dist/ 成功
- [ ] `×` `package.json` 中 version 与 `version.js` 中一致
- [ ] `×` `CHANGELOG.md` 记录了今次变更
- [ ] 任何变更都从 main 分支，不在生产环境上直接 push
- [ ] CDN 上一版本被清空（但不是必要的，哈希会自动过期）
- [ ] 首页在浏览器中正常加载，DevTools 控制台无 error
- [ ] 使用 Lighthouse 跑一次，Performance / Accessibility / Best Practices / SEO 都应 >= 90
- [ ] 查看 `/healthz` 返回 ok
- [ ] 查看 `/metrics` 有请求计数上去

## 6. 嬸见故障

### 首页白屏

- **可能**: Service Worker 缓存了旧版本
- **解决**: DevTools > Application > Service Workers > Unregister
- **或**: 清除浏览器缓存

### 加载报 404

- 检查 CDN 是否过滤了 `.br` / `.gz` 后缀
- 检查 `dist/` 中的 `index.html` 中引用的资源是否都存在

### Web Audio 不作用

- iOS Safari 要求用户交互后才能启动 AudioContext
- 首次点击任何按钮后音效应当恢复

### 限流进入

- `×` 670 + req/min 从同一 IP 会被 429
- 调大 `--max-req` 或订阅外部限流服务

## 7. 上线前检查清单 (Go-Live Checklist)

- [ ] DNS 解析正常
- [ ] HTTPS 证书有效（Let's Encrypt / ACME 自动申请）
- [ ] HSTS 头部已设置
- [ ] CSP 头部已设置（不依赖 unsafe-inline / unsafe-eval）
- [ ] SRI 已生成并生效
- [ ] /healthz 访问快速
- [ ] 50 用户 / 200 用户 压测表现稳定
- [ ] 11 款代表游戏可玩 (贪吃蛇 / 俄罗斯方块 / 2048 / 扫雷 / 猜数字 / 黑白棋 / 井字棋 / 猜单词 / 数独 / 像素鸟 / 24)
- [ ] Lighthouse 评分 Performance / Accessibility ≥ 90
- [ ] 错误上报路径明确
- [ ] 退出机制 (SIGTERM 干净关闭)

## 8. 附录

### 一次完整的发布流程

```bash
# 1. 修改 / 增加代码
git checkout -b feature/my-change
# ... 修改 ...
git commit -m "feat: ..."

# 2. 运行测试
npm test
npm run build

# 3. 推送到主分支，CI 走一遍
git push origin feature/my-change
# 创建 PR → 合并到 main

# 4. main 推送后 CI 会构建並上传 dist/
# 5. CDN 自动拉取新版本
# 6. 你的用户在 1 小时内拿到新 HTML，后续资源加载为 1 年缓存
```

### 关键资源与文件

- 服务器源码: `server.js` (~250 行)
- 游戏代码: `games.js` + `games-extra.js` (~6000 行)
- 主控: `app.js` (~310 行)
- 资源: `index.html` + `style.css` + `sounds.js` + `sw.js` + `manifest.webmanifest`
- 部署: `Dockerfile` + `nginx.conf` + `Caddyfile` + `vercel.json`
- 测试: `test/lint.js` + `test/smoke.js` + `test/server-test.js` + `test/jsdom-smoke.js` + `test/load-test.js`
- 环境架构素描: `DEPLOYMENT_PLAN.md`、`README.md`、`SECURITY.md`、`CHANGELOG.md`、`CODE_REVIEW.md`、`RUNBOOK.md` (this file)
