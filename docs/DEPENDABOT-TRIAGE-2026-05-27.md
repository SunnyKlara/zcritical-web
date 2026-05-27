# Dependabot 首批 21 个 PR 分诊（2026-05-27）

> 上下文：仓库首次 push 后 Dependabot 一次性开了 21 个升级 PR。
> 全部 CI 红 = 因为它们都基于 commit `61194ce`，那个 commit 的 CI 本身就坏（pnpm version 冲突）。
> 修复 commit `dff732a` 推 main 后，rebase 这些 PR 即可让 CI 重新评估。
>
> **本文档是处理建议清单**，实际合并/关闭操作需要在 GitHub UI 用人手做（机器无法以你的身份合并）。

---

## 分类规则

- 🟢 **直接合**：补丁/次要版本升级、与项目契约无冲突
- 🟡 **rebase 后看 CI**：主版本但风险可控、需要 CI 验证
- 🔴 **暂缓 / 关闭**：主版本破坏性变更、或与项目战略冲突
- ⏸️ **延后到 Phase 0 月 2**：不紧急、批量评估更高效

---

## 处理建议

### 🟢 立刻 rebase + 合（5 个）

这些是补丁/次要版本，破坏面极小：

| PR  | 变更                                        | 备注                                                                                  |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| #13 | pino-pretty 11.3.0 → 13.1.3                 | log 美化工具，开发期才用                                                              |
| #15 | nodemailer + @types/nodemailer (backend)    | 邮件发送，看 changelog 无 breaking                                                    |
| #18 | @types/node 22 → 25 (frontend, types group) | 仅类型，不影响运行时                                                                  |
| #21 | tailwind-merge 2.6.1 → 3.6.0 (frontend)     | 主版本但 API 稳定，README 应该平滑                                                    |
| #4  | Docker node:20-alpine → 26-alpine           | ⚠ 与项目当前 Node 20 不对齐，**我建议改成 22-alpine 而不是 26-alpine** — 见下方决策点 |

### 🟡 rebase 后看 CI 决定（6 个）

主版本升级，需要 CI 验证 + 看 changelog：

| PR  | 变更                                    | 风险点                                                           |
| --- | --------------------------------------- | ---------------------------------------------------------------- |
| #1  | actions/setup-node 4 → 6                | Node 20 deprecation 强制升级前必须做，**优先级最高**             |
| #3  | actions/checkout 4 → 6                  | 同上                                                             |
| #5  | pnpm/action-setup 4 → 6                 | 同上                                                             |
| #2  | github/codeql-action 3 → 4              | CodeQL 主版本，需看 .github/workflows/codeql.yml 有没有 breaking |
| #9  | @sentry/node 8 → 10 (backend)           | Sentry 主版本变化大，可能要改 init 代码                          |
| #10 | @commitlint/config-conventional 19 → 21 | commit message 校验规则可能更严，需要 verify                     |

### 🔴 暂缓 / 关闭（7 个）

这些主版本升级有显著破坏性，与 Phase 0 节奏不符：

| PR  | 变更                               | 推荐动作 + 理由                                                            |
| --- | ---------------------------------- | -------------------------------------------------------------------------- |
| #6  | eslint 8 → 10 (shared)             | **Close**：ESLint 9 引入 flat config，全项目要重写 .eslintrc，应该单独 RFC |
| #7  | typescript 5.9 → 6.0 (shared)      | **Close**：TS 6 太新（2026），生态没跟上，等 6.x 稳定后整体升              |
| #8  | zod 3 → 4 (shared)                 | **Close**：zod 4 有 API 变化，shared schema 是单一真相源，要全栈一起升     |
| #19 | zod 3 → 4 (root)                   | **Close**：同上，重复                                                      |
| #11 | eslint 8 → 10 (backend)            | **Close**：同 #6                                                           |
| #17 | eslint group (frontend, 2 updates) | **Close**：包含 eslint major bump                                          |
| #20 | tailwindcss 3 → 4 (frontend)       | **Close**：Tailwind 4 是 alpha/beta（2026 还在路上），生产不能用           |

### ⏸️ 延后批量评估（3 个）

| PR  | 变更                                          | 理由                                                       |
| --- | --------------------------------------------- | ---------------------------------------------------------- |
| #12 | @apidevtools/swagger-parser 10 → 12 (backend) | 主版本但小依赖，与 OpenAPI 流程绑定，等 W3 启动时一并验证  |
| #14 | next-stack group (7 updates, frontend)        | Next.js 主栈批量升级，应该作为 W2 的独立任务（M2 W6 之后） |
| #16 | eslint-config-next 14 → 16                    | 与 Next.js 主版本绑定，归到 #14 一起处理                   |

---

## 关键决策点

### 决策 1：Node 版本基线

`.nvmrc` 当前是 `20`，但 GitHub Actions 6 月起强制 Node 24，
Dockerfile 又要 26-alpine。**需要一次性对齐**：

**建议**：

- 本地开发 + CI runner：升到 Node **22 LTS**（2027-04 维护到期，足够覆盖 Phase 0+1+2）
- Dockerfile：升到 `node:22-alpine`，**不接受 #4 的 26-alpine**
- 改 `.nvmrc` + `package.json` engines + `.github/workflows/*.yml` env

这是一个独立 PR 的事，建议 **W1 单独做一次"Node 22 baseline"**。

### 决策 2：Actions/checkout/setup-node/setup-pnpm 升级顺序

强烈建议**今天就把 #1 #3 #5 合掉**。理由：

- 6 月 2 日（5 天后）GitHub Actions 默认 Node 24，旧 v4 actions 会被强制改命运
- 这三个升级互相独立，风险极低
- 升完后整个 CI 链路对未来 1 年不会再遇到 actions deprecation

### 决策 3：dependabot 配置调优

当前 `.github/dependabot.yml` 把所有依赖类型都开到 PR=10，
所以一次性涌出来 21 个。**建议**：

- 安全更新：immediate
- 主版本：每周一次 batch
- 补丁版本：自动 merge（如果 CI 绿）

下次 W1 时间窗口可以做 dependabot.yml 重构。

---

## 时间表

| 时间             | 谁  | 动作                                                      |
| ---------------- | --- | --------------------------------------------------------- |
| **今天**         | W1  | 关闭 7 个 🔴 PR + rebase + 合 #1 #3 #5（CI actions 升级） |
| **明天**         | W1  | 评估 #2 #9 #10 + 处理 5 个 🟢                             |
| **本周内**       | W1  | "Node 22 baseline" 独立 PR                                |
| **月 2 W6**      | W2  | next-stack 升级（#14 #16）                                |
| **月 2 W6 之后** | W1  | 重构 dependabot.yml，避免下次再涌                         |

---

> 这是 W1 主控应该做的"工程纪律"动作，不是产能动作。
> 但忽略它会让仓库永远红，开发心智负担会爆炸。
