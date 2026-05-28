# PR 开法操作手册

> 这份是给 Critical 仓库的"PR 怎么开 / 怎么 review / 怎么合 / 怎么回滚"的标准动作。
>
> 第一次正式跑这个流程：`feat/sec-phase0-batch123 → main`（Phase 0 安全加固三批）。
>
> 后续每个 PR 都按这个流程走。

---

## 1. 开 PR（5 步）

### 1.1 打开 GitHub PR 创建页

GitHub 在你 push 完一个新分支时会直接给链接：

```
https://github.com/SunnyKlara/zcritical-web/pull/new/<branch-name>
```

或者去 https://github.com/SunnyKlara/zcritical-web → Pull requests → New pull request → 选你的分支。

### 1.2 base 选择 `main`，compare 选你的 feature 分支

确认下面的 commit list 与 `git log origin/main..HEAD` 一致。

### 1.3 标题

格式：`<type>(<scope>): <短标题>`，遵循 commitlint。

- 第一批安全 PR 的标题：`feat(W4): Phase 0 security hardening (batches 1-3)`

### 1.4 描述 — 直接复制 `docs/PR-DESCRIPTION-<branch>.md` 的全文

每次开大 PR 之前先在仓库写一份 markdown，路径 `docs/PR-DESCRIPTION-<branch>.md`。
PR 合后这份文件可留作历史档案，或合 PR 后删掉（看个人偏好）。

PR 描述的最低要素：

- [ ] 一句话总览（"做了什么"）
- [ ] 包含哪些 commit（`git log --oneline origin/main..HEAD` 复制粘贴）
- [ ] 影响范围 / 改了哪些表 / 哪些 endpoint / 哪些 env 变量
- [ ] 测试结果（"57 tests passing"）
- [ ] 上线步骤（如果合 PR 后需要在 Render / Atlas 做手动操作）
- [ ] 回滚方法（哪些 commit 可独立 revert）
- [ ] reviewer 重点关注什么

### 1.5 标 reviewer + label

- Reviewer：W1（架构主控）必勾，相关流的负责人加上（W3 改后端 → W3 必勾，etc）
- Label：`area:security` / `area:frontend` / `area:backend` / `breaking` / `migration`（按需）

---

## 2. PR 等 CI 跑完

CI 必须全绿才能进入 review 阶段。当前 main 分支 CI 跑：

| 工作流                                                                    | 文件                                 | 需要绿才能合 |
| ------------------------------------------------------------------------- | ------------------------------------ | ------------ |
| CI（typecheck / lint / format:check / test / audit / build / Lighthouse） | `.github/workflows/ci.yml`           | 必须         |
| CodeQL                                                                    | `.github/workflows/codeql.yml`       | 0 high alert |
| Semgrep（PR 触发）                                                        | `.github/workflows/semgrep.yml`      | 0 ERROR      |
| SBOM（仅 main push）                                                      | `.github/workflows/sbom.yml`         | 不阻塞 PR    |
| ZAP（仅 weekly + dispatch）                                               | `.github/workflows/zap-baseline.yml` | 不阻塞 PR    |

如果 CI 红了：

- typecheck / lint：本地 `pnpm -r typecheck && pnpm -r lint` 复现 + 修
- test：`pnpm --filter <pkg> test src/__tests__/<file>.test.ts` 单独跑挂掉的 case
- format:check：`pnpm format` 一键修
- audit：`pnpm audit --audit-level=high` 看 CVE，排查依赖
- Semgrep：去 GitHub Security → Code scanning alerts 看具体规则 + 行号
- CodeQL：同上

---

## 3. Review

### 3.1 自我 review（开 PR 之前自己先过）

- `git diff origin/main...HEAD` 通读一遍
- 任何"我这一行是为了什么"答不出来 → 写注释或重新组织
- 测试覆盖：每个新行为都要有一个测试用例假设它会回归
- 文档：影响 deploy / env 的改动要更新 `docs/DEPLOY.md` 或 `.env.example`

### 3.2 同行 review

reviewer 至少看：

- [ ] PR 描述里宣称的影响范围与实际 diff 一致
- [ ] 没有泄露 secret（搜 diff 里的 `SECRET`、`KEY`、`TOKEN`、`PASSWORD` 大写关键词）
- [ ] 新加的 endpoint 都有：rate limit + Zod 校验 + audit log + 测试
- [ ] 改了 schema → 有 migration 思路（即使是 idempotent 的，也要写在 PR 描述里）

### 3.3 大 PR 怎么办

> 这次 batch 1-3 是个 ≈ 4000 行的大 PR，不能拒。后续应该按 commit / 按文件分批合。

- 看 commit 顺序而不是合并视图：每个 commit 独立 review
- 用 GitHub 的 "Review changes" → "Approve" 时写"按 commit 顺序看的，每个 commit 都能独立 typecheck / test，建议保留 merge commit"

---

## 4. 合并 PR

### 4.1 选择 merge 策略

- **Squash and merge** 适合：单 commit / 临时分支 / 实验性
- **Merge commit** 适合：本次 batch 1-3 这种"每个 commit 都有意义" → 保留 commit 历史
- **Rebase and merge** 适合：linear history 强迫症，commit 顺序保持

### 4.2 默认走 Merge commit

合并提交信息：`Merge pull request #<n> from <branch>` + 简单 1-2 行总结。

### 4.3 删分支

合完之后立刻在 GitHub 上点 "Delete branch"。本地用 `git branch -d feat/...` 清掉。

---

## 5. 合后

### 5.1 验证 main 部署

| 部署            | 触发   | 验证方式                                   |
| --------------- | ------ | ------------------------------------------ |
| Vercel frontend | 自动   | 访问 https://zcritical.co 看是否新版       |
| Render backend  | 自动   | `curl https://api.zcritical.co/api/health` |
| MongoDB Atlas   | 不部署 | —                                          |

### 5.2 跑迁移（如果需要）

如果 PR 描述里写了"合并后跑 migration"：

```bash
# 例：本次安全加固 PR 合后必须跑 PII 加密迁移
pnpm --filter backend exec tsx src/scripts/encrypt-existing-pii.ts
```

### 5.3 监控 30 分钟

- Sentry 是否有新错误激增
- UptimeRobot 是否还能 ping 通
- 关键 API endpoint 不报 5xx
- 数据库连接池没暴涨

### 5.4 PR 描述补一条 "Deployed at HH:MM, no regressions"

---

## 6. 回滚

### 6.1 紧急（< 15 分钟）

```bash
# 在 Render dashboard：Deployments → 选上一个 stable → "Rollback"
# 在 Vercel dashboard：Deployments → 选上一个 stable → "Promote to Production"
```

数据库**不回滚**（除非确认是 schema 灾难）。

### 6.2 计划性（commit 级别）

```bash
# 例：Batch 3 上线后发现 anomaly cron 太吵
git revert 149ad06       # 只回滚 batch 3，保留 1 + 2
git push origin main     # 触发 Render + Vercel 重新部署
```

### 6.3 数据迁移过的 PR 不可单纯 revert

如果 PR 跑了 `encrypt-existing-pii.ts` 这种 schema 改造，**revert 代码 ≠ 回滚数据**。回滚顺序：

1. 先 deploy 一个 hotfix 让代码兼容"加密 + 未加密"两种 row（已经是 idempotent 的，不需要做）
2. 决定数据保持加密还是反向解密：通常**保持加密**，加密是 forward-compatible
3. 不要写"反向解密 migration"除非有不可逆的业务需求

---

## 7. 第一次（Phase 0 batch 1-3）的具体动作

把上面所有步骤套到当前 branch：

1. 打开 https://github.com/SunnyKlara/zcritical-web/pull/new/feat/sec-phase0-batch123
2. base = main，compare = feat/sec-phase0-batch123（GitHub 应该已经默认）
3. 标题：`feat(W4): Phase 0 security hardening (batches 1-3)`
4. 描述：`docs/PR-DESCRIPTION-sec-phase0-batch123.md` 全文复制
5. Reviewer：自己 + 任一团队成员（如果是 solo，跳过）
6. Label：`area:security` `migration`（如果 repo 还没有这两个 label，先去 Issues → Labels 创建）
7. 等 CI 全绿
8. Squash 这次不合适（3 个独立 commit 都要保留），用 **Merge commit**
9. 合完之后：
   - 在 Render 配 `ENCRYPTION_KEY` `PAYPAL_WEBHOOK_ID` 等（详见 `docs/LAUNCH-READINESS.md` §A）
   - 等 Render redeploy 完成
   - 跑 `pnpm --filter backend exec tsx src/scripts/encrypt-existing-pii.ts` 一次（即使没有现存 row 也安全）
   - Sentry / Render logs 监控 30 分钟
10. 删 feature branch

---

## 8. 后续 PR 节奏建议

| 频率 | PR 类型                   | 例                                          |
| ---- | ------------------------- | ------------------------------------------- |
| 每天 | 小修 / 文档 / 单一 commit | docs(W1): typo fix                          |
| 每周 | 单一 feature              | feat(W3): GDPR data-deletion admin override |
| 每月 | 大型重构 / 跨流           | refactor(W3+W4): event sourcing for orders  |
| 季度 | release（v1.x）           | release(v1.1): firmware OTA delta updates   |

大 PR 必须先开 RFC（`docs/INTERFACES.md` 的 RFC 流程）才动手。
