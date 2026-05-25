# Critical 项目交接文档

> 让任何人在 30 分钟内理解项目状态、跑起来本地环境、知道下一步做什么。

## 当前状态（2026-05-26）

### 已完成 ✅

#### M1 品牌展示站 — `frontend/`

- 静态营销页（Hero / Overview / 8 大功能 / APP 展示 / 规格 / 场景 / Contact / Newsletter / Footer）
- 4 个独立子页面（`/firmware` `/support` `/download` `/blog`）
- 法律合规页（`/privacy` `/terms`）
- 自定义错误页（`not-found` / `error` / `loading` / `global-error`）
- SEO + JSON-LD（Organization / WebSite / Product / FAQPage / Breadcrumb）
- `sitemap.xml` + `robots.txt` + `manifest.webmanifest` + SVG icon
- 响应式布局 + Framer Motion 入场动画
- 设计系统 tokens（颜色 / 字体 / 间距 / 动效）
- 字体：Inter + Noto Sans SC + JetBrains Mono
- Cookie consent banner（GDPR / PIPL 友好）
- Skip-to-content 无障碍链接
- Web Vitals 监控（LCP/FID/CLS/INP）
- Sentry 浏览器钩子（DSN 配置后自动启用）

#### M2 询盘转化 — 已跑通

- ContactSection + ContactForm 接入后端 `/api/leads`
- Newsletter 订阅复用 lead 通道（`source=newsletter`）
- `lib/api.ts` API client（自动 CSRF + 错误处理）
- 后端 Lead model + POST/GET/PATCH 路由
- 邮件通知（fire-and-forget SMTP）
- Sentry 后端钩子

#### M3 管理后台 + 实时客服 — 已完成

**Admin 后台：**

- `/admin/login` 登录页
- `/admin` Dashboard（统计卡片 + 最近询盘）
- `/admin/leads` 列表（搜索 + 状态筛选）
- `/admin/leads/[id]` 详情（状态切换 + 备注）
- `/admin/chat` 实时客服面板（会话列表 + 消息线程）
- AuthProvider + authFetch（自动 refresh + Bearer token）

**实时客服系统：**

- ChatWidget 浮动按钮（懒加载）
- 访客 Session token + JWT 鉴权
- Socket.io 双向实时通信
- 输入中指示器、未读计数
- 消息持久化（MongoDB）
- 邮件通知（visitor 发消息时）

**安全：**

- JWT 双 token（access 15min + refresh 7d httpOnly cookie + 自动轮换）
- CSRF 双提交 cookie
- requireAdmin / requireRole 中间件
- 审计日志
- 登录速率限制 5/min
- bcryptjs 密码哈希

### 测试覆盖

- **38 个测试** 全部通过
  - 14 个 shared schema 测试
  - 24 个 backend 集成测试（auth / leads / health + smoke）
  - mongodb-memory-server（无需本地 DB）
- Playwright E2E 配置完成（`pnpm --filter frontend test:e2e`）

### 工程化

- pnpm 9 workspaces（frontend / backend / shared）
- Husky pre-commit + commit-msg
- commitlint Conventional Commits
- lint-staged（暂存文件格式化）
- GitHub Actions CI（typecheck + lint + test + audit + build）
- Prettier + ESLint + EditorConfig
- VSCode 配置（推荐扩展 + 工作区设置）
- PR template + LICENSE (MIT) + CHANGELOG

### 部署

- Docker 多阶段构建 + 非 root 用户
- `render.yaml` Render 蓝图（一键 apply）
- `docker-compose.dev.yml`（一键启动 MongoDB + Mongo Express UI）

---

## 未来路线图

按 [`ROADMAP.md`](./ROADMAP.md) 推进：

| 里程碑         | 状态                                           |
| -------------- | ---------------------------------------------- |
| M1 品牌展示    | ✅ 完成                                        |
| M2 询盘转化    | ✅ 完成（仅缺线上部署）                        |
| M3 后台 + 客服 | ✅ 完成                                        |
| M4 交易闭环    | ⏳ 待做（参考 `mojing/docs/COMMERCE-SPEC.md`） |
| M5 固件分发    | ⏳ 待做                                        |
| M6 设备绑定    | ⏳ 待做                                        |

---

## 项目地图

```
zcriticalweb/
├── critical/                       # 主项目（monorepo）
│   ├── frontend/                   # ✅ Next.js 14 营销站 + 管理后台
│   ├── backend/                    # ✅ Express + MongoDB + Auth + Lead + Chat
│   ├── shared/                     # ✅ 前后端共享 Zod schemas
│   ├── docs/                       # ARCHITECTURE / DECISIONS / ROADMAP / DEPLOY / API / HANDOVER / DESIGN_SYSTEM
│   ├── docker/                     # Dockerfile.api（多阶段构建）
│   ├── docker-compose.dev.yml      # 一键启动本地 MongoDB
│   └── render.yaml                 # Render 部署蓝图
│
└── mojing/                         # 参考项目（ModelZone）
```

---

## 30 分钟跑通本地

### 前置条件

- Node 20+
- pnpm 9.x（`corepack enable && corepack prepare pnpm@9.12.0 --activate`）
- Docker Desktop（用于本地 MongoDB）

### 步骤

```bash
cd critical/

# 1. 安装依赖
pnpm install

# 2. 启动 MongoDB（终端 1）
pnpm dev:db

# 3. 配置后端环境变量
cp backend/.env.example backend/.env
# 默认值即可工作；生产环境必须改 ADMIN_PASSWORD

# 4. 启动后端（终端 2）
pnpm --filter backend dev
# → API listening on http://localhost:4000

# 5. 配置前端环境变量
cp frontend/.env.local.example frontend/.env.local

# 6. 启动前端（终端 3）
pnpm --filter frontend dev
# → http://localhost:3000

# ─── 浏览器验证 ───
# 1. http://localhost:3000        访客视图
#    - 滚到底填表单提交
#    - 点右下角浮动按钮发起客服聊天
# 2. http://localhost:3000/admin/login   admin / admin1234
# 3. http://localhost:3000/admin         看 Dashboard 统计
# 4. http://localhost:3000/admin/leads   看刚提交的 Lead，改状态
# 5. http://localhost:3000/admin/chat    实时回复访客消息
```

### 跑测试

```bash
pnpm test                     # 全部 38 个测试
pnpm --filter backend test    # 24 个后端集成测试
pnpm --filter shared test     # 14 个 schema 测试

# E2E 测试（需先启动前后端）
pnpm --filter frontend test:e2e:install   # 第一次安装 Chromium
pnpm --filter frontend test:e2e
```

### 跑构建

```bash
pnpm build                    # 全部 workspace
# 输出：backend/dist/ + frontend/.next/
```

---

## 关键文件速查

| 想做的事               | 文件                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| 加新 API 路由          | `backend/src/routes/*.ts`（参考 `lead.routes.ts`）                   |
| 加新 MongoDB 模型      | `backend/src/models/*.model.ts`（参考 `Lead.model.ts`）              |
| 加前后端共享类型/校验  | `shared/src/schemas/*.schema.ts` + `index.ts` 导出                   |
| 加业务常量             | `shared/src/constants.ts`                                            |
| 改环境变量             | `backend/src/config/env.ts` Zod schema + `.env.example`              |
| 改 CORS / CSP / 中间件 | `backend/src/server.ts`                                              |
| 加新 Socket.io 事件    | `backend/src/socket/index.ts` + `shared/src/events.ts`               |
| 加邮件模板             | `backend/src/services/mailer.service.ts`                             |
| 加管理后台页面         | `frontend/src/app/admin/<page>/page.tsx`（用 `useAuth + authFetch`） |
| 加营销站 Section       | `frontend/src/components/<Section>.tsx`，挂到 `app/page.tsx`         |
| 加 SEO 结构化数据      | `frontend/src/components/seo/StructuredData.tsx`                     |
| 加 E2E 测试            | `frontend/e2e/*.spec.ts`                                             |
| 加 ADR                 | `docs/DECISIONS.md` 末尾                                             |

---

## 仍可优化（非阻塞）

- [ ] PWA 真实图标 PNG（现用 SVG 占位，参考 `public/icons/README.md`）
- [ ] 接入真实 SMTP 凭证（如 Resend、SendGrid）
- [ ] 接入真实 Sentry DSN
- [ ] 升级到 Next 15（解决 2 个 high 漏洞）
- [ ] 引入 next-intl 多语言（en/zh）
- [ ] M4：商品 + PayPal 支付
- [ ] M5：固件分发（Cloudflare R2）
- [ ] M6：设备绑定 API
- [ ] AI 客服（OpenAI / Claude）
- [ ] 性能预算（Lighthouse CI 硬阈值）
