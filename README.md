# Critical

> 智能风洞模拟器 — 全栈 Monorepo（品牌站 + 后端 + 共享契约）

[![CI](https://github.com/SunnyKlara/zcritical-web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SunnyKlara/zcritical-web/actions/workflows/ci.yml)
[![CodeQL](https://github.com/SunnyKlara/zcritical-web/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/SunnyKlara/zcritical-web/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

仓库：[SunnyKlara/zcritical-web](https://github.com/SunnyKlara/zcritical-web) · 域名：[zcritical.co](https://zcritical.co)（规划中）

## 当前阶段：Phase 0 底座加固（3 个月）

> 项目当前不追求快速上线，而在做**大厂内核级品质**的底座加固。

- 📐 [战略文档 `STRATEGY.md`](./docs/STRATEGY.md) — 三阶段规划（Phase 0/1/2）
- 🏗️ [架构图谱 `ARCHITECTURE-VISUAL.md`](./docs/ARCHITECTURE-VISUAL.md) — 8 张 Mermaid 可视化
- 🔒 [安全审计 `SECURITY-AUDIT.md`](./docs/SECURITY-AUDIT.md) — Critical/High/Medium/Low 分级清单
- 🧭 [技术路线 `TECH-ROADMAP.md`](./docs/TECH-ROADMAP.md) — 3-5 年演进
- 🎯 [工作流 `WORKSTREAMS.md`](./docs/WORKSTREAMS.md) — 5 条并行工作流定义
- 🔌 [接口契约 `INTERFACES.md`](./docs/INTERFACES.md) — 跨流契约 + RFC 流程
- 🌳 [并行开发 `PARALLEL-DEV-GUIDE.md`](./docs/PARALLEL-DEV-GUIDE.md) — 多窗口工作流操作手册
- 📚 [参考项目 `REFERENCE-PROJECTS.md`](./docs/REFERENCE-PROJECTS.md) — 7 个高质量开源项目深度学习清单
- 📋 [每日日志 `DAILY-LOG.md`](./docs/DAILY-LOG.md) — 各工作流每日进展
- 🤝 [协作清单 `COLLAB.md`](./docs/COLLAB.md) — 需要外部凭证的协作项

## 项目结构

```
critical/
├── frontend/      # Next.js 14 营销站 + 管理后台（i18n + 主题）
├── backend/       # Express + Socket.io API + PayPal + Firmware/Device
├── shared/        # @critical/shared — Zod schemas / 类型 / 常量 / Socket 事件
├── docs/          # 架构文档、ADR、路线图、API、部署手册
├── docker/        # Docker 部署配置
└── .github/       # CI workflows / Dependabot / CodeQL
```

## 快速开始

需要 Node 20+ 和 pnpm 9.x。

```bash
# 一次性设置
corepack enable && corepack prepare pnpm@9.12.0 --activate

# 安装依赖
pnpm install

# 启动 MongoDB（Docker）
pnpm dev:db

# 配置环境变量
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 启动后端 + 前端（分别在 2 个终端）
pnpm --filter=backend dev      # http://localhost:4000
pnpm --filter=frontend dev     # http://localhost:3000

# 验证 / 构建
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# 包体积分析
pnpm --filter frontend build:analyze

# E2E 测试
pnpm --filter frontend test:e2e:install
pnpm --filter frontend test:e2e
```

## 闭环里程碑

| 里程碑         | 目标                                       | 状态    |
| -------------- | ------------------------------------------ | ------- |
| M1 品牌展示站  | 静态 SEO + i18n（zh/en）                   | ✅ 完成 |
| M2 询盘转化    | Lead 表单 + 邮件通知 + Sentry              | ✅ 完成 |
| M3 后台 + 客服 | JWT Admin / Lead 管理 / Socket.io 实时客服 | ✅ 完成 |
| M4 交易闭环    | 商品 / 订单 / PayPal / 退款 / 物流 / 邮件  | ✅ 完成 |
| M5 固件分发    | OTA + 灰度发布 + 版本管理                  | ✅ 完成 |
| M6 设备绑定    | 激活 / 心跳 / 用户-设备-订单关联           | ✅ 完成 |

详见 [`docs/ROADMAP.md`](./docs/ROADMAP.md)。**v1.0 已达到全闭环**：访客 → 留资 → 下单 → 支付 → 发货 → 设备激活 → 固件升级 — 完整对外业务通路全部跑通。

> 上线前剩余事项（资源 / 凭证 / 域名 / 性能基线）和未来增强的延期清单见 [`docs/DEFERRED.md`](./docs/DEFERRED.md)。

## 技术栈

| 层        | 技术                                                                       | 部署              |
| --------- | -------------------------------------------------------------------------- | ----------------- |
| Frontend  | Next.js 14 App Router + Tailwind + Framer Motion + next-intl + next-themes | Vercel            |
| Backend   | Express + Socket.io + MongoDB (Mongoose) + JWT + Zod + Pino + Sentry       | Render            |
| Shared    | TypeScript + Zod                                                           | workspace package |
| Storage   | Cloudflare R2（M5 起，固件二进制）                                         | Cloudflare        |
| Payment   | PayPal Orders API v2（M4 起）                                              | PayPal            |
| Container | Docker 多阶段构建 + 非 root 用户                                           | —                 |

## 关键文档

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 闭环架构总图
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — ADR 决策记录
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — 6 周开发路线图
- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — 部署手册
- [`docs/API.md`](./docs/API.md) — API 参考（OpenAPI 3.1 spec at `/api/openapi.json`）
- [`docs/HANDOVER.md`](./docs/HANDOVER.md) — 30 分钟交接文档
- [`docs/DEFERRED.md`](./docs/DEFERRED.md) — 延期工作清单（Tier 1-4 分级）
- [`SECURITY.md`](./SECURITY.md) — 安全策略与漏洞披露
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — 贡献指南

## 已就绪的工程化

- ✅ pnpm 9 workspaces
- ✅ Husky v9 + commitlint + lint-staged（pre-commit + commit-msg 真激活）
- ✅ GitHub Actions CI（typecheck / lint / format:check / test / audit / build / Lighthouse on PR）
- ✅ CodeQL 安全扫描（每周 + PR）
- ✅ Dependabot（按 ecosystem 分组，自动 PR）
- ✅ Prettier + ESLint + EditorConfig
- ✅ VSCode 配置（推荐扩展 + 工作区设置）
- ✅ PR / Issue 模板
- ✅ CODEOWNERS 自动 review 分配
- ✅ SECURITY.md + security.txt
- ✅ Docker + render.yaml 部署蓝图
- ✅ docker-compose.dev.yml 一键启动 MongoDB

## 测试覆盖

```
38 tests passing
├── 14 shared schema tests (Zod validation)
└── 24 backend integration tests
    ├── 4 smoke tests (env / logger / models)
    ├── 3 health endpoint tests
    ├── 7 leads API tests
    └── 10 auth + auth-protected tests
```

E2E（Playwright）配置就绪：home / admin / SEO / 404。
