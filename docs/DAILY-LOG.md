# 每日工作日志

> 每个工作流（W1-W5）每天结束前在这里加一行。
> 格式：`[YYYY-MM-DD] [Wn] 简述 — commit hashes`

---

## 2026-05-27

### [W1] Phase 0 协作框架建立

- ✅ 创建 `docs/STRATEGY.md` — 三阶段战略，Phase 0/1/2 准入门禁
- ✅ 创建 `docs/ARCHITECTURE-VISUAL.md` — 8 张 Mermaid 图（系统拓扑/数据流/认证/订单/Socket/部署/ER/安全分层）
- ✅ 创建 `docs/WORKSTREAMS.md` — 5 条工作流定义 + 协作规则
- ✅ 创建 `docs/INTERFACES.md` — 跨流契约 + RFC 流程
- ✅ 创建 `docs/PARALLEL-DEV-GUIDE.md` — git worktree 多窗口操作手册
- ✅ 创建 `docs/SECURITY-AUDIT.md` — 安全差距清单（Critical/High/Medium/Low 分级）
- ✅ 创建 `docs/REFERENCE-PROJECTS.md` — 7 个高质量开源项目深度学习清单
- ✅ 创建 `docs/TECH-ROADMAP.md` — 3-5 年技术演进路线
- ✅ 创建 `scripts/setup-worktrees.mjs` — 一键创建 4 个 worktree

### [W1] 入库 + 多窗口基建上线（晚间）

- ✅ 项目首次入库 GitHub — `https://github.com/SunnyKlara/zcritical-web` — `master → main` 重命名 — commit `fdf13a8`
- ✅ 跑通 `setup-worktrees.mjs` — 物化 4 个 worktree：`critical-fe / -be / -sec / -content`
- ✅ 创建并推送 4 条长期分支到 origin：`feat/fe-base`、`feat/be-base`、`feat/sec-base`、`feat/content-base`
- ✅ README 加上 GitHub 仓库链接 + CI / CodeQL badge
- ✅ 各 worktree 节省策略:node_modules 在对应流首次激活时再装，不预装

**当前状态**：Phase 0 月 1 W1 文档周完成。多窗口"图纸 + 基建"全部到位，下一个动作可以随时切到 W4 安全加固周。

### [W1] CI 救火 + Dependabot 分诊（深夜）

- 🔴 发现：CI #23 在 `61194ce` 上 11s 即挂 — `pnpm/action-setup@v4` 拒绝同时接受 `version: 9` 与 `package.json` 的 `packageManager: pnpm@9.12.0`
- ✅ 修复 1：删 `ci.yml` 里冗余 `version` 参数 + `PNPM_VERSION` env — commit `dff732a`
- 🔴 发现 2：lint 真跑起来后暴露 5 个 `no-extra-semi` 错误 — eslint `recommended` 与 prettier 的前缀分号 ASI 防御互掐
- ✅ 修复 2：在 `backend/.eslintrc.cjs` 里关掉 `no-extra-semi`（治本方案：未来加 `eslint-config-prettier`）— commit `213cbb0`
- ✅ Dependabot 21 个 PR 分诊到 `docs/DEPENDABOT-TRIAGE-2026-05-27.md`：5 个绿合、6 个黄观察、7 个红关闭、3 个延后
- ⚠️ Node 20 deprecation 警告（June 2 起强制 Node 24）：建议本周做一次 "Node 22 baseline" 独立 PR

### [W1] Node 22 baseline 一揽子升级（2 次后续）

- ✅ Node 基线：`.nvmrc` / `package.json#engines` / `Dockerfile.api` 全部 20 → 22 LTS — commit `b67a329`
- ✅ Actions 升级：`actions/checkout@v5` / `actions/setup-node@v6` / `pnpm/action-setup@v6` / `github/codeql-action@v4`
- ✅ 拆掉 6 月 2 日 GitHub Actions 强制 Node 24 的定时炸弹
- ✅ 副作用：dependabot PR #1/#2/#3/#5（actions 升级类）会自动 stale 关闭

### [W4] 启动 + 第一项交付：Admin 2FA TOTP backend

> 在 `feat/sec-base` 分支（critical-sec/ worktree）开发 — commit `e90c673`

- ✅ 设计：双阶段登录（password → mfaToken → TOTP/recovery code → access+refresh）
  - 5 分钟有效期的 mfaToken（独立 HMAC 签名 secret，不与 access/refresh 混淆）
  - 单 token 5 次尝试上限，防爆破
  - 8 个 SHA-256 哈希存储的恢复码（一次性）
  - ±1 时间窗口（30s）的 TOTP 漂移容忍
- ✅ shared/auth.schema.ts：discriminatedUnion `LoginResponse` + 6 个新 schema（Verify2FA / Setup2FA / Disable2FA / MfaTokenPayload / VerifySetup2FA 系列）
- ✅ User Model 加 `totpSecret / totpEnabled / totpActivatedAt / totpRecoveryCodeHashes`，全部 `select: false`
- ✅ 新 service：`backend/src/services/totp.service.ts`（otpauth + qrcode）
- ✅ 路由：`/login`（双阶段）`/verify-2fa` `/2fa/setup` `/2fa/verify-setup` `/2fa/disable`
- ✅ 测试：11 个新集成测试覆盖 setup → verify-setup → activated → mfa_required → verify-2fa → disable 全流程，外加恢复码一次性消费 + 防爆破断言
- ✅ 全套验证：typecheck / lint / format / test 6 文件 38 通过

### [W4] Admin 2FA TOTP frontend — commit `ff7be72`

- ✅ `lib/auth-context.tsx` 全面升级：单阶段 `login()` → 双阶段返回 `LoginOutcome`，新增 `verify2FA / setupTotp / verifySetupTotp / disableTotp`
- ✅ `/admin/login`：3 状态机（credentials → totp / recovery），含 framer-motion 切换动画、`autocomplete="one-time-code"`、剩余尝试次数提示、token 耗尽自动回退
- ✅ `/admin/security`（新页面）：5 阶段流程
  - QR 扫描（next/image，附"无法扫描"折叠手输 secret）
  - 验证码激活
  - 恢复码展示（grid + 复制全部 + 下载 .txt + 必须勾选"已保存"才能完成）
  - 禁用流程（密码 + TOTP 双因子确认）
- ✅ admin dashboard 顶栏加"安全"入口，未启用 2FA 时显示琥珀色 ShieldAlert，已启用显示绿色 ShieldCheck
- ✅ 全套验证：typecheck / lint / check-i18n / build / 38 backend tests 全 ✅

**当前状态**：Phase 0 月 1 W1 完成 + W4 第一项端到端交付。`feat/sec-base` 待开 PR 合 main。

**已知遗留问题**（W1 后续处理）：

1. **commitlint scope 白名单**：已扩充 W1-W5 + lint，covered 在 commit `25782ae`
2. **eslint-config-prettier**：仍是用 rule 关闭单点冲突，应该装 `eslint-config-prettier` 一次性扫平
3. **mfaAttempts in-memory**：当前用 Map + Set 在进程内，多实例时需迁 Redis（写进 W3 backend 积压）
4. **TOTP secret 加密**：`select: false` + 明文 Base32，等 W4-PII epic 时落 Mongoose 字段级加密
5. **Dependabot 21 个 PR**：Node 22 升级会让 PR #1 #2 #3 #5（actions 类）自动 stale，仍需手动 close 7 个红 PR + rebase 5 个绿

**下一步（优先级排序）**：

1. **W4 frontend**：admin 登录页加 2FA 步骤 + 设置页加 setup/disable UI + i18n（zh/en）
2. **W4 → main 合流**：frontend + backend 一并打 PR（首个跨流契约 RFC 演练）
3. **W3 后端启动**：幂等性键（PayPal capture / refund）— 与 W4 并行

---

## 模板（之后每天填）

```
## YYYY-MM-DD

### [W1] 简述
- ✅ 完成项 — commit
- 🚧 进行中 — 状态
- 🚫 阻塞 — 原因 + 需要谁

### [W2] 简述
- ...

### [W3] 简述
- ...
```

---

## 工作流编号速查

| Wn  | 角色      | 工作目录          | 分支前缀        |
| --- | --------- | ----------------- | --------------- |
| W1  | 主控/架构 | critical/         | chore/arch-\*   |
| W2  | 前端      | critical-fe/      | feat/fe-\*      |
| W3  | 后端      | critical-be/      | feat/be-\*      |
| W4  | 安全      | critical-sec/     | feat/sec-\*     |
| W5  | 内容/3D   | critical-content/ | feat/content-\* |
