# 多窗口并行开发操作手册

> 真正能跑起来的 step-by-step 指南。复制粘贴即可。

---

## 1. 概念清单

先理解 3 个核心概念：

### Git Worktree

- 一个 git 仓库可以同时 check out **多个分支到不同目录**
- 不是 clone（不重复下载）— 共享 `.git`
- 每个 worktree 有自己的工作区、stage、HEAD

### 工作流（Workstream）

- 一条独立推进的开发主线
- 对应一个长期分支（如 `feat/be-base`）
- 上面挂多个具体任务分支

### Kiro 窗口

- 你打开的一个 Kiro 实例
- 每个窗口对应一个 worktree 目录
- 各窗口对话完全独立

---

## 2. 一次性环境设置（5 分钟）

### Step 2.1：确认主仓库干净

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical
git status
```

应该输出 `nothing to commit, working tree clean`。

如果有未提交，先 commit 或 stash。

### Step 2.2：创建 4 个 worktree

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical

git worktree add ../critical-fe -b feat/fe-base
git worktree add ../critical-be -b feat/be-base
git worktree add ../critical-sec -b feat/sec-base
git worktree add ../critical-content -b feat/content-base
```

完成后你的目录结构：

```
zcriticalweb/
├── critical/           ← W1 主控（你已在用）
├── critical-fe/        ← W2 前端
├── critical-be/        ← W3 后端
├── critical-sec/       ← W4 安全
└── critical-content/   ← W5 内容
```

### Step 2.3：每个 worktree 装依赖

**重要**：worktree 共享 `.git` 但不共享 `node_modules`。

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical-fe
pnpm install

cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical-be
pnpm install

cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical-sec
pnpm install

cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical-content
pnpm install
```

> 装 4 次有点慢但只此一次。pnpm 用 hardlink，磁盘占用比想象小。

### Step 2.4：验证 worktree 状态

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical
git worktree list
```

应该看到 5 行（包括主 worktree）：

```
e:/.../critical            <commit>  [main]
e:/.../critical-fe         <commit>  [feat/fe-base]
e:/.../critical-be         <commit>  [feat/be-base]
e:/.../critical-sec        <commit>  [feat/sec-base]
e:/.../critical-content    <commit>  [feat/content-base]
```

---

## 3. 开多个 Kiro 窗口

### 方式 A：Kiro CLI 直接打开

```cmd
kiro e:\Users\Administrator\Desktop\zcriticalweb\critical-fe
kiro e:\Users\Administrator\Desktop\zcriticalweb\critical-be
... etc
```

### 方式 B：从 Kiro 内打开

- File → Open Folder → 选对应 worktree 目录
- 第二个 / 第三个窗口同样操作

每个窗口独立，对话历史独立。

---

## 4. 给每个窗口的初始 prompt（复制粘贴）

新窗口打开后，把对应的 prompt 贴给 Kiro，AI 立刻进入角色。

### W2 前端窗口

```
你是 Window W2 前端工作流。

工作目录：critical-fe/
分支：feat/fe-base（你的所有任务分支从这里 branch）
分支前缀：feat/fe-*、fix/fe-*、refactor/fe-*

你只能动这些文件：
- frontend/ 全部
- frontend/messages/*.json（i18n）
- frontend/e2e/*

你不能动这些（要改先在主仓库提 RFC）：
- backend/
- shared/（除非接口契约变更）
- 根目录配置（package.json / tsconfig 等）

任务上下文：
- 阅读 docs/STRATEGY.md 知道战略
- 阅读 docs/WORKSTREAMS.md 找 W2 的任务积压
- 阅读 docs/INTERFACES.md 知道契约

完成标准：
- pnpm typecheck 通过
- pnpm --filter frontend build 通过
- pnpm --filter frontend check-i18n 通过
- 新组件有 Storybook story（如已接入）
- E2E 通过

每完成一个任务：
- commit 用前缀 [W2]
- push 到 remote
- 在主仓库的 docs/DAILY-LOG.md 加一行（你 / W1 来加）

第一个任务：从 WORKSTREAMS.md W2 积压里选第 1 项开始。
```

### W3 后端窗口

```
你是 Window W3 后端工作流。

工作目录：critical-be/
分支：feat/be-base
分支前缀：feat/be-*、fix/be-*、refactor/be-*

你只能动这些文件：
- backend/ 全部
- shared/ 当且仅当走 RFC

你不能动：
- frontend/
- 根目录配置

任务上下文：
- docs/STRATEGY.md
- docs/WORKSTREAMS.md（W3 积压）
- docs/INTERFACES.md（接口契约）
- docs/SECURITY-AUDIT.md（W4 提的安全要求）

完成标准：
- pnpm --filter backend test:coverage 通过门槛
- pnpm --filter backend build 通过
- 新路由有 OpenAPI 描述
- 写操作必须有 AuditLog
- 接口变更先改 shared/

每完成一个任务：
- commit 用前缀 [W3]
- push
- W2 通知（如果改了契约）

第一个任务：从 WORKSTREAMS.md W3 积压里选第 1 项（幂等性键）。
```

### W4 安全窗口

```
你是 Window W4 安全工作流。

工作目录：critical-sec/
分支：feat/sec-base
分支前缀：feat/sec-*、fix/sec-*、chore/sec-*

你的特殊性：跨切关注点，可以触碰任何目录。
但触碰 frontend/ 或 backend/ 时必须：
1. 确认对应流（W2/W3）当前没在改同一文件
2. PR 标题加 [SEC] + 通知对应流

任务上下文：
- docs/STRATEGY.md
- docs/SECURITY-AUDIT.md（你的总图）
- docs/WORKSTREAMS.md（W4 积压）

完成标准：
- 所有安全测试通过
- CodeQL / Semgrep 无新告警
- 涉及前端时 LCP 不退化（<100ms 增加）
- 涉及后端时 P99 延迟不退化

每完成一个任务：
- commit 用前缀 [W4]
- 更新 docs/SECURITY-AUDIT.md
- 写 ADR（重大变更）

第一个任务：Admin 2FA TOTP（见 SECURITY-AUDIT.md §3.1）
```

### W5 内容窗口

```
你是 Window W5 内容 + 3D 工作流。

工作目录：critical-content/
分支：feat/content-base
分支前缀：feat/content-*、docs/content-*

你只能动这些文件：
- frontend/src/components/3d/*（新建）
- frontend/content/*（新建）
- frontend/messages/*.json（仅扩展不删除）
- frontend/public/* 静态资源
- docs/BRAND-GUIDE.md

不能动：
- 业务组件（W2 负责）
- 后端 / 安全 / 配置

任务上下文：
- docs/STRATEGY.md
- docs/WORKSTREAMS.md（W5 积压）
- docs/REFERENCE-PROJECTS.md（参考项目）

完成标准：
- 新内容质量 ≥ Apple / Stripe 官网水平
- 不引入大体积资产（单文件 > 500KB 必须 RFC）
- i18n 完整覆盖（zh + en 都有）
- 视觉变更截图对比

每完成一个任务：
- commit 用前缀 [W5]
- 重大视觉变更截图存到 docs/screenshots/

第一个任务：从 WORKSTREAMS.md W5 积压选第 1 项（FAQ × 30 条扩展）
```

---

## 5. 日常工作流

### 每天开始时（每个窗口都做一遍）

```cmd
cd <你的 worktree>
git fetch origin
git rebase origin/main      # 或 git pull --rebase
pnpm install                # 同步依赖
```

### 工作中

- 每完成一个小任务，立刻 commit
- commit message 用 `[Wn] feat: xxx` 格式
- 频繁 push（防本地灾难）

### 每天结束时

```cmd
# 在你的 worktree 内
git push origin <branch>
```

然后 W1（主控窗口）：

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical
git fetch --all --prune
git log --all --oneline --graph -30   # 看全局图
```

W1 决定哪些分支可以 merge 到 main。

---

## 6. 合流策略

### W1 主控的合流命令

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical

# 想合 W3 的某个 PR
git checkout main
git merge --no-ff feat/be-idempotency
pnpm typecheck && pnpm test
git push origin main
```

### 冲突处理

如果 main 有了新东西，对应 worktree 要 rebase：

```cmd
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical-be
git fetch origin
git rebase origin/main
# 解决冲突
git rebase --continue
git push --force-with-lease
```

**`--force-with-lease` 比 `--force` 安全**，会拒绝覆盖别人的提交。

---

## 7. 完成一条流后清理

任务全部完成、合并到 main 后：

```cmd
# 在主控窗口
cd /d e:\Users\Administrator\Desktop\zcriticalweb\critical

# 移除 worktree（不删工作分支）
git worktree remove ../critical-be

# 删工作分支（已合并就删）
git branch -d feat/be-base
git push origin --delete feat/be-base
```

---

## 8. 常见问题

### Q1：worktree 装依赖太慢？

A：用 pnpm 已经是最快了。如果你 4 个 worktree 都装，用 `pnpm config set store-dir ~/.pnpm-store` 让所有 worktree 共享 store。pnpm 默认就这么干，所以重复装大部分是 hardlink。

### Q2：跨 worktree 改一个文件冲突怎么办？

A：理论上不会发生。如果发生了 = 工作流分割没设计好。回到 `docs/WORKSTREAMS.md` 重新分边界。

### Q3：能不能单 worktree 多分支？

A：能，但不推荐多窗口场景。worktree + 1分支 是最干净的模型。

### Q4：Husky 在 worktree 里能跑吗？

A：能。Husky v9 自动检测每个 worktree。pre-commit 在每个 worktree 独立跑。

### Q5：能不能让多窗口 Kiro 同时改同一文件？

A：能但建议不要。会冲突。**靠 WORKSTREAMS.md 划清边界**，这才是工程方法。

### Q6：CI 资源会爆吗？

A：每个 push 触发 CI，4 条流可能并发。GitHub Actions 免费档每月 2000 分钟，单 build 约 5-10 分钟。

- 月活 push ≤ 200 次没问题
- 超了再升级 Pro（$4/月加 3000 分钟）

### Q7：能不能远程协作（你 + 朋友各开窗口）？

A：能，但需要 GitHub PR 流程：

- 朋友 fork 仓库
- 各自工作
- PR 走 review

短期内只你一人时，本地 worktree 就够。

---

## 9. 能不能更激进 — 自动化多窗口？

### 现阶段不建议

开源多 agent 框架（MetaGPT / CrewAI / AutoGen）目前都还达不到生产级稳定。

### 半自动化方案

可以写个 Node 脚本：

- 每隔 N 小时拉所有 worktree 状态
- 跑 CI
- 给我（W1）一份 status 报告
- 自动处理简单的 rebase

如果你想做这个，告诉我，我能给你写。

---

## 10. 最佳实践小结

1. **每个 worktree 有清晰的边界文件清单**（在 WORKSTREAMS.md）
2. **跨边界改动先走 RFC**（在 INTERFACES.md）
3. **每天每个窗口至少 push 一次**
4. **W1 每天合流一次**
5. **冲突时不慌**，rebase + force-with-lease
6. **新依赖一律 W1 决定**（一致性）
7. **CI 不绿绝不合并**

---

## 11. 起步建议

**不要一上来就开 5 个窗口**。建议节奏：

### 阶段 1（现在 ~ 月 1 W1 末）

- 只用 W1（主控窗口，本仓库）
- 把所有规划文档落地

### 阶段 2（月 1 W2 起）

- 加 W3（后端） + W4（安全）
- 3 窗口并行

### 阶段 3（月 2）

- 加 W2 + W5
- 5 窗口全开

### 阶段 4（月 3）

- 收敛回 W1 + 1-2 个支持窗口
- 集成测试 + 上线准备

按阶段开窗口，避免一开始就管理复杂度爆炸。

---

> 多窗口并行不是"更快"，而是"同时探索多个方向不互相阻塞"。
> 用得好你能在一周做完别人一个月的事。用不好就是一团乱麻。
> 关键在 — 边界清晰、契约明确、每天合流。
