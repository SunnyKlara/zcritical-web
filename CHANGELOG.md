# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。
> 版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.0.0] — 2026-05-26

> 闭环里程碑全部交付：访客 → 留资 → 下单（PayPal） → 发货 → 设备激活 → 固件 OTA。
> 38 个测试全绿，3 个 workspace typecheck/build 全部通过。

### Added — i18n + 主题

- 5 个营销组件深度国际化：`OverviewSection` / `FeaturesSection` / `SpecsSection` / `UseCasesSection` / `AppShowcaseSection` 全部使用 `useTranslations()`。zh.json + en.json 各 292 个 key
- `pnpm --filter frontend check-i18n` 脚本 + CI 集成，任何 zh/en 漂移会让 CI 红条
- `next-intl` 完整链路（中间件 / sitemap hreflang / 根 layout alternates）
- `next-themes` light/dark/system 三态切换
- Tailwind 文本与表面 token 改用 CSS 变量驱动（`--text-primary` / `--surface-card` ...），light 主题运行时切换无需 JS 条件 className
- Navbar / Footer 全部用语义 token 写就

### Added — 商务闭环

- M4 交易：Product / Order / PaymentEvent 模型，PayPal Orders API v2，Webhook 验签，原子库存扣减，订单超时自动清理
- M5 固件：Firmware 模型 + 灰度发布 + 序列号 hash 分流 + semver 比较
- M6 设备：Device 模型 + 激活 + 心跳 + 邮箱自动绑定订单
- 邮件三件套：订单确认 / 发货 / 退款，zh/en 双语 HTML 模板
- Seed 脚本（`pnpm --filter backend seed`）：1 个商品 + 2 个变体 + v1.0.0 固件 + 默认管理员，幂等可重跑
- Checkout 走真实 `/api/products` 接口（变体切换 / 动态价格 / 加载/错误态）

### Added — 工程化

- `@vitest/coverage-v8` 集成 + 覆盖率门槛（shared 90%，backend 30-50%）
- `pnpm test:coverage` 一键跑全 workspace 覆盖率
- 后端 OpenAPI 3.1 规范（`/api/openapi.json`）
- request-id 中间件（贯穿 HTTP / 日志 / 错误响应）
- 优雅关闭（HTTP → Socket.io → Sentry flush → MongoDB）
- compression 中间件 + Pino 敏感字段 redact
- `AppError` 统一错误类
- Bundle analyzer（`pnpm --filter frontend build:analyze`）
- Lighthouse CI 配置
- UI primitive 库：Button / Card / Input / Badge + `cn()` 助手
- Playwright E2E 扩展：locale routing / OG/PWA assets / security headers / order/checkout / 404 / sitemap hreflang
- 程序化生成的 SVG 资源：`og-cover.svg` / `icon.svg` / `icon-maskable.svg` / `apple-touch-icon.svg` / `hero-poster.svg`（无需等真实素材即可上线）

### Added — 安全

- Helmet CSP / CORS / HSTS / X-Frame-Options
- 速率限制（登录 5/min、表单 3/min、全局 300/min）
- CSRF 双提交 cookie
- bcryptjs cost 12
- AuditLog 模型记录所有管理员操作
- security.txt at `/.well-known/security.txt`
- CodeQL 周扫 + PR 扫
- Dependabot 按 ecosystem 分组

### Reference

- [架构总图](./docs/ARCHITECTURE.md)
- [开发路线图](./docs/ROADMAP.md)
- [架构决策记录](./docs/DECISIONS.md)
- [延期工作清单](./docs/DEFERRED.md)
- [30 分钟交接文档](./docs/HANDOVER.md)

---

## [0.1.0] — initial M1-M3

### Added (M1 — 品牌展示站)

- Next.js 14 App Router + Tailwind + Framer Motion
- 8 大功能展示 / APP 展示 / 硬件规格 / 4 维概览 / 使用场景
- SEO meta + JSON-LD + 响应式
- 4 个独立页面（`/firmware` / `/support` / `/download` / `/blog`）
- 设计 tokens（颜色 / 字体 / 间距 / 动效）

### Added (M2 — 询盘转化)

- monorepo 骨架（pnpm 9 workspaces：frontend / backend / shared）
- `@critical/shared` 包：Zod schemas + 业务常量 + Socket.io 事件名
- 后端 Express 服务：MongoDB + Pino + Helmet + CORS + 速率限制
- `POST /api/leads` 询盘提交（含 Zod 校验、蜜罐防爬虫、邮件通知）
- 邮件通知服务（Nodemailer SMTP）
- Sentry 后端钩子
- Docker 化 + Render 部署蓝图

### Added (M3 — 后台 + 客服)

- JWT 双 token（access 15min + refresh 7d httpOnly）
- User / AuditLog / Session / Message 模型
- Admin 路由组（dashboard / leads list / lead detail / chat）
- Socket.io 实时客服（自动重连、输入指示器、未读计数）
- AuthProvider + authFetch
