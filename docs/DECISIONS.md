# Architecture Decision Log (ADR)

> 按时间顺序记录非显然的工程决策。每条记录包含：背景、决策、可选方案、影响。
> 不要重写历史 — 用新条目 supersede 旧的，并链接回去。
>
> 格式：`ADR-NNNN · [简短标题]` · 状态（`accepted` / `superseded by ADR-XXXX` / `deprecated`）

---

## ADR-0001 · Monorepo 结构（pnpm workspaces）· `accepted` · 2026-05-26

### 背景

`critical-website/` 单包项目已实现 M1（品牌展示站），但要扩展到询盘 / 管理后台 / 交易闭环 / 固件分发 / 设备绑定，需要：

- 后端（Express + MongoDB + Socket.io）
- 前后端共享的 Zod schema（避免接口漂移）
- Admin 后台路由（与营销站隔离）
- 多个独立的 npm 依赖列表（前端用 React/Next，后端用 Express/Mongoose）

继续单包会出现：

1. 前后端依赖混在一起，编译产物臃肿
2. Zod schema 在两边重复定义，改一处忘改另一处
3. Vercel 部署时把后端代码也打包进去
4. 管理后台与营销站共用 `next build`，无法分别配置 CSP / 鉴权

### 决策

采用 **pnpm 9.x workspaces** 三包结构：

```
critical/
├── frontend/   — Next.js 14 (deploy: Vercel)
├── backend/    — Express + Socket.io (deploy: Render)
└── shared/     — @critical/shared, 工作区包（不发布到 npm）
```

参考 mojing 项目 ADR-0001。

### 可选方案

- **Turborepo** — 引入 build cache 加速大型 monorepo。当前规模（3 包）尚不需要，徒增配置复杂度。决策时（M2）规模上 Turborepo 后再启用。
- **Nx** — 同上，过重。
- **Yarn workspaces** — pnpm 在依赖隔离和磁盘占用上更优，且 mojing 已使用，团队学习成本归零。
- **保持单包** — 前后端 Zod 重复维护、Vercel 打包后端、CSP 与鉴权混杂，长期成本远高于一次性切割。

### 影响

- 开发者首次进入项目需 `corepack enable && corepack use pnpm@9.12.0`
- 现有 `critical-website/` 内容迁移到 `critical/frontend/`（M2 第一项任务）
- CI 需要从 `pnpm install` 开始，不再是 `npm install`
- 共享代码（Zod schema、Socket.io 事件名）放在 `shared/`，前后端通过 `import { ... } from '@critical/shared'` 使用
- `package.json#packageManager` 锁定 `pnpm@9.12.0`，CI 通过 `corepack` 强制版本一致

---

## ADR-0002 · 后端托管 = Render (Singapore) · `accepted` · 2026-05-26

### 背景

后端选型需要满足：

- 长进程（Socket.io WebSocket 不能 serverless）
- 免费层够 V1 跑通
- 中国大陆开发者可注册（不需要美国信用卡）
- 中国/东南亚访客延迟可控

### 决策

后端部署到 **Render.com 免费 Web Service**，区域 `singapore`，通过 `docker/Dockerfile.api` 构建。

参考 mojing ADR-0011。

### 可选方案

- **Fly.io** — Hong Kong 区域延迟更优，但要求绑定信用卡（mainland 用户难以申请）
- **Railway** — 免费额度极小，$5/月起步
- **Vercel Functions** — serverless 不支持长连接 WebSocket
- **阿里云/腾讯云** — 需要 ICP 备案，影响海外触达

### 影响

- 冷启动 ~30 秒（首次请求 / 15 分钟空闲后）
  - 解决：UptimeRobot 每 5 分钟 ping `/api/health` 保持温启动
- 单实例 750 小时/月（够单后端 24/7）
- Socket.io 连接需要客户端心跳（每 10 分钟）防止 Render 15 分钟空闲断连

---

## ADR-0003 · 数据库 = MongoDB Atlas M0 · `accepted` · 2026-05-26

### 背景

V1 业务数据：

- Lead 询盘
- 客服会话/消息（实时高频写入）
- 订单（包含商品快照、地址、支付事件）
- 设备激活记录
- 固件元数据
- 操作审计日志

数据形态：

- 多嵌套文档（订单 items 内嵌商品快照、商品 variants 内嵌库存）
- 写多读多
- 不需要复杂 JOIN
- 强一致性需求低（最终一致即可，除了支付/库存的原子扣减）

### 决策

使用 **MongoDB Atlas M0 免费层**，512 MB 存储，共享 CPU。

参考 mojing 默认选型。

### 可选方案

- **PostgreSQL（Supabase / Neon）** — 关系模型反而绕，订单的商品快照需要单独表 + JSON 字段，不如直接嵌套
- **PlanetScale** — MySQL 系，免费层取消（2024 年）
- **SQLite（Turso）** — 单文件不适合多实例
- **自建 MongoDB（VPS）** — 备份、监控、安全补丁全自负，V1 阶段不值

### 影响

- M0 限制：500 connection 上限、共享 CPU。监控连接数，必要时升 M2（$9/月）
- 不支持 `$lookup` 跨分片，但当前业务用不到
- 通过 `mongodb-memory-server` 在测试中跑真实 mongo，不 mock

---

## ADR-0004 · 共享契约 = `@critical/shared` (Zod) · `accepted` · 2026-05-26

### 背景

前后端通过 REST + Socket.io 通信。如果两边各自定义类型，会出现：

- 后端改了字段，前端没改 → 运行时崩
- Socket.io 事件名打错 → 静默失败
- 校验逻辑前后端不一致 → 后端拒绝合法请求

### 决策

`shared/` 包作为前后端单一真相源，导出：

1. **Zod schemas** — 请求/响应/数据模型的运行时校验 + 类型派生
2. **Socket.io 事件名** — `SOCKET_EVENTS` 常量对象
3. **业务常量** — 订单状态、设备状态、固件渠道等枚举

后端用 Zod schema 做 `validateBody` 中间件，前端用相同 schema 做表单校验。

### 可选方案

- **OpenAPI + 代码生成** — 工具链复杂，对小团队过重
- **tRPC** — 必须前后端都用 TypeScript，且耦合更紧。Critical 后续可能有 ESP32 / APP 等非 TS 客户端调 API，不绑定 tRPC 更灵活
- **手写 TypeScript interface** — 没有运行时校验，无法防御非法请求

### 影响

- shared 包通过 `workspace:*` 协议链接到 frontend / backend
- shared 包**不编译**（`noEmit: true`），靠 TS 直接消费源码 — 简化构建
- shared 不引入运行时依赖（除 Zod）— 避免污染前端 bundle
- 任何前后端共用的常量必须放 shared，不允许两边各定义

---

## ADR-0005 · 现有 `critical-website/` 暂时保留并行运行 · `accepted` · 2026-05-26

### 背景

新建 `critical/` monorepo 后，原 `critical-website/` 是否立即删除？

考量：

- 当前网站已有客户/老板看过 demo，链接可能存在
- 迁移到 monorepo 涉及路径改动（`src/app/` → `frontend/src/app/`）、`package.json` 合并、字体/图片资产路径调整
- 一次性迁移有风险，渐进式更稳

### 决策

**两阶段迁移**：

1. **阶段 1（当前）**：建立 `critical/` 骨架（backend + shared + 空 frontend 占位），保留 `critical-website/` 继续迭代营销页内容。
2. **阶段 2（M2 末尾或 M3 开始）**：把 `critical-website/src/` 的所有代码挪到 `critical/frontend/src/`，验证构建，删除 `critical-website/`。

### 可选方案

- **立即整体迁移** — 风险大，开发节奏被打断
- **永久并行** — 两份代码同步成本高，必弃

### 影响

- 阶段 1 期间，新功能开发优先在 `critical-website/`（前端）和 `critical/backend/`（后端）并行进行
- 前后端通过 `http://localhost:4000` 联调，前端不需要知道自己以后会搬家
- 阶段 2 切换时执行一次性 PR：移文件 + 更新 import 路径 + 验证 e2e + 删旧目录

---

## ADR-0006 · 文件存储 = Cloudflare R2（M5 起）· `accepted` · 2026-05-26

### 背景

固件二进制（`.bin` 文件，预计每版本 1-3 MB）需要存储和分发。要求：

- CDN 加速（设备/APP 在全球各地下载）
- 防外链（不希望第三方网站直链固件 URL）
- 下载量统计
- 版本生命周期管理

### 决策

使用 **Cloudflare R2**（S3 兼容对象存储）。

- 免费 10 GB 存储 + 1 百万次 Class A 操作/月
- 零出口流量费（vs S3 / GCS 都按流量计费）
- 中国大陆通过 Cloudflare CDN 加速

### 可选方案

- **AWS S3** — 出口流量按 GB 计费，固件大小 × 用户量很快超出免费额度
- **Cloudflare Workers KV** — 单 value 上限 25 MB，临界
- **MongoDB GridFS** — 把二进制塞数据库，不分离查询负载，固件分发拖累 API 性能
- **GitHub Releases**（当前 critical-website 用法） — 防外链做不到，权限控制差

### 影响

- 后端不直接发文件，而是生成 R2 签名 URL（短期有效，例如 5 分钟），客户端拿到后从 R2 下载
- 签名 URL 包含 `serialNumber + version` 做日志追踪
- M5 实施时新增环境变量 `R2_*`，详见 `.env.example`

---

## ADR-0007 · 支付 V1 = PayPal Redirect Flow · `accepted` · 2026-05-26

### 背景

V1 需要跨境收款。考量：

- 不碰信用卡数据（PCI DSS SAQ-A 最低合规）
- 注册成本低
- 中国开发者可申请

### 决策

**PayPal Server-side Redirect Flow（Orders API v2）** 作为 V1 唯一支付方式。

参考 mojing COMMERCE-SPEC.md。

### 可选方案

- **Stripe** — 中国开发者注册需海外公司主体
- **PayPal JS SDK 内嵌按钮** — 引入 CSP 复杂度和 SDK 版本维护成本，V2 再考虑
- **连连/Airwallex** — 信用卡直接收单，需企业账户审核，V2 再说

### 影响

- 买家在 PayPal 官方页面输入支付信息，我方零卡号接触
- 必须验证 capture 金额（防中间人篡改）
- 必须验证 webhook 签名（防伪造退款通知）
- 支付事件用独立的 `PaymentEvent` model 记录原始 PayPal 响应（180 天拒付期举证用）

---

## ADR-0008 · 买家账户 = V1 游客下单（无注册）· `accepted` · 2026-05-26

### 背景

是否需要买家账户体系？

### 决策

**V1 不做买家注册/登录**。买家提交邮箱 + 收货地址下单，系统生成订单号，通过"邮箱 + 订单号"组合查询订单。

参考 mojing 默认选型。

### 可选方案

- **强制注册** — Baymard 数据：24% 购物车放弃率
- **第三方登录（Google / Apple Sign-in）** — 中国大陆用户体验差
- **手机号 + 验证码** — 短信成本 + 隐私合规（GDPR）

### 影响

- 订单的"用户身份"用 email 字段维持
- 设备激活时通过 email 关联到订单
- 未来要做账户体系时，可通过"邮箱 + 订单号一键绑定历史订单"做平滑迁移

---

## ADR-0009 · 错误监控 = Sentry（前后端）· `accepted` · 2026-05-26

### 背景

V1 上线后需要可观测性 — 知道线上是否有未捕获异常、性能瓶颈、用户报错路径。

### 决策

前端用 `@sentry/nextjs`，后端用 `@sentry/node`。Sentry 免费层（5k errors/月、10k perf 单位）覆盖 V1。

参考 mojing ADR-0003。

### 影响

- 后端 `index.ts` 顶部立刻 `initSentry()`，确保 http/express/mongoose 自动 instrumentation 生效
- Sentry DSN 通过环境变量注入，不写死
- 生产环境采样率 10%，开发环境 100%
- 敏感字段（`req.headers.authorization` / `req.headers.cookie` / `*.password` / `*.token`）通过 Pino redact 过滤
