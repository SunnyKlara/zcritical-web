# 延期工作清单（DEFERRED）

> 版本: v1.0 · 日期: 2026-05-26
>
> 本文档详细记录了 Critical 项目当前**没有完成**或**有意延后**的工作事项。
> 每一项都明确标注：所属层级 / 影响范围 / 推荐的解决方式 / 预估工作量。
>
> 阅读建议：按 Tier 顺序阅读。Tier 1 是上线前必做，Tier 4 是技术债务，可以等到团队规模/流量需要时再处理。

## 已完成里程碑（M1~M6）

闭环已跑通：访客 → 留资 → 下单（PayPal）→ 发货 → 设备激活 → 固件 OTA。
38 个测试全绿，3 个 workspace typecheck/build 全部通过。
详见 [`HANDOVER.md`](./HANDOVER.md) 和 [`ROADMAP.md`](./ROADMAP.md)。

---

## Tier 1 — 上线前必须完成

> 这些事项不做，网站可以跑但无法对外发布。

### 1.1 静态资源（图片 / 视频 / 图标）

**当前状态**：所有 `<Image src=...>` 引用的资源（产品图、Hero 视频、OG 封面）都是占位路径，实际文件不存在。

**需要交付的文件**

| 路径                             | 用途                             | 规格                    | 备注                                                   |
| -------------------------------- | -------------------------------- | ----------------------- | ------------------------------------------------------ |
| `public/images/og-cover.jpg`     | Open Graph 分享卡封面（PNG/JPG） | 1200×630 JPG / PNG      | 已有 SVG 占位 (`og-cover.svg`)，社媒兼容性更好则换 PNG |
| `public/images/hero-poster.jpg`  | Hero 视频封面（视频未加载时）    | 1920×1080               | 已有 SVG 占位 (`hero-poster.svg`)                      |
| `public/videos/hero-bg.mp4`      | Hero 背景视频                    | 1920×1080, ≤5MB, H.264  | 没有则降级到 Canvas 粒子动效                           |
| `public/videos/hero-bg.webm`     | Hero 背景视频（VP9）             | 同上                    | Safari 优先 mp4                                        |
| `public/images/product-*.jpg`    | 产品主图（黑色 / 白色变体）      | 1600×1200 / 800×800     | 商品列表 / Checkout / Order email 都用                 |
| `public/images/hero-{1,2,3}.jpg` | 产品多角度展示                   | 1600×1000               | OverviewSection 滚动展示                               |
| `public/icons/icon-192.png`      | PWA Android 图标                 | 192×192 PNG             | 当前 SVG (`icons/icon.svg`) 已可用                     |
| `public/icons/icon-512.png`      | PWA Android 图标 / Apple touch   | 512×512 PNG             | 当前 SVG 已可用                                        |
| `public/icons/icon-maskable.png` | PWA maskable 图标                | 512×512 PNG，安全区 80% | 当前 SVG (`icons/icon-maskable.svg`) 已可用            |
| `public/screenshots/app-*.png`   | APP 6 个功能页截图               | 750×1624 / 1080×1920    | AppShowcaseSection 轮播                                |
| `public/manuals/critical-v1.pdf` | 产品说明书（下载中心）           | A4 PDF                  | `/[locale]/download` 引用                              |

**推荐工具链**

- 图片优化：Squoosh / sharp / ImageMagick（生产环境配合 `next/image` 自动转 AVIF/WebP）
- 视频压缩：HandBrake / ffmpeg（H.264 baseline 兼容旧设备 + VP9 高压缩比）
- PWA 图标：使用 [maskable.app](https://maskable.app/) 生成 maskable 版本

**估时**：摄影/视频拍摄 2-3 天 + 后期 1-2 天。

### 1.2 第三方服务凭证（环境变量）

**当前状态**：所有 `.env.example` 列出了变量，但生产环境对应账号尚未开通。

| 凭证                       | 服务          | 用途                            | 必需性                         |
| -------------------------- | ------------- | ------------------------------- | ------------------------------ |
| `SMTP_HOST/USER/PASS/FROM` | SendGrid 等   | Lead 通知 / 订单邮件 / 退款邮件 | 必须 — 否则邮件全部静默丢弃    |
| `NOTIFY_EMAIL`             | —             | 接收 Lead 通知的内部邮箱        | 必须                           |
| `SENTRY_DSN`               | Sentry        | 错误追踪                        | 强烈建议                       |
| `PAYPAL_CLIENT_ID/SECRET`  | PayPal        | 创建订单 / 抓取付款             | 必须 — 没有则 Checkout 报错    |
| `PAYPAL_WEBHOOK_ID`        | PayPal        | 验签 webhook                    | 必须 — 否则 webhook 被恶意伪造 |
| `JWT_ACCESS_SECRET`        | —             | 生成访问 token                  | 必须 — 必须 ≥32 字节随机字符串 |
| `JWT_REFRESH_SECRET`       | —             | 生成刷新 token                  | 必须 — 与 access 不同          |
| `R2_*`（AWS\_\*）          | Cloudflare R2 | 固件二进制托管                  | M5 全功能需要                  |
| `MONGODB_URI`              | Atlas         | 生产数据库                      | 必须                           |

**推荐流程**

1. SendGrid 注册免费 100/天 方案 → 验证发件域名（DKIM + SPF + DMARC 全配）
2. PayPal 开发者中心创建 Live App → 启用 Webhook，订阅 `PAYMENT.CAPTURE.COMPLETED` `PAYMENT.CAPTURE.REFUNDED` 等事件
3. Sentry 创建 frontend + backend 两个项目，分别配置 DSN
4. MongoDB Atlas M0 起步 → 配置 IP allowlist（Render 出口 IP）
5. JWT secrets：`openssl rand -hex 32` 生成两个不同的值
6. **凭证入库**：使用 Render 环境变量界面注入，不要 commit 到 git

**估时**：账号开通 + 域名验证 1 天 + 配置 1 天。

### 1.3 域名 / SSL / DNS

**当前状态**：项目假设域名为 `critical.bike`（在 metadata / sitemap / sentry 等多处引用）。

**待办**

- [ ] 注册 `critical.bike`（或选定的实际域名）
- [ ] DNS 解析到 Vercel（前端） + Render（API）
- [ ] CNAME `api.critical.bike` → Render 服务域
- [ ] `email.critical.bike` MX/CNAME → SendGrid（domain authentication）
- [ ] 配置 CAA 记录（限制能签发证书的 CA）
- [ ] 双向同步 Cloudflare Access + Render Hostname

如果域名不是 `critical.bike`，需要全局替换：

- `frontend/src/app/layout.tsx` 中的 `metadataBase`
- `frontend/src/app/sitemap.ts` 中的 base URL
- `frontend/src/app/robots.ts`
- `backend/src/config/env.ts` 中的 `FRONTEND_URL` / `BACKEND_URL` 默认值
- 多个邮件模板里的 `support@critical.bike`

### 1.4 Lighthouse 基线（Performance ≥ 90）

**当前状态**：Lighthouse CI 配置已就绪（`frontend/lighthouserc.json`），但未跑过 baseline。

**预期需要优化的项目**

- LCP — Hero 视频未压缩 → 至少压到 ≤3MB
- 字体加载 — 确保 `next/font` 在 production 中生成 woff2 + 使用 font-display: swap
- 第三方脚本 — Sentry / Web Vitals 全部 lazy-load
- 图片 — 通过 `next/image` 强制 AVIF/WebP

**推荐流程**：上线后立即跑一次 `pnpm --filter frontend exec lhci autorun --collect.url=https://critical.bike` 拿到 baseline，然后逐项优化到 ≥90。

---

## Tier 2 — 上线后第一周内完成

> 这些事项不做不影响发布，但会让网站在中文/英文专业用户面前看起来"未完成"。

### 2.1 营销组件深度国际化

**当前状态**：✅ **已完成**（v1.0+ 后续追加）

OverviewSection / FeaturesSection / SpecsSection / UseCasesSection / AppShowcaseSection 全部使用 `useTranslations()`。
zh.json + en.json 各 292 个 key，由 `pnpm --filter frontend check-i18n` CI 守门防止漂移。

数据/视图分离模式已建立：每个 section 内部用 `titleKey`/`descKey` 标记翻译字段，icons/positions/colors 等结构性属性保持静态。后续要新增 locale 只需复制一份 `messages/<locale>.json` 翻译。

### 2.2 Light 主题视觉适配

**当前状态**：基础设施已就绪：

- `tailwind.config.ts` 启用 `darkMode: 'class'`
- `globals.css` 定义了 `:root, .dark` 和 `.light` 两套 CSS 变量
- `next-themes` ThemeProvider 已挂载，ThemeToggle 已可用

**但是**：组件内大量硬编码 `text-white` / `bg-dark-900` / `border-white/10` 等色值，切换 light 主题后视觉效果错乱。

**需要做的**

- [ ] Navbar / Footer / Hero / Features / Specs / UseCases / AppShowcase 全部用语义 token：
  - `text-white` → `text-foreground` 或 `text-text-primary`
  - `bg-dark-900` → `bg-background`
  - `border-white/10` → `border-surface-border`
  - `text-gray-400` → `text-text-secondary`
- [ ] 设计师补一份 Light 主题 spec（哪些渐变、哪些 glow 在 light 下需要换色）
- [ ] 视觉 QA：所有页面在 light / dark 下截图对比

**估时**：1 周（涉及大约 15 个组件 + 设计师参与）。

### 2.3 Hero 真实视频 / 3D 动效

**当前状态**：Hero 用 Canvas 粒子做风流模拟（性能很好，但抽象）。

**升级方向**

- 拍一段产品工作中的实拍视频（10-15s loop，背景透明 alpha 通道）
- 或用 R3F (`@react-three/fiber`) 做 3D 产品旋转
- 视频按需 Critical 设备实拍：从风扇启动 → LED 灯效播放 → 雾化器喷雾 → 数字仪表盘动起来

**估时**：实拍需要 1-2 天 + 后期 1-2 天。3D 模型建模 3-5 天。

### 2.4 邮件模板深度本地化

**当前状态**：订单 confirm/ship/refund 邮件已有 zh/en 双语，依赖 `order.locale` 字段。

**待优化**

- [ ] 邮件预览 / E2E 测试（catch broken HTML / 富文本 escape）
- [ ] 退订链接（GDPR 必需 — 即使是订单确认邮件也建议）
- [ ] 加上 List-Unsubscribe header
- [ ] DKIM / DMARC 配置后实测送达率（避免进垃圾箱）

### 2.5 Payment / Checkout Lighthouse 优化

**当前状态**：Checkout 用 PayPal SDK（异步注入第三方脚本）。

**潜在问题**

- PayPal SDK 会拖慢 LCP（如果在首屏即注入）
- 表单未使用 `<form action>` SSR 提交（依赖 JS）

**优化方向**

- [ ] 把 PayPal SDK 改为按需加载（点击 "Continue to PayPal" 后再注入）
- [ ] 添加 progressive enhancement（无 JS 时表单也能提交，至少能写到 Lead）
- [ ] Checkout 单独跑 Lighthouse Performance ≥85

---

## Tier 3 — 业务规模/流量驱动时再做

> 这些功能在小规模阶段是过度设计，等到 100+ 订单/天 或 10k DAU 后再考虑。

### 3.1 数据分析

- [ ] PostHog / Plausible / Umami 集成（隐私友好型）
- [ ] 关键漏斗：landing → contact / landing → checkout → paid
- [ ] 自定义事件：CTA click / video play / theme switch
- [ ] A/B 测试基础设施

### 3.2 站内搜索

- [ ] 博客 / 帮助文档全文检索（Algolia 免费版 / Meilisearch 自建）
- [ ] 搜索结果带高亮 / 联想

### 3.3 MDX 博客系统

**当前**：`/blog` 是静态页面，列表硬编码。

**升级**：

- [ ] `content-collections` 或 `next-mdx-remote` 接入
- [ ] 博客文章前 matter（标题 / 日期 / 作者 / 封面）
- [ ] RSS feed
- [ ] 博客分类 / 标签

### 3.4 多币种 / 多区域定价

**当前**：所有商品 USD 计价。

**升级**：

- [ ] Product schema 加 `prices: { USD: 29900, CNY: 199900, EUR: 27900 }`
- [ ] CheckoutClient 根据 locale / Accept-Language 选币种
- [ ] PayPal 创建订单时传对应币种
- [ ] 退款金额按订单本币种返还

### 3.5 库存预警

- [ ] 单 SKU 库存 < 阈值 时邮件通知运营
- [ ] Admin 后台显示库存状态徽标
- [ ] 售罄商品自动从前台隐藏 / 显示 "缺货登记"

### 3.6 优惠码 / 活动

- [ ] Coupon model（百分比 / 固定金额 / 限定 SKU / 限定区间）
- [ ] Checkout 输入框验证 + 调价
- [ ] Admin 创建优惠码 UI

### 3.7 物流商 API 集成

**当前**：Admin 手动填写运单号 + URL。

**升级**：

- [ ] EasyPost / 顺丰 / 极兔等物流商 SDK
- [ ] 创建运单自动获取追踪号
- [ ] webhook 同步物流状态 → Order.fulfillment.status
- [ ] 用户面向 timeline UI（"已发货 → 转运中 → 派送中 → 已签收"）

### 3.8 AI 客服

**当前**：Socket.io 实时人工客服。

**升级**：

- [ ] 接入 OpenAI / Claude，给定产品 FAQ 知识库 → 自动回答常见问题
- [ ] 检测 confidence 低时转人工
- [ ] 支持上下文记忆（多轮对话）

### 3.9 Redis + BullMQ

**当前**：order-cleanup 是 setInterval 定时器。

**升级**：

- [ ] Redis 接入（Upstash / Render Redis）
- [ ] 用 BullMQ 替代 setInterval：
  - 订单超时取消（15 分钟未付款）
  - 邮件发送队列（避免同步阻塞）
  - 固件下载预热缓存
- [ ] 队列监控 UI（Bull Board）

### 3.10 多机部署 / Session sharding

**当前**：Express 单机 + Socket.io in-memory adapter。

**升级**：

- [ ] socket.io Redis adapter 跨机房 broadcast
- [ ] Mongo Session collection 支持横向扩展
- [ ] CDN 边缘缓存（CloudFront / Cloudflare Workers）

---

## Tier 4 — 技术债务 / 长期改进

> 这些是"做了能让代码更优雅"的改进，对业务无直接影响。

### 4.1 升级到 Next 15

**当前**：Next 14 App Router。

**为什么没升**：

- Next 15 升级到 React 19 + 许多 hook 的破坏性更新
- next-intl 需要等版本对齐（已有兼容包但仍有边界 case）
- 升级前需把 `await params` / `await searchParams` 全部加上

**预估**：2-3 天。

### 4.2 OpenAPI 自动生成

**当前**：`backend/src/routes/openapi.routes.ts` 手写 spec。

**升级**：

- [ ] `zod-to-openapi` 或 `tsoa` 接入
- [ ] 路由定义自动生成 spec → 永远不会过期
- [ ] Swagger UI / Redoc 静态站

### 4.3 Storybook + 设计系统站

- [ ] 启用 Storybook 8 + Tailwind addon
- [ ] 把 `components/ui/` 全部加 stories
- [ ] 视觉回归测试（Chromatic / Percy）
- [ ] 设计 token 文档化（颜色 / 字体 / 间距）

### 4.4 Playwright E2E 覆盖扩大

**当前**：✅ **大部分已扩展** — home / admin / SEO / 404 / locale routing / order lookup / checkout / security headers / OG / PWA 图标 / sitemap hreflang 全部覆盖。

**待补**（需要真实凭证或外部依赖）：

- [ ] Lead 提交全流程（含真实 SMTP mock）— 需要 mock 后端或 test database
- [ ] Checkout 全流程（PayPal sandbox）— 需要 PAYPAL_CLIENT_ID 测试凭证
- [ ] Admin 登录后退款 / 发货全流程 — 需要 seed 测试数据
- [ ] 固件 OTA check / download 全流程 — 需要 R2 测试桶
- [ ] 切换语言 / 主题真实点击（避免 hydration 问题）— 已有 server-rendered 检查，可加交互

### 4.5 Test coverage threshold

**当前状态**：✅ **已完成** — `@vitest/coverage-v8` 集成，shared 90% / backend 30-50% 双门槛，CI 跑 `pnpm test:coverage` 低于阈值红条。

**剩余可优化**：

- [ ] 上传 lcov 到 Codecov / Coveralls（外部账号）
- [ ] 提高 backend 覆盖率门槛（当前是保守的 v1.0 baseline，写更多测试后再升）

### 4.6 后端拆分（如果团队/规模需要）

**当前**：单 Express 进程承担所有路由 + Socket.io。

**未来可能拆**：

- payment 服务（独立部署，PCI 合规更好审计）
- firmware-cdn 服务（仅文件下载 / 签名）
- chat-realtime 服务（Socket.io 横向扩展）
- admin-api 服务（独立部署，IP 白名单）

但单体目前性能足够（Render Standard 256 RAM 跑 1000 RPS 没问题），不要过早拆。

### 4.7 翻译 tooling

**当前状态**：✅ **已部分完成** — `pnpm --filter frontend check-i18n` 实现了关键检查（CI 已 wire），任何 zh/en 之间漂移的 key 都会让 CI 红条。

**剩余可优化**：

- [ ] `i18n-ally` VSCode 插件（已 recommend，但实际未启用 lint 规则）
- [ ] 翻译平台对接（Crowdin / Lokalise）— 等多个 locale 时再做

### 4.8 A/B 测试基础设施

- [ ] PostHog feature flag / GrowthBook 接入
- [ ] Hero CTA 文案 / 按钮颜色 / 价格展示方式 等小流量灰度
- [ ] Edge middleware 分流

### 4.9 性能预算 + budget.json

- [ ] `frontend/budget.json` 定义 LCP/TBT/CLS 上限
- [ ] CI 跑 Lighthouse 超 budget 直接红条
- [ ] Bundle size limit（`bundlesize` / `size-limit`）

### 4.10 安全加固

- [ ] CSP 进一步收紧（去掉 `unsafe-inline`，全用 nonce）
- [ ] WAF（Cloudflare Pro）
- [ ] OWASP ZAP / Burp 渗透测试
- [ ] SAST（Semgrep / SonarQube）补充 CodeQL
- [ ] 密码强度策略（zxcvbn）
- [ ] 2FA（TOTP / WebAuthn）

---

## 总结

| Tier | 阻塞上线？ | 预估总工作量                            |
| ---- | ---------- | --------------------------------------- |
| 1    | 是         | 5-7 工作日（主要等账号开通 + 资源拍摄） |
| 2    | 否         | 2-3 周                                  |
| 3    | 否         | 按业务驱动，每项 3-7 天                 |
| 4    | 否         | 持续，不阻塞业务                        |

**当前推荐路径**：

1. 立即并行启动 Tier 1.1（资源拍摄）和 Tier 1.2（账号开通）
2. Tier 1.3 域名 → Tier 1.4 Lighthouse baseline
3. 上线（v1.0）
4. 上线后 1-2 周内完成 Tier 2.1 和 2.2（深度 i18n + light 主题）
5. 季度规划纳入 Tier 3，技术债 backlog 持续消化 Tier 4

如果有任何疑问，先读 [`HANDOVER.md`](./HANDOVER.md)。
