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

### [W4] main 上独立实现安全加固 batch 1（晚间）

> 在 main 分支独立完成（不依赖 `feat/sec-base` 的 worktree 工作），覆盖 SECURITY-AUDIT.md 1 个 🔴 + 4 个 🟠

- ✅ **Admin 2FA TOTP**（otplib + AES-256-GCM 加密 secret）
  - User Model 加 `twoFactorEnabled / twoFactorSecret / twoFactorBackupCodes / twoFactorLastStep`，全部 `select: false`
  - 新文件 `backend/src/lib/crypto.ts` — AES-256-GCM 通用加解密 + HKDF fallback（dev/test 不强制 `ENCRYPTION_KEY`）
  - 新文件 `backend/src/services/two-factor.service.ts` — 生成/校验 TOTP、备份码、challenge token（独立 audience claim 防与 access token 混用）
  - 新路由 `/api/auth/2fa/{verify,status,setup,enable,disable,backup-codes}` + `/login` 双阶段返回 `requiresTwoFactor`
  - shared `auth.schema.ts` 改成 `LoginResponse = LoginSuccessResponse | LoginTwoFactorChallengeResponse` + 8 个新 schema
  - frontend `auth-context.tsx` 加 `verifyTwoFactor()`，`/admin/login` 改成 2 阶段状态机（密码 → TOTP/备份码切换 + 5 分钟倒计时）
- ✅ **账户锁定 + 按用户名限速**（5 次失败 / 15 分钟锁；5/5min/username + 5/min/IP）
  - User Model 加 `failedLoginAttempts / lockedUntil`
  - `auth.service.ts` 提供 `isLockedOut / recordFailedLogin / recordSuccessfulLogin`，全用结构化接口避开 Mongoose 严格类型
  - 锁定期间即使密码正确也返回 423
- ✅ **PayPal Webhook 重放保护**
  - 新模型 `WebhookEventModel`（`{provider, transmissionId}` 唯一索引 + 30 天 TTL）
  - 新增 ±5 分钟 `paypal-transmission-time` 时间窗口校验
  - 重复 `transmission-id` 直接 200 短路，业务侧 0 副作用
- ✅ **幂等性中间件**
  - 新模型 `IdempotencyKeyModel`（`{scope, key}` 唯一 + 24h TTL + bodyHash 防同 key 不同 body 攻击）
  - 新文件 `backend/src/middleware/idempotency.middleware.ts` — 包装 `res.json` 缓存响应，重放回放 200，body 不一致返 422
  - 已应用到 `POST /api/orders`、`POST /api/orders/payments/paypal/capture`、`POST /api/admin/orders/:id/{ship,refund}`
- ✅ env 校验：`ENCRYPTION_KEY`（hex 32 bytes，prod 强制）+ `TOTP_ISSUER`（默认 `Critical`），`.env.example` 同步
- ✅ OpenAPI 同步：`/auth/login` 改成 oneOf 联合体 + 7 个新 2FA 端点；`423` 已纳入返回码集合
- ✅ 测试：35 个全绿（+11 个新增：lockout / 2FA enroll / TOTP fail / 备份码一次性 / idempotency 4 项）
- ✅ 全套验证：3 个 workspace `typecheck / lint / build` 全部通过

**当前覆盖度**（按 SECURITY-AUDIT.md 评级）：

| 项                      | 等级    | 状态           |
| ----------------------- | ------- | -------------- |
| Admin 2FA               | 🔴      | ✅             |
| Webhook 重放保护        | 🟠      | ✅             |
| 幂等性键完整            | 🟠      | ✅             |
| 速率限制按用户名 / IP   | 🟠      | ✅             |
| Account Lockout         | 🟢      | ✅（提前完成） |
| TOTP secret 加密        | 🟢 衍生 | ✅             |
| PII 字段加密            | 🔴      | 🚧 等 KMS 选型 |
| CSP unsafe-inline 重构  | 🟠      | 🚧             |
| Semgrep + 业务规则 SAST | 🟠      | 🚧             |

---

### [W4] 安全加固 batch 2（PII 加密 / CSP / Semgrep / SBOM / Runbook）

- ✅ **🔴 PII 字段级加密**
  - 新增 `backend/src/db/encrypted-fields.plugin.ts` — Mongoose 通用插件，`pre('save')` 加密 + `post('init')` / `post('save')` 解密；幂等地用 `looksEncrypted` 判定，旧行迁移期可读
  - `lib/crypto.ts` 增加 `blindIndex(domain, value)` HMAC-SHA256，配套 `emailBlindIndex` 给 Order/Lead/Device 三个模型加 `emailHash`，原 plaintext-email 索引下线
  - 已加密字段：Lead.{name,email,phone,message} / Order.{email, shippingAddress.{fullName,line1,line2,phone}} / Device.email
  - 路由相应改造：order lookup / device activation 走 emailHash 查询；lead/order list `.lean()` 走新增 `decryptLean(...)` helper
  - 新增一次性迁移脚本 `scripts/encrypt-existing-pii.ts`（idempotent，可重跑）
  - 新增独立测试套件 `__tests__/encryption.test.ts` — 验证写入是 ciphertext、读取是 plaintext、blind index 仍能 equality-find
- ✅ **🟠 CSP nonce 重构**
  - 改造 `frontend/src/middleware.ts`：edge runtime 生成 16-byte base64 nonce → `x-csp-nonce` request header → 全 HTML 响应 `Content-Security-Policy`
  - prod 策略：`script-src 'self' 'nonce-...' 'strict-dynamic' https:`（无 unsafe-inline / unsafe-eval）；dev 保留 unsafe-eval 兼容 HMR
  - root layout 用 `headers().get('x-csp-nonce')` 注入到 `<ThemeProvider nonce={...}>`、StructuredData JSON-LD `<script>`，next-themes FOUC blocker 也带上 nonce
- ✅ **🟠 Semgrep**
  - 新 workflow `.github/workflows/semgrep.yml` — `p/security-audit + p/owasp-top-ten + p/javascript + p/typescript + p/nodejs + p/expressjs + p/react` 7 个 rule pack + 本仓 7 条 custom rule
  - Custom rules：capture 必须验金额、webhook 必须验签、admin route 必须挂 requireAdmin、order mutation 必须 idempotency、Mongo find 不能裸 email、bcrypt rounds < 12、Math.random for security
- ✅ **🟢 强密码策略**
  - `services/password.service.ts` 用 `@zxcvbn-ts/core + language-en + language-common`，要求长度 ≥ 12 且 score ≥ 3
  - `seedDefaultAdmin` 在 prod 启动时强制校验 ADMIN_PASSWORD，弱密码 fail-fast 拒绝启动
  - 新增 `POST /api/auth/change-password` 端点 — 验旧密码 + 强度校验 + bump tokenVersion 失效所有他端 session
- ✅ **🟡 SBOM**
  - `.github/workflows/sbom.yml` — main 推送 + `v*` tag 时用 anchore/sbom-action 生成 CycloneDX JSON，artifact 保留 365 天
- ✅ **应急响应 Runbook**
  - `docs/runbooks/SECURITY-INCIDENT.md` — 0~15min 取证 + 止损 / 15~60min 影响评估 + 监管通报 / 24~72h 通报 + post-mortem / 季度 tabletop 演练 / 联系人速查 / dont's

**测试**：39 backend tests 全绿（+1 encryption test 套件，含 3 个 case）
**typecheck / lint / build**：3 个 workspace 全部通过

---

### [W4] 安全加固 batch 3（GDPR 数据权利 / 异地登录 / Anomaly / ZAP / Cookie ADR）

- ✅ **🟡 GDPR / CCPA 数据导出 + 删除 API**
  - 新模型 `DataRequestModel` — 状态机 pending / verified / completed / cancelled / failed，OTP sha256 哈希 `select: false`，`scheduledDeleteAt` 30 天 grace
  - 新 service `services/gdpr.service.ts` — `collectUserData / scheduleSoftDelete / cancelSoftDelete / performScheduledDeletions`（hard-delete worker），blind-index 跨 Lead/Order/Device 联查
  - 新 router `routes/account.routes.ts` — `POST /api/account/data-request` (始终返回 202，防 enumeration) + `/verify` (导出 JSON 或软删 30 天 grace) + `/cancel-deletion`
  - 邮件模板：OTP 验证 + 删除安排
  - Lead/Order/Device 三模型加 `scheduledDeleteAt` 字段 + 索引
  - 新增测试套件 `__tests__/gdpr.test.ts`（5 个 case：202 always / 不泄露 enumeration / export 路径 / 错 OTP 拒绝 / delete + grace + hard-delete 全流程）
- ✅ **🟢 异地登录 / 新设备检测**
  - 新模型 `LoginDeviceModel`（`{userId, fingerprintHash}` 唯一索引）
  - 新 service `services/login-device.service.ts` — `fingerprint = sha256(UA | ip-prefix)`，IPv4 收敛到 /24，IPv6 收敛到 /48
  - 在 `/login` + `/2fa/verify` 成功路径 fire-and-forget 调用，新设备自动发邮件 + audit `auth.new_device`
  - 邮件模板含 IP / UA / 时间 + 引导用户改密 + 重新生成 backup codes
- ✅ **🟡 业务异常监控**
  - 新 service `services/anomaly.service.ts` — 5 分钟周期 4 个 KPI：失败登录/h、单 IP 询盘/h、capture 成功率/h、退款率/24h
  - 阈值触发 → Sentry `captureMessage`（warning 级 + tags.kpi）+ audit `anomaly.<kpi>`
  - 同一 tick 顺手跑 GDPR `performScheduledDeletions`
  - 启停接入 `index.ts` 的 graceful shutdown 流水线
- ✅ **🟡 OWASP ZAP baseline**
  - 新 workflow `.github/workflows/zap-baseline.yml` — 每周日 03:00 UTC + `workflow_dispatch` 触发，passive scan 永不 fail merge
  - `.zap/rules.tsv` — CSP / Permissions-Policy 已知误报降级到 WARN
- ✅ **🟡 Cookie SameSite ADR-0002**
  - `docs/DECISIONS.md` 新增条目说明为什么 `SameSite=None` 是当前最佳选择（跨 site 部署），列出触发重评估的条件
- ✅ CSRF 中间件白名单加上 3 个 GDPR 端点
- ✅ OpenAPI 同步：3 个新 Account 端点 + 1 个 change-password 端点

**典型修复**：

1. LoginDevice findOneAndUpdate 撞坏：`$setOnInsert.loginCount` 与 `$inc.loginCount` 冲突 → 删 `$setOnInsert` 那行
2. DataRequest 校验 `otpHash required`，但 verify 时要"烧掉" → 改 `$unset` 替代赋空串
3. OpenAPI 在我合并 change-password + Account 路径时一度结构错位 → 重新组装并补 `Account` tag

**测试**：43 backend + 14 shared = 57 tests 全绿（+5 GDPR）
**typecheck / lint / build**：3 个 workspace 全部通过

**Phase 0 安全加固覆盖度**（按 SECURITY-AUDIT.md 评级）：

| 项                               | 等级 | 状态                                |
| -------------------------------- | ---- | ----------------------------------- |
| Admin 2FA                        | 🔴   | ✅                                  |
| PII 字段加密                     | 🔴   | ✅                                  |
| Webhook 重放保护                 | 🟠   | ✅                                  |
| 幂等性键完整                     | 🟠   | ✅                                  |
| 速率限制按用户名 / IP            | 🟠   | ✅                                  |
| CSP unsafe-inline 重构           | 🟠   | ✅                                  |
| Semgrep + 业务规则 SAST          | 🟠   | ✅                                  |
| GDPR 数据导出 / 删除 API         | 🟡   | ✅                                  |
| Cookie SameSite 决策             | 🟡   | ✅ (ADR-0002)                       |
| 业务异常监控                     | 🟡   | ✅                                  |
| SBOM 自动生成                    | 🟡   | ✅                                  |
| 渗透测试 (ZAP baseline workflow) | 🟡   | ✅ scaffold (实测需要 staging 环境) |
| 异地登录检测                     | 🟢   | ✅                                  |
| Account Lockout                  | 🟢   | ✅                                  |
| 强密码 zxcvbn                    | 🟢   | ✅                                  |
| TOTP secret 加密                 | 🟢   | ✅                                  |

剩余 backlog（按 SECURITY-AUDIT.md §5）：

- 🟢 §5.1 Bug bounty 政策（推荐上线 3 个月后启动）
- 🟢 §5.2 audit log 保留策略（90 天热 + 1 年冷存）
- 🟢 §5.3 X-Robots-Tag header 加固
- 🟢 §5.4 SRI 给少数外链
- 实测渗透：等域名 + staging 环境就绪后跑 ZAP full + 邀请 1-2 位 bug bounty hunter

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
