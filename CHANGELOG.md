# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式。
> 版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added (M2 — 询盘转化)

- monorepo 骨架（pnpm 9 workspaces：frontend / backend / shared）
- `@critical/shared` 包：Zod schemas + 业务常量 + Socket.io 事件名
- 后端 Express 服务：MongoDB + Pino + Helmet + CORS + 速率限制
- `POST /api/leads` 询盘提交（含 Zod 校验、蜜罐防爬虫、邮件通知）
- `GET /api/leads` 列表 + `PATCH /api/leads/:id` 更新（M3 会加管理员鉴权）
- `GET /api/health` `GET /api/ready` `GET /api/metrics` 健康检查
- 邮件通知服务（Nodemailer SMTP，fire-and-forget）
- Sentry 后端钩子（`@sentry/node` v8）
- Docker 化（`docker/Dockerfile.api`）+ Render 部署蓝图（`render.yaml`）
- 文档体系：ARCHITECTURE / DECISIONS / ROADMAP / DEPLOY / API / HANDOVER
- 9 条 ADR 记录关键决策
- M3 认证基础（User / AuditLog / JWT / CSRF / requireAdmin）
- 前端 Contact 表单接入后端（critical-website/）
- 本地一键开发环境（docker-compose.dev.yml）
- GitHub Actions CI：typecheck + lint + test + audit
- Husky + commitlint：commit 前自动检查

### Reference

- [架构总图](./docs/ARCHITECTURE.md)
- [开发路线图](./docs/ROADMAP.md)
- [架构决策记录](./docs/DECISIONS.md)
