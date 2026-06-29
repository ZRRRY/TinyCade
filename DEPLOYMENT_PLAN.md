# TINYCADE 上线技术选型方案

> **版本**: v1.0
> **日期**: 2026-06-28
> **目标**: 将纯前端静态游戏站升级为可多人访问、数据持久化、具备扩展性的在线游戏平台

---

## 一、分阶段目标与里程碑

| 阶段 | 目标 | 核心价值 | 预估工时 |
|------|------|---------|---------|
| **Phase 1** | 基础部署上线 | 全球可访问，HTTPS，CDN 加速 | 1-2 天 |
| **Phase 2** | 用户系统 + 云存档 | 换设备进度不丢，支持排行榜 | 1-2 周 |
| **Phase 3** | 实时多人对战 | 2-3 款游戏支持联机（五子棋/井字棋等） | 2-3 周 |
| **Phase 4** | 运营监控 + 内容运营 | 数据驱动迭代，防刷分，活动支持 | 持续 |

---

## 二、Phase 1: 基础部署上线

### 2.1 达成目标
- [x] 全球用户可通过 HTTPS 访问
- [x] 首屏加载时间 < 2s（国内）/ < 1.5s（海外）
- [x] 修复已知安全漏洞（XSS、路径遍历）
- [x] 支持 PWA（可安装到桌面/手机主屏）
- [x] 游戏资源按需加载（代码分割）

### 2.2 技术选型

#### 方案 A: 国内优先（备案域名 + 国内 CDN）

| 组件 | 选型 | 理由 | 成本 |
|------|------|------|------|
| **静态托管** | 阿里云 OSS + CDN | 国内访问最快，稳定可靠 | ~¥10-30/月（流量费） |
| **域名** | 阿里云万网 / 腾讯云 DNSPod | 国内备案必需，支持 HTTPS | ~¥50-80/年 |
| **HTTPS** | 阿里云 CDN 免费证书 / Let's Encrypt | 自动续期 | 免费 |
| **DNS** | 阿里云 DNS / 腾讯云 DNSPod | 国内解析快，支持线路分流 | 免费版够用 |
| **构建/部署** | GitHub Actions + 阿里云 OSS 同步 | Push 代码自动部署 | 免费（GitHub） |

#### 方案 B: 海外优先（免备案，快速上线）

| 组件 | 选型 | 理由 | 成本 |
|------|------|------|------|
| **静态托管** | Vercel / Cloudflare Pages | 全球 CDN，自动 HTTPS，Git 集成 | 免费（个人项目） |
| **域名** | Cloudflare Registrar / Namecheap | 隐私保护，DNS 管理强 | ~$10-15/年 |
| **HTTPS** | 自动（Vercel/Cloudflare） | 完全自动化 | 免费 |
| **DNS** | Cloudflare DNS | 全球最快，支持 Worker 边缘计算 | 免费 |
| **构建** | 托管平台自动构建 | Push 即部署 | 免费 |

#### 方案 C: 混合（推荐）

| 场景 | 方案 |
|------|------|
| 国内用户为主 | 阿里云 OSS + CDN，域名备案 |
| 海外用户/快速验证 | Vercel + Cloudflare CDN |
| 两者都要 | 主站放阿里云 + 海外 fallback 到 Cloudflare |

> 💡 **推荐**：先走方案 B（Vercel），1 小时完成部署验证；确认有用户后再迁移到方案 C。

### 2.3 前端改造（Phase 1 必须）

| 改造项 | 说明 | 优先级 |
|--------|------|--------|
| 修复 `app.js:172` XSS | `e.message` 用 `textContent` 渲染 | 🔴 阻断 |
| 代码分割 | `games.js` + `games-extra.js` 按游戏拆分为独立 chunk，动态 `import()` | 🟡 高 |
| Service Worker | 添加离线缓存，支持 PWA 安装 | 🟡 高 |
| 资源预加载 | `<link rel="prefetch">` 热门游戏资源 | 🟢 中 |
| 字体优化 | `font-display: swap` + 字体子集化 | 🟢 中 |
| 图片压缩 | SVG 游戏图标已很轻量，无需改动 | - |

### 2.4 首屏加载预算

| 指标 | 当前 | 目标 | 手段 |
|------|------|------|------|
| HTML | ~5 KB | ~5 KB | - |
| CSS | ~16 KB | ~16 KB | - |
| JS 核心 | ~28 KB | ~28 KB | `app.js` + `sounds.js` |
| JS 游戏（首屏）| ~320 KB | **0 KB** | 懒加载，首屏不加载 |
| **总阻塞资源** | ~369 KB | ~50 KB | **代码分割** |
| **首屏时间** | ~3-5s | **< 1.5s** | CDN + 懒加载 + 压缩 |

---

## 三、Phase 2: 用户系统 + 云存档 + 排行榜

### 3.1 达成目标
- [x] 用户可匿名游玩，登录后进度自动同步
- [x] 换设备/浏览器后进度不丢失
- [x] 全局排行榜（总榜/周榜/日榜/分类榜）
- [x] 分数防作弊（服务端校验）
- [x] 离线可玩，联网后自动同步（降级策略）
- [x] 用户个人主页（已玩游戏、总时长、最高记录）

### 3.2 技术选型

#### 后端框架

| 选型 | 推荐场景 | 学习成本 | 生态 |
|------|---------|---------|------|
| **Node.js + Express** | 与原项目同技术栈，前端开发者易维护 | 低 | 最丰富 |
| **Node.js + Fastify** | 性能更好，Schema 校验内建 | 低 | 较丰富 |
| **Bun + Elysia** | 极快启动，现代 TypeScript | 中 | 新兴 |
| **Python + FastAPI** | 如果你有 Python 背景 | 低 | 很强 |

> **推荐：Node.js + Fastify**（与前端同栈，性能优于 Express，自带 JSON Schema 校验）

#### 数据库

| 选型 | 类型 | 适用场景 | 免费额度 | 推荐 |
|------|------|---------|---------|------|
| **PostgreSQL (Neon)** | 关系型 | 用户数据、游戏进度、排行榜 | 10 GB 存储 + 无限连接 | ⭐ 首选 |
| **PostgreSQL (Supabase)** | 关系型 | 需要实时订阅、Row Level Security | 500 MB | 备选 |
| **MongoDB Atlas** | 文档型 | 灵活 Schema，快速迭代 | 512 MB | 备选 |
| **SQLite (Turso)** | 边缘 SQLite | 极低延迟，Serverless 场景 | 8 GB | 备选 |

> **推荐：Neon PostgreSQL**（Serverless，按请求付费，自动扩缩容，适合从零开始）

#### 缓存

| 选型 | 用途 | 免费额度 | 推荐 |
|------|------|---------|------|
| **Redis (Upstash)** | 排行榜、会话、频率限制 | 10,000 请求/天 | ⭐ 首选 |
| **Redis (Fly.io)** | 自建 Redis，完全控制 | 3 GB 磁盘 | 备选 |

#### 认证

| 选型 | 方式 | 免费 | 推荐 |
|------|------|------|------|
| **Clerk** | 现成 UI 组件，支持 OAuth/密码/邮箱 | 10,000 MAU | ⭐ 海外首选 |
| **Lucia Auth** | 轻量框架，自建，灵活 | 完全免费 | 自建首选 |
| **自建 JWT** | 最轻量，完全可控 | 免费 | 国内备案场景 |

> **国内场景**：建议自建 JWT + 微信登录（需要企业资质），或先用匿名 UUID 方案。
> **海外场景**：Clerk 最快，1 小时集成。

#### 后端部署

| 选型 | 特点 | 成本 | 推荐 |
|------|------|------|------|
| **Vercel Functions** | 与前端同平台，Serverless | 免费额度够用 | 海外首选 |
| **Railway** | 一键部署，自动扩缩容 | $5/月起 | 海外备选 |
| **Fly.io** | 全球边缘部署，延迟低 | 免费额度 + $2-5/月 | 海外推荐 |
| **阿里云函数计算 FC** | 国内低延迟，按调用付费 | 免费额度 + ¥0.05/万次 | 国内首选 |
| **腾讯云 CloudBase** | 一体化（函数 + 数据库 + 存储） | 免费额度 | 国内备选 |

> **推荐组合**：
> - 海外：`Vercel`（前端）+ `Vercel Functions`（API）+ `Neon`（DB）+ `Upstash`（Redis）= **$0/月**
> - 国内：`阿里云 OSS`（前端）+ `阿里云函数计算 FC`（API）+ `阿里云 RDS PostgreSQL`（DB）= **~¥30-50/月**

### 3.3 数据架构设计

```sql
-- 用户表（匿名 + 注册）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT UNIQUE,           -- 浏览器指纹/LocalStorage UUID
  username TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 游戏进度表
CREATE TABLE game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  game_id TEXT NOT NULL,              -- 'snake', 'tetris', ...
  best_score INTEGER DEFAULT 0,
  total_played INTEGER DEFAULT 0,     -- 总游玩次数
  total_time INTEGER DEFAULT 0,       -- 总游玩时长（秒）
  unlocked_levels JSONB DEFAULT '{}', -- 已解锁关卡
  settings JSONB DEFAULT '{}',        -- 个人游戏设置
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- 分数记录表（每次提交一条，用于审计和防作弊）
CREATE TABLE score_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  play_duration INTEGER,              -- 本次游玩时长（秒）
  client_timestamp TIMESTAMPTZ,       -- 客户端时间
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,                       -- IP 哈希（防刷）
  user_agent_hash TEXT,               -- UA 哈希
  verified BOOLEAN DEFAULT FALSE,     -- 是否通过校验
  metadata JSONB DEFAULT '{}'         -- 额外校验数据
);

-- 排行榜（物化视图或 Redis Sorted Set 维护）
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  period TEXT NOT NULL,               -- 'all', 'daily', 'weekly', 'monthly'
  period_date DATE NOT NULL,          -- 2026-06-28
  user_id UUID REFERENCES users(id),
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  UNIQUE(game_id, period, period_date, user_id)
);
```

### 3.4 API 设计（REST）

```yaml
# 认证
POST   /api/auth/anonymous        # 匿名注册，返回 JWT
POST   /api/auth/oauth/{provider} # OAuth 登录（GitHub/Google）
GET    /api/auth/me               # 获取当前用户信息

# 进度
GET    /api/progress              # 获取所有游戏进度
GET    /api/progress/{game_id}    # 获取单个游戏进度
POST   /api/progress/{game_id}   # 保存游戏进度（JSON）

# 分数
POST   /api/scores                # 提交分数（带校验）
GET    /api/scores/leaderboard    # 获取排行榜（支持 game_id, period, limit）
GET    /api/scores/me             # 我的历史最高分

# 游戏元数据
GET    /api/games                 # 游戏列表（用于前端动态加载）
GET    /api/games/{id}/bundle     # 获取游戏代码包（用于懒加载）
```

### 3.5 分数防作弊方案

```
客户端提交：
  {
    "game_id": "snake",
    "score": 150,
    "play_duration": 120,       // 本次玩了多久
    "client_timestamp": "...",
    "signature": "sha256(...)"  // 可选：客户端加签
  }

服务端校验：
  1. 频率限制：同一用户 10 秒内只能提交 1 次
  2. 分数上限：贪吃蛇满分 = COLS * ROWS * 10，超限直接拒绝
  3. 时间校验：score 与 play_duration 的合理性（如 2048 每步至少 1 秒）
  4. 速率校验：分数增长率异常（如 1 秒内从 0 到 10000）
  5. IP 限制：同 IP 1 小时内超过 N 次异常提交则封禁
  6. 渐进验证：高分记录需要更严格的验证（如要求提交游戏回放数据）
```

### 3.6 离线降级策略

```javascript
// app.js 中的 save/load 改造为双写模式
async function saveProgress(gameId, data) {
  // 1. 先写本地（保证离线可用）
  localStorage.setItem(`tinycade-${gameId}`, JSON.stringify(data));
  
  // 2. 尝试同步云端（如果在线且已登录）
  if (navigator.onLine && currentUser) {
    try {
      await api.post(`/api/progress/${gameId}`, data);
      // 标记已同步
      localStorage.setItem(`tinycade-${gameId}-synced`, 'true');
    } catch (e) {
      // 标记待同步，下次联网时重试
      queueForSync(gameId, data);
    }
  }
}
```

---

## 四、Phase 3: 实时多人对战

### 4.1 达成目标
- [x] 选择 2-3 款适合的游戏支持实时对战（五子棋、井字棋、贪吃蛇竞技版）
- [x] 支持创建房间、加入房间、自动匹配
- [x] 断线重连（15 秒内可恢复）
- [x]  spectators 观战模式
- [x] 延迟补偿（适用于贪吃蛇等实时游戏）

### 4.2 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **实时通信** | Socket.io | 自动降级到 HTTP 长轮询， rooms 管理完善，生态成熟 |
| **备选** | WebSocket (原生 ws) | 更轻量，但需要自己处理重连和房间 | 
| **状态同步** | 权威服务器（Authoritative Server） | 服务器维护游戏状态，客户端只发送输入，防止作弊 |
| **匹配系统** | 简单队列 + ELO 评分 | 同水平匹配，后续可扩展 |
| **部署** | Fly.io / Railway / 阿里云 ECS | 需要长连接支持，Serverless 函数不适合 |

### 4.3 游戏改造范围

| 游戏 | 改造成本 | 实时性要求 | 同步策略 |
|------|---------|----------|---------|
| **五子棋** | 低 | 回合制 | 状态同步（每步验证） |
| **井字棋** | 极低 | 回合制 | 状态同步 |
| **贪吃蛇竞技** | 高 | 实时 | 帧同步 + 输入延迟补偿 |
| **俄罗斯方块对战** | 中 | 准实时 | 状态同步 + 垃圾行发送 |
| **2048 对战** | 中 | 回合制 | 状态同步 + 时间竞速 |

> 建议先从 **五子棋** 开始验证实时架构，再扩展到其他游戏。

---

## 五、Phase 4: 运营与监控

### 5.1 达成目标
- [x] 前端错误实时捕获（JavaScript 异常、游戏崩溃）
- [x] 性能监控（FPS、加载时间、API 延迟）
- [x] 数据埋点（热门游戏、留存、关卡通过率）
- [x] 内容运营（活动、限时挑战、每日任务）
- [x] 防刷分系统持续迭代

### 5.2 技术选型

| 领域 | 工具 | 用途 | 成本 |
|------|------|------|------|
| **错误监控** | Sentry | 前端异常捕获、堆栈追踪、用户影响分析 | 免费 5k 事件/月 |
| **性能监控** | Web Vitals API + 自建上报 | LCP/FID/CLS + 游戏 FPS | 免费 |
| **数据埋点** | Plausible / Umami | 隐私友好，无需 Cookie 弹窗 | ~$9/月或自建 |
| **Google Analytics** | 流量分析 | 用户来源、页面停留 | 免费 |
| **日志系统** | Grafana Loki / 阿里云 SLS | 服务端日志聚合 | 阿里云有免费额度 |
| **限流** | `express-rate-limit` / `redis-rate-limit` | API 防刷 | 免费 |
| **DDoS 防护** | Cloudflare / 阿里云 WAF | 边缘防护 | Cloudflare 免费 |

---

## 六、总成本估算（月度）

### 方案 A: 海外最小成本（适合个人/开源）

| 组件 | 服务 | 费用 |
|------|------|------|
| 静态托管 | Vercel / Cloudflare Pages | $0 |
| 域名 | Namecheap / Cloudflare | ~$1 |
| 后端 API | Vercel Functions (Hobby) | $0 |
| 数据库 | Neon PostgreSQL (Free Tier) | $0 |
| 缓存 | Upstash Redis (Free Tier) | $0 |
| 认证 | Clerk (Free Tier) | $0 |
| 监控 | Sentry (Free Tier) | $0 |
| 实时通信 | Fly.io (Free + 低用量) | $0-5 |
| **总计** | | **$0-6/月 (~¥0-45)** |

### 方案 B: 国内生产级（适合正式运营）

| 组件 | 服务 | 费用 |
|------|------|------|
| 静态托管 + CDN | 阿里云 OSS + CDN | ~¥20-50 |
| 域名 | 阿里云万网 | ~¥5/月 |
| 后端 API | 阿里云函数计算 FC | ~¥0-20（按调用） |
| 数据库 | 阿里云 RDS PostgreSQL（最小型） | ~¥50-100 |
| 缓存 | 阿里云 Redis 或自建 | ~¥30-50 |
| 监控 | 阿里云 SLS + Sentry | ~¥0-30 |
| WAF/DDoS | 阿里云 WAF 基础版 | ~¥0-50 |
| **总计** | | **~¥105-305/月** |

> 💡 **建议**：先用方案 A（海外免费）验证产品需求，有用户后再迁移到方案 B。

---

## 七、实施路线图（推荐）

### 第 1 周：Phase 1 上线
- [ ] 修复 `app.js` XSS 漏洞
- [ ] 前端代码分割（按游戏拆 chunk）
- [ ] 添加 PWA Service Worker
- [ ] 部署到 Vercel / Cloudflare Pages
- [ ] 配置自定义域名 + HTTPS
- [ ] 性能测试（Lighthouse 评分 > 90）

### 第 2-3 周：Phase 2 核心
- [ ] 搭建后端 API（Node.js + Fastify）
- [ ] 创建 Neon PostgreSQL 数据库
- [ ] 实现匿名用户系统（UUID + JWT）
- [ ] 实现游戏进度云同步 API
- [ ] 实现排行榜（Redis Sorted Set）
- [ ] 实现分数防作弊校验
- [ ] 前端接入 API（替换 LocalStorage 为双写模式）
- [ ] 部署后端（Vercel Functions 或 Fly.io）
- [ ] 集成 Sentry 错误监控

### 第 4-5 周：Phase 2 完善
- [ ] 用户登录页（OAuth 接入）
- [ ] 排行榜页面 UI
- [ ] 个人主页（数据统计）
- [ ] 离线模式优化（断网提示 + 同步队列）
- [ ] 数据埋点接入（Plausible/Umami）
- [ ] 安全加固（CSP、Rate Limit、输入校验）

### 第 6-8 周：Phase 3 实时对战（可选）
- [ ] 搭建 Socket.io 服务器
- [ ] 五子棋实时对战改造
- [ ] 房间系统（创建/加入/匹配）
- [ ] 断线重连机制
- [ ] 观战模式
- [ ] 负载测试（100 并发房间）

### 第 9 周+：Phase 4 持续运营
- [ ] 数据看板搭建
- [ ] 运营活动支持（限时挑战、每日任务）
- [ ] 社区反馈收集
- [ ] 性能持续优化

---

## 八、最终架构图

### 完整架构（Phase 2+3）

```
┌─────────────────────────────────────────────────────────────┐
│                        用户端                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 浏览器 A │  │ 浏览器 B │  │ 浏览器 C │  │ 手机 App │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │ HTTPS
        ┌─────────────────┴─────────────────┐
        │          CDN 边缘节点               │
        │  ┌─────────────────────────────┐   │
        │  │  静态资源 (HTML/CSS/JS/Game)  │   │
        │  └─────────────────────────────┘   │
        └─────────────────┬─────────────────┘
                          │ API Request
        ┌─────────────────┴─────────────────┐
        │           后端服务层                 │
        │  ┌─────────────────────────────┐   │
        │  │  API Gateway (Fastify)      │   │
        │  │  ├── Auth Middleware (JWT)  │   │
        │  │  ├── Rate Limit             │   │
        │  │  ├── Score Validation       │   │
        │  │  └── Progress Sync          │   │
        │  └─────────────────────────────┘   │
        │  ┌─────────────────────────────┐   │
        │  │  Socket.io Server (实时)     │   │
        │  │  ├── Room Management        │   │
        │  │  └── Game State Sync        │   │
        │  └─────────────────────────────┘   │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
   │  Neon   │     │ Upstash │     │  Object │
   │PostgreSQL│     │  Redis  │     │ Storage │
   │         │     │         │     │(可选)   │
   │ 用户数据 │     │ 排行榜   │     │ 游戏资源 │
   │ 游戏进度 │     │ 会话缓存 │     │         │
   │ 分数记录 │     │ 限流计数 │     │         │
   └─────────┘     └─────────┘     └─────────┘
```

---

## 九、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 用户量突增，免费额度耗尽 | 服务中断 | 提前设置告警，准备付费升级方案 |
| 恶意刷分 | 排行榜失真 | 多层校验 + 渐进验证 + 人工审核通道 |
| 实时对战延迟高 | 用户体验差 | 优先状态同步游戏，实时游戏用预测/回滚 |
| 数据丢失 | 用户流失 | 数据库自动备份 + 写入确认机制 |
| 国内访问慢 | 海外托管 | 国内用户多时迁移到阿里云 + 备案 |
| 浏览器兼容性 | 部分用户无法游玩 | 保持原生 API，避免实验性功能，测试覆盖 Chrome/Safari/Firefox |

---

> 本方案基于"最小可行成本优先，逐步扩展"的原则。如果你有特定的预算限制或技术栈偏好，可以进一步调整。

**下一步建议**：先完成 Phase 1（修复漏洞 + 部署到 Vercel），验证用户兴趣后再投入 Phase 2 后端开发。需要我为某个具体阶段生成详细实现代码吗？
