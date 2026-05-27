# 部署手册

> Critical 项目的部署、监控、运维指南。

## 部署架构

```
访客
  ↓
Cloudflare CDN
  ↓
Vercel (frontend)  ←→  Render (backend)  ←→  MongoDB Atlas
                            ↓
                        Cloudflare R2 (固件)
                            ↓
                        SMTP / Sentry
```

---

## 前置准备（首次部署）

### 1. 创建账户

| 服务             | 用途                            | 费用              |
| ---------------- | ------------------------------- | ----------------- |
| GitHub           | 代码托管 + Render/Vercel 部署源 | 免费              |
| Render           | 后端托管                        | 免费层            |
| Vercel           | 前端托管                        | Hobby 免费        |
| MongoDB Atlas    | 数据库                          | M0 免费           |
| Cloudflare       | DNS + R2（M5 起）               | 免费              |
| Sentry           | 错误监控                        | 免费 5k errors/月 |
| PayPal Developer | 支付（M4 起）                   | 免费              |

### 2. 域名配置

把域名 NS 指向 Cloudflare：

- `zcritical.co` → 主营销站（Vercel）
- `api.zcritical.co` → 后端 API（Render）
- `cdn.zcritical.co`（M5 起） → R2 固件 CDN

---

## 后端部署（Render）

### 步骤

1. **创建 Web Service**
   - Repo 选 `critical/`
   - Root Directory: `backend/`
   - Environment: `Docker`
   - Region: `Singapore`
   - Plan: Free

2. **配置环境变量**（参考 `.env.example`）：

   ```
   NODE_ENV=production
   PORT=4000
   FRONTEND_URL=https://zcritical.co
   MONGODB_URI=mongodb+srv://...
   JWT_ACCESS_SECRET=<openssl rand -hex 32>
   JWT_REFRESH_SECRET=<openssl rand -hex 32>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<strong password>
   ADMIN_EMAIL=admin@zcritical.co
   SENTRY_DSN=https://...@sentry.io/...
   ```

3. **健康检查**
   - Path: `/api/health`
   - 返回 200 即认为存活

4. **首次部署后**
   - 访问 `https://api.zcritical.co/api/health` 验证
   - Admin 用上面的用户名密码登录 `/admin`，立即修改密码

### 防止冷启动

Render 免费层 15 分钟空闲会休眠，首次请求 ~30 秒冷启动。

解决方案：UptimeRobot / Cron-Job.org 每 5 分钟 ping `/api/health`：

```
https://uptimerobot.com → 添加 Monitor
URL: https://api.zcritical.co/api/health
Interval: 5 minutes
```

---

## 前端部署（Vercel）

### 步骤

1. **导入项目**
   - Repo: `critical/`
   - Root Directory: `frontend/`
   - Framework: Next.js

2. **环境变量**：

   ```
   NEXT_PUBLIC_BACKEND_URL=https://api.zcritical.co
   NEXT_PUBLIC_SITE_URL=https://zcritical.co
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

3. **域名绑定**
   - Project Settings → Domains
   - 添加 `zcritical.co` 和 `www.zcritical.co`
   - 在 Cloudflare DNS 添加对应 CNAME

4. **Preview 部署**
   - 每个 PR 自动有 preview URL
   - PR 合并到 `main` 自动部署到生产

---

## 数据库部署（MongoDB Atlas）

### 步骤

1. **创建 M0 集群**
   - Region: Singapore（与 Render 同区域）
   - Cluster Tier: M0 Free

2. **创建数据库用户**
   - Database Access → 添加用户
   - 权限：`Atlas admin`（V1）
   - 密码用密码管理器生成

3. **配置网络访问**
   - Network Access → IP Whitelist
   - 添加 Render 出站 IP（Render 文档中可查）
   - 或临时 `0.0.0.0/0`（仅 V1，生产环境必须收紧）

4. **获取连接字符串**
   - `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/critical`
   - 填入 Render 的 `MONGODB_URI`

### 备份策略

M0 不支持自动备份。临时方案：

```bash
# 每周手动备份（在 critical/backend 目录运行）
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d)
```

升级到 M2（$9/月）即得自动连续备份。

---

## CI / CD

### GitHub Actions（待 M2 实施）

`.github/workflows/ci.yml` 在每个 PR 跑：

- `pnpm typecheck` — TypeScript 检查
- `pnpm lint` — ESLint
- `pnpm test` — Vitest 单元测试
- `pnpm build` — 验证可构建

`pnpm audit --audit-level=high` 检查依赖漏洞。

### 部署触发

- `main` 分支合并 → Render + Vercel 自动部署到生产
- PR 创建 → Vercel 自动 preview URL（后端 PR 不自动 preview，手动测）

---

## 监控

### 关键指标

| 指标           | 目标      | 监控位置           |
| -------------- | --------- | ------------------ |
| 后端可用性     | 99%       | UptimeRobot        |
| 前端 LCP       | < 2.5s    | Vercel Analytics   |
| API P95 延迟   | < 500ms   | Sentry Performance |
| 错误率         | < 0.1%    | Sentry             |
| MongoDB 连接数 | < 400/500 | Atlas 监控         |

### 告警配置

- **Sentry** → Slack/邮件告警，P0 错误立即通知
- **UptimeRobot** → 后端宕机邮件通知
- **MongoDB Atlas** → CPU > 80% 邮件通知

---

## 故障排查

### 后端 502 / 503

```bash
# 查 Render 日志
render logs --service=critical-backend --tail

# 常见原因
1. MongoDB 连接超时 → 检查 Atlas IP 白名单
2. 内存超限 → Render 免费层 512 MB 上限
3. 启动失败 → 检查环境变量是否齐全
```

### 前端 404 / 500

```bash
# 查 Vercel 日志
vercel logs --since=1h

# 常见原因
1. 后端未启动 → 调用 API 返回 500
2. 路由未生成 → next build 失败，看 Vercel 构建日志
3. 环境变量缺失 → NEXT_PUBLIC_* 没配
```

### 数据库连接异常

```javascript
// 在后端 logs 里搜索 mongoose 错误
// 常见：ServerSelectionTimeoutError
// 解决：
1. 检查 MONGODB_URI 是否正确
2. Atlas Network Access 是否允许 Render IP
3. 数据库用户密码是否正确
```

---

## 回滚

### Render

```bash
# 在 Render Dashboard
Deployments → 选择上一个稳定版本 → Rollback
```

### Vercel

```bash
# 在 Vercel Dashboard
Deployments → 选择上一个版本 → Promote to Production
```

### MongoDB

```bash
# 从备份恢复
mongorestore --uri="$MONGODB_URI" --drop ./backup-20260520
```

---

## 安全清单（生产环境）

- [ ] 所有 secrets 通过环境变量注入，不硬编码
- [ ] JWT secrets 至少 32 字节随机数
- [ ] Admin 默认密码已修改
- [ ] MongoDB 网络访问白名单收紧（不是 0.0.0.0/0）
- [ ] HTTPS 强制（Cloudflare → Always Use HTTPS）
- [ ] CSP 已启用（生产环境）
- [ ] CSRF 双提交 cookie 已启用
- [ ] Rate limit 已配置（全局 + 关键路由）
- [ ] Sentry 已接入并验证报错
- [ ] 关键操作有审计日志
- [ ] 备份策略已建立（即使是手动）
