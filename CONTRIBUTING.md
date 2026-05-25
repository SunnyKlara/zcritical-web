# Contributing to Critical

> 感谢您愿意贡献 Critical！本文档说明如何提交代码、报告问题以及参与项目维护。

## 行为准则

- 互相尊重，开放讨论
- 拒绝歧视、骚扰和人身攻击
- 对事不对人 — 评论代码而非作者

## 报告问题

提 issue 前请：

1. 搜索现有 issue，确认问题尚未被报告
2. 使用相应的 issue 模板（bug report / feature request）
3. 提供可复现的最小示例

**安全漏洞** 请勿在公开 issue 中讨论，参见 [SECURITY.md](./SECURITY.md)。

## 开发流程

### 1. 准备环境

```bash
# 仅首次：开启 corepack 锁定 pnpm 版本
corepack enable
corepack prepare pnpm@9.12.0 --activate

# 安装依赖
pnpm install

# 启动本地 MongoDB
pnpm dev:db
```

### 2. 开发工作流

```bash
# 创建分支（语义化命名）
git checkout -b feat/your-feature
# 或 fix/issue-123, docs/update-readme, refactor/cleanup-x

# 开发期间持续验证
pnpm typecheck
pnpm lint
pnpm test

# 提交（必须遵循 Conventional Commits）
git commit -m "feat(frontend): add hero animation"
```

### 3. Commit 规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)。
commitlint 在 commit 时自动校验。

**格式**：`<type>(<scope>): <subject>`

**type**：

- `feat` 新功能
- `fix` bug 修复
- `docs` 文档
- `style` 格式（不影响逻辑）
- `refactor` 重构
- `perf` 性能优化
- `test` 测试
- `build` 构建系统/外部依赖
- `ci` CI 配置
- `chore` 杂项
- `revert` 回滚

**scope**（可选）：`frontend`、`backend`、`shared`、`docs`、`docker`、`ci`、`deps`、`release`

**示例**：

```
feat(backend): add lead export endpoint
fix(frontend): resolve mobile navbar overflow
docs: update API documentation for /api/orders
chore(deps): bump zod to 3.24
```

### 4. Pull Request

1. 推送到自己的分支：`git push -u origin feat/your-feature`
2. 在 GitHub 上创建 PR，使用 PR 模板
3. 确保 CI 全绿（typecheck / lint / test / audit / build）
4. 等待 review，根据反馈调整
5. PR 合并后删除分支

### 5. PR 检查清单

提 PR 前确保：

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 新功能有对应测试
- [ ] 涉及架构调整的，已添加 ADR 到 `docs/DECISIONS.md`
- [ ] 涉及 API 变更的，已更新 `docs/API.md`
- [ ] 新环境变量已加入 `.env.example`
- [ ] 重大变更已记录到 `CHANGELOG.md`

## 代码风格

- TypeScript 严格模式（`strict: true`）
- ESLint + Prettier 自动格式化
- 优先函数式风格，避免 class（除非框架要求，如 Mongoose 或 Express middleware）
- 每个文件顶部用 JSDoc 注释说明用途
- 命名遵循团队约定：
  - 文件名 `kebab-case` 或 `PascalCase`（组件）
  - 变量函数 `camelCase`
  - 类型/接口 `PascalCase`
  - 常量 `UPPER_SNAKE_CASE`

## 测试

- 后端：Vitest + supertest + mongodb-memory-server
- 前端 E2E：Playwright
- 共享：Vitest

新增功能必须附带测试。覆盖率不强制，但关键路径（认证、支付、库存）必须 100%。

## 文档

修改公开 API 或架构时同步更新：

- `docs/ARCHITECTURE.md` 总图
- `docs/DECISIONS.md` 决策记录（按 ADR 模板追加）
- `docs/API.md` API 参考
- `docs/ROADMAP.md` 里程碑进度

## 帮助与讨论

- 业务/产品问题：见 README 联系方式
- 技术问题：在 GitHub Discussions 提问
- 紧急问题：邮件 dev@critical.bike
