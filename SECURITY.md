# Security Policy

## 支持的版本

当前版本：**1.1.0**（及以上）。主分支上的最新提交都会接受安全修复。

## 上报漏洞

请发送邮件到：**security@example.com**（示例地址，请根据实际修改）。
有效的漏洞报告会在 7 天内得到回应。

## 已知问题

详见 [CODE_REVIEW.md](CODE_REVIEW.md) 中的历史问题列表。

### 1.1.0 修复
- C1 XSS in `app.js` 错误提示
- C2 Path Traversal in `server.js`
- H4 贪吃蛇死循环
- H1/H2 后台 / localStorage 错误处理
- H6 prefers-reduced-motion

## 部署安全最佳实践

1. **HTTPS：** 公开部署时使用 HTTPS。Caddy 默认自动申请 ACME 证书。
2. **CSP：** 生产环境务必使用我们提供的 CSP，限制三方脚本。
3. **Subresource Integrity：** 如果使用外部 CDN，请为 Google Fonts 加上 SRI（不过默认是同源加载）。
4. **资源版本化：** 资源走过一个构建脚本，为各个资源加上哈希，利于长期缓存。
5. **不要在前端代码中保存敏感信息**（本项目仅使用 `localStorage` 存储个人进度，不上传服务器）。

## 隐私

- 本项目不会上传用户任何信息到服务器（因为服务器不接受请求）。
- 如果你加入了第三方错误上报服务（Sentry / Bugsnag 等），请在隐私政策中说明。
