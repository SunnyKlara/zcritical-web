# Critical 项目交接文档

> 30 分钟内理解项目状态、跑起来本地环境、知道下一步做什么。

## 当前状态（v1.0 — 2026-05-26）

### 全部 6 个里程碑已完成 ✅

> **更新于 v1.0（v0.5 → v1.0）**
>
> - **Phase 1**：邮件三件套上线 — 订单确认 / 发货通知 / 退款通知（zh/en 双语 HTML 模板，已 wire 到 capture/ship/refund 三个流程）
> - **Phase 2**：数据库 seed 脚本 (`pnpm seed`) — 1 个商品（2 个变体）+ v1.0.0 固件，幂等可重跑
> - **Phase 3**：Checkout 走真实 `/api/products` 接口 — 不再硬编码 $299，支持变体切换、动态价格、加载/错误态
> - **Phase 4**：HeroSection 完成深度 i18n（badge/slogan/subtitle/scroll/CTA 全翻译）
> - **Phase 5**：Light 主题 CSS 基础设施完成（`darkMode: 'class'` + `:root, .dark` / `.light` CSS 变量）
> - 仍未完成的工作详见新增的 [`DEFERRED.md`](./DEFERRED.md)

### M1-M6 全部完成 ✅

#### 前端（frontend/）

**i18n（next-intl 完整集成）**

- `[locale]/` 路由分组 — `/`（zh，默认）和 `/en`
- 所有用户面向组件使用 `useTranslations()`：Navbar / Footer / ContactForm / NewsletterSection / CookieConsent / ChatWidget / SkipLink / LocaleSwitcher / ThemeToggle / NotFound / Error
- `messages/{zh,en}.json` 完整覆盖 chrome 翻译（深层营销内容仍 zh-only — 等专业翻译）
- middleware.ts 自动 locale 路由
- sitemap.xml 含 hreflang alternates
- 根 layout 设置 `<html lang>`，metadata 含 alternates

**主题系统（next-themes）**

- light / dark / system 三态切换
- ThemeProvider 包裹根布局
- ThemeToggle 在 navbar 显示当前模式图标
- `suppressHydrationWarning` 避免 SSR mismatch

**UI primitives（`components/ui/`）**

- `Button`（5 个 variant × 4 个 size，含 loading state）
- `Card` / `CardHeader` / `CardContent` / `CardFooter`
- `Input` / `Textarea`
- `Badge`（5 个 tone）
- 所有组件使用 `cn()` 助手（clsx + tailwind-merge）

**页面（共 25 个静态预渲染 + 中间件）**

| 路径                                                 | 类型                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/` `/en`                                            | Home（含 Hero / 8 Features / APP 展示 / 规格 / 场景 / Contact / Newsletter） |
| `/firmware` `/en/firmware`                           | 客户端，从 GitHub Releases 拉取                                              |
| `/support` `/en/support`                             | FAQ + breadcrumb + FAQPage JSON-LD                                           |
| `/download` `/en/download`                           | APP / 固件 / 文档下载中心                                                    |
| `/blog` `/en/blog`                                   | 产品动态                                                                     |
| `/privacy` `/en/privacy`                             | 隐私政策                                                                     |
| `/terms` `/en/terms`                                 | 用户协议                                                                     |
| `/admin/login`                                       | 单 locale，admin 路由组                                                      |
| `/admin`                                             | Dashboard                                                                    |
| `/admin/leads`                                       | Lead 列表                                                                    |
| `/admin/leads/[id]`                                  | Lead 详情                                                                    |
| `/admin/chat`                                        | Socket.io 实时客服面板                                                       |
| `/sitemap.xml` `/robots.txt` `/manifest.webmanifest` | 自动生成                                                                     |

**性能 / 监控**

- `@next/bundle-analyzer` — `pnpm --filter frontend build:analyze`
- Web Vitals 自动上报（LCP/FID/CLS/INP/TTFB/FCP）
- Sentry 浏览器钩子（DSN 配置后启用）
- ErrorBoundary 包裹 admin layout
- 安全 headers（HSTS / Permissions-Policy / X-Frame-Options 等）
- security.txt at `/.well-known/security.txt`

**质量 / 可访问性**

- SkipLink 跳转主内容
- 所有交互元素有 `aria-label` / `focus-visible:ring`
- Loading UI 含 `role="status"` + `aria-live`
- 表单含 `htmlFor`/`id` 关联

#### 后端（backend/）

**REST API（OpenAPI 3.1 spec at `/api/openapi.json`）**

- `/api/health` `/api/ready` — 健康探针
- `/api/auth/login` `/refresh` `/logout` `/me` — JWT 双 token
- `/api/leads` POST 公开，GET/PATCH 管理员
- `/api/chat/session` `/history` — 访客会话
- `/api/chat/admin/sessions` `/messages` — 管理员客服

**Socket.io 实时通道**

- 访客 session token 鉴权
- 输入指示器、未读计数、自动重连（指数退避到 30s）
- visitor + admin 房间隔离

**安全 / 可靠性**

- request-id 中间件（X-Request-Id 贯穿 HTTP + 日志 + 错误响应）
- Helmet CSP / CORS
- CSRF 双提交 cookie
- 速率限制（登录 5/min、表单 3/min、全局 300/min、IPv6 安全 key）
- 优雅关闭（HTTP → Socket.io → Sentry flush → MongoDB，10s 硬超时）
- `unhandledRejection` / `uncaughtException` 捕获
- compression 中间件（gzip/brotli）
- pino 日志 redact 敏感字段
- AuditLog model 记录所有管理员操作
- bcryptjs cost 12

**数据模型**

- Lead / User / AuditLog / Session / Message — 全在 MongoDB

#### Shared（@critical/shared）

- 6 套 Zod schemas（lead / user / auth / common / message / session）
- Socket.io 事件名常量（前后端单一真相源）
- 业务常量（订单/固件/设备状态枚举，预备 M4-M6）
- 14 个 schema 测试

### 工程化

- pnpm 9 workspaces（frontend / backend / shared）
- Husky v9 真激活（pre-commit prettier + commit-msg commitlint）
- Conventional Commits + lint-staged
- GitHub Actions：CI（typecheck / lint / format:check / test / audit / build / Lighthouse on PR）
- CodeQL 安全扫描（每周 + PR）
- Dependabot（按 ecosystem 分组：frontend / backend / shared / root / actions / docker）
- Prettier + ESLint + EditorConfig
- VSCode 配置（推荐扩展 + 工作区设置）
- 治理文档：SECURITY / CONTRIBUTING / CODEOWNERS / 3 个 issue 模板 / PR template
- LICENSE (MIT) + CHANGELOG

### 部署

- Docker 多阶段构建（非 root 用户）
- Render 蓝图（render.yaml）
- docker-compose.dev.yml（一键启动 MongoDB + Mongo Express UI）

### 测试

- **38 个测试全部通过**
  - 14 个 shared schema 测试
  - 24 个 backend 集成测试（auth / leads / health + smoke）
  - mongodb-memory-server 提供真实 DB 不依赖外部服务
- Playwright E2E 配置完成（home / admin / SEO / 404 测试）

---

## 项目地图

```
zcriticalweb/
├── critical/                       # 主项目（monorepo）
│   ├── frontend/                   # ✅ Next.js 14 + i18n + 主题
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── [locale]/      # 营销 / 法律 / 错误页（zh + en）
│   │   │   │   ├── admin/         # 单 locale 后台
│   │   │   │   ├── layout.tsx     # 根 layout（HTML/body + ThemeProvider）
│   │   │   │   ├── manifest.ts robots.ts sitemap.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/            # Button / Card / Input / Badge primitives
│   │   │   │   ├── seo/           # JSON-LD 组件
│   │   │   │   ├── Navbar / Footer / ChatWidget / etc.
│   │   │   ├── i18n/              # routing / navigation / request
│   │   │   ├── lib/               # api / auth-context / chat-session / env / sentry / utils
│   │   │   └── middleware.ts      # i18n locale routing
│   │   ├── messages/{zh,en}.json
│   │   ├── e2e/                   # Playwright 测试
│   │   └── lighthouserc.json
│   ├── backend/                   # ✅ Express + Socket.io + MongoDB
│   ├── shared/                    # ✅ 前后端共享 Zod schemas
│   ├── docs/                      # 全部架构文档
│   ├── docker/                    # Dockerfile.api
│   ├── .github/                   # workflows / ISSUE_TEMPLATE / dependabot / codeowners
│   ├── .husky/                    # pre-commit + commit-msg
│   ├── docker-compose.dev.yml
│   └── render.yaml
│
└── mojing/                        # 参考项目
```

---

## 30 分钟跑通本地

```bash
cd critical/

# 1. 安装依赖（首次需 corepack enable）
pnpm install

# 2. 启动 MongoDB（终端 1）
pnpm dev:db

# 3. 配置环境
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 4. 启动后端（终端 2）
pnpm --filter backend dev          # http://localhost:4000

# 5. 启动前端（终端 3）
pnpm --filter frontend dev         # http://localhost:3000

# ─── 访客流程 ───
# http://localhost:3000              中文首页
# http://localhost:3000/en           英文首页
# 右上角语言/主题切换按钮可用
# 滚到底填表单 → 后端落库
# 右下角浮动按钮 → 实时聊天

# ─── Admin 流程 ───
# http://localhost:3000/admin/login  admin / admin1234
# Dashboard 看统计
# /admin/leads 改状态
# /admin/chat 实时回复访客

# ─── API 文档 ───
# http://localhost:4000/api/openapi.json
# 导入 Postman / Bruno / Swagger UI
```

### 跑测试

```bash
pnpm typecheck                              # 3 个 workspace
pnpm test                                    # 38 个测试
pnpm --filter frontend test:e2e             # Playwright E2E（需先启服务）
pnpm --filter frontend build:analyze        # 包体积分析
```

### Husky 验证

```bash
git commit -m "test"  # 错误格式 → commitlint 拒绝
git commit -m "feat: test"  # 通过
```

---

## 关键文件速查

| 任务                | 位置                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| 加新 API 路由       | `backend/src/routes/*.ts` + `backend/src/routes/openapi.routes.ts` 加 spec |
| 加新 MongoDB 模型   | `backend/src/models/*.model.ts`                                            |
| 加前后端共享 schema | `shared/src/schemas/*.schema.ts` + 测试                                    |
| 加新 UI primitive   | `frontend/src/components/ui/` + `index.ts` 导出                            |
| 加新页面            | `frontend/src/app/[locale]/<route>/page.tsx`（用 setRequestLocale）        |
| 加新翻译 key        | `messages/{zh,en}.json` 同时改                                             |
| 加管理员页面        | `frontend/src/app/admin/<page>/page.tsx`（用 useAuth）                     |
| 改环境变量          | backend：`config/env.ts` + `.env.example`；frontend：`lib/env.ts`          |
| 加 ADR              | `docs/DECISIONS.md` 末尾                                                   |

---

## 仍可优化（非阻塞）

> 完整清单 + 工作量估计 + 推荐路径见 [`docs/DEFERRED.md`](./DEFERRED.md)。
>
> 简要分层：
>
> - **Tier 1 上线前必做** — 静态资源（OG / 视频 / 产品图 / PNG icons）、第三方账号（SMTP / Sentry / PayPal Live / R2）、域名 + DNS、Lighthouse baseline
> - **Tier 2 上线后第一周** — 5 个营销组件深度 i18n、light 主题视觉适配（语义 token 替换）、Hero 实拍视频、Checkout 性能优化
> - **Tier 3 业务规模驱动** — 数据分析 / 站内搜索 / MDX 博客 / 多币种 / 库存预警 / 优惠码 / 物流 API / AI 客服 / Redis+BullMQ
> - **Tier 4 长期改进** — Next 15 升级、OpenAPI 自动生成、Storybook、E2E 扩大、覆盖率门槛、微服务拆分、A/B 测试

### 已完成的 v1.0 关键能力

- ✅ 邮件三件套（订单确认 / 发货 / 退款 — zh/en 双语 HTML）
- ✅ Checkout 走真实商品 API（变体切换 / 动态价格 / 加载/错误态）
- ✅ Seed 脚本（`pnpm --filter backend seed` — 商品 + 固件 + 默认管理员）
- ✅ Hero 深度 i18n（5 个 key 全部翻译完成）
- ✅ Light 主题 CSS 基础设施（变量 + tailwind 配置就绪，待组件层语义 token 改造）
- ✅ 5 个营销组件深度 i18n（Overview / Features / Specs / UseCases / AppShowcase 全部走 useTranslations，292 个 key zh+en 全覆盖）
- ✅ i18n key 一致性检查脚本（`pnpm --filter frontend check-i18n`，已 wire 进 CI）
- ✅ PWA 图标 SVG 实现（icon.svg / icon-maskable.svg，无需依赖外部 PNG 资源也能上线）
- ✅ OG 分享卡 SVG（`og-cover.svg`，1200×630 品牌封面，社媒分享立即可用）
