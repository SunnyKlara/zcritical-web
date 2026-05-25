# Critical

> 智能风洞模拟器 — 品牌站 + 后端 + 共享契约

## 项目结构

```
critical/
├── frontend/      # Next.js 14 营销站 + 管理后台（部署到 Vercel）
├── backend/       # Express + Socket.io API（部署到 Render）
├── shared/        # @critical/shared — Zod schemas / 类型 / 常量
└── docs/          # 架构文档、ADR、路线图
```

## 快速开始

需要 Node 20+ 和 pnpm 9.x。

```bash
# 安装依赖
pnpm install

# 同时启动前后端（在两个终端中）
pnpm --filter=backend dev      # http://localhost:4000
pnpm --filter=frontend dev     # http://localhost:3000

# 类型检查 / lint / 测试（所有 workspace）
pnpm typecheck
pnpm lint
pnpm test

# 构建（所有 workspace）
pnpm build
```

## 环境变量

每个 package 有自己的 `.env.example`：

- `backend/.env.example` → 复制为 `backend/.env`
- `frontend/.env.local.example` → 复制为 `frontend/.env.local`
- 根目录 `.env.example` 是所有变量的目录索引（不要复制使用）

最小开发环境需要：

- 本地 MongoDB（`mongodb://localhost:27017/critical`）或免费的 MongoDB Atlas M0
- SMTP 可选（不配置则邮件通知静默跳过）

## 文档

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 架构总图与设计模型
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — 架构决策记录（ADR）
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — 6 周开发路线图
- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — 部署手册

## 闭环里程碑

| 里程碑 | 目标                             | 状态                            |
| ------ | -------------------------------- | ------------------------------- |
| M1     | 品牌展示站                       | ✅ 已完成                       |
| M2     | 询盘转化（Lead + 邮件通知）      | ✅ 大部分完成（仅缺部署）       |
| M3     | 管理后台 + Lead 管理             | ✅ 已完成（Socket.io 客服待补） |
| M4     | 交易闭环（商品 + 订单 + PayPal） | ⏳ 待开始                       |
| M5     | 固件分发（OTA + R2 存储）        | ⏳ 待开始                       |
| M6     | 设备绑定（激活 + APP 对接）      | ⏳ 待开始                       |

详见 [`docs/ROADMAP.md`](./docs/ROADMAP.md)。

## 技术栈

| 层       | 技术                                                                 | 部署              |
| -------- | -------------------------------------------------------------------- | ----------------- |
| Frontend | Next.js 14 App Router + Tailwind + Framer Motion + next-intl         | Vercel            |
| Backend  | Express + Socket.io + MongoDB (Mongoose) + JWT + Zod + Pino + Sentry | Render            |
| Shared   | TypeScript + Zod                                                     | workspace package |
| Storage  | Cloudflare R2（M5 起）                                               | Cloudflare        |

参考 [ModelZone (mojing) 项目](../mojing/) 的成熟架构。
