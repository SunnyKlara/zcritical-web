# 安全差距审计

> 用大厂内部安全工程师视角，对当前代码库做一次完整审计。
> 每项都有：现状、风险评级、建议改动、负责流。

> ## 进度（2026-05-27 — Batch 3 完成）
>
> Phase 0 安全加固三批已落地（main 分支）：
>
> **Batch 1**（Admin 安全）：Admin TOTP 2FA · 账户锁定 · Webhook 重放保护 · 幂等性中间件 · 按 username 限速
>
> **Batch 2**（数据 + 平台安全）：PII 字段加密 · CSP nonce · Semgrep + 7 条业务规则 · 强密码 zxcvbn · SBOM · 应急响应 Runbook
>
> **Batch 3**（合规 + 监控）：
>
> - ✅ 🟡 GDPR / CCPA 数据导出 + 删除 API（OTP 验证 + 30 天 grace + hard-delete worker）
> - ✅ 🟢 异地登录 / 新设备检测（fuzzy fingerprint + 邮件告警）
> - ✅ 🟡 业务异常监控（5 分钟周期 / 4 个 KPI / Sentry 告警）
> - ✅ 🟡 OWASP ZAP baseline workflow + rules.tsv（每周 + manual dispatch）
> - ✅ 🟡 Cookie SameSite 决策（ADR-0002 — 现状 None 最佳，触发重评估的条件已列）
>
> **测试**：57 tests 全绿（43 backend + 14 shared）；3 个 workspace typecheck / lint / build 全通过。
>
> **剩余 backlog**：bug bounty 政策（上线后 3 月）/ audit log 冷热分层 / X-Robots-Tag header 加固 / 实测渗透（需 staging 环境就绪）。

---

## 1. 审计方法

### 评级体系

| 等级        | 含义                                      | 处理时限     |
| ----------- | ----------------------------------------- | ------------ |
| 🔴 Critical | 可被远程利用导致数据泄露 / RCE / 资金损失 | 上线前必修   |
| 🟠 High     | 中度风险，部分场景可被利用                | Phase 0 月 1 |
| 🟡 Medium   | 防御深度不足，单点失守问题不大            | Phase 0 月 2 |
| 🟢 Low      | 最佳实践欠缺，目前不构成实际威胁          | Phase 0 月 3 |

### 检查范围

- OWASP Top 10 (2021)
- OWASP API Security Top 10 (2023)
- CIS / NIST baseline
- 业务专属威胁（支付欺诈、库存攻击）

---

## 2. 当前已经做对的（基线）✅

- ✅ HTTPS-only + HSTS preload
- ✅ Helmet 默认安全头（X-Frame-Options DENY 等）
- ✅ JWT 双 token + HttpOnly refresh cookie
- ✅ CSRF 双提交 token 中间件
- ✅ bcrypt cost 12（高于 OWASP 建议的 10）
- ✅ 速率限制（登录 / 表单 / 全局）
- ✅ Pino 日志 redact 敏感字段
- ✅ AuditLog 审计所有 admin 操作
- ✅ Zod 全链路输入校验
- ✅ Honeypot 反爬虫
- ✅ CodeQL 周扫
- ✅ Dependabot 自动更新
- ✅ security.txt
- ✅ CORS 白名单
- ✅ Mongoose schema 强类型
- ✅ Express disable poweredByHeader

**评估**：基线已经超过 80% 中型 SaaS 项目。但接下来才是真正"扎实"的部分。

---

## 3. 高优先级差距（🔴 + 🟠）

### 3.1 🔴 Admin 无 2FA

**风险**：管理员账号密码一旦泄露，攻击者可以：

- 看所有 Lead（客户隐私）
- 看所有订单（PII）
- 标记发货 / 退款（资金损失）
- 修改商品（业务影响）

**当前防护**：仅密码 + bcrypt + 速率限制（5/5min）
**还不够**：密码可能因网络钓鱼 / 信息泄露被获取

**建议方案**：TOTP（Google Authenticator / Authy）

```typescript
// 数据模型
User {
  ...,
  twoFactorEnabled: boolean,
  twoFactorSecret: string,  // 加密存储
  twoFactorBackupCodes: string[],  // 加密 + 一次性
}

// 流程
1. POST /api/auth/2fa/setup  → 生成 secret + QR code
2. POST /api/auth/2fa/verify { token }  → 启用
3. 登录时：POST /api/auth/login  → 200 { requiresTwoFactor: true, tempToken }
4. POST /api/auth/2fa/login { tempToken, token }  → 200 { accessToken, ... }
```

**实现方式**：用 `otplib` 库（成熟、纯 TS、无依赖）

**负责流**：W4
**工作量**：1 天
**优先级**：🔴 必修
**前置依赖**：无

---

### 3.2 🔴 PII 数据库未加密

**风险**：MongoDB Atlas 一旦泄露（虽然 at-rest 已加密），但**字段级未加密**。

- Lead.email / phone / message 完全明文
- Order.shippingAddress（含全名 / 地址 / 电话）明文
- Device.email 明文

**威胁场景**：

- Atlas 工程师内部访问
- 备份文件意外泄露
- SQL 注入虽然用 ORM 不太可能，但仍是纵深防御问题

**建议方案**：Mongoose Field-level encryption

```typescript
// 用 mongoose-field-encryption 或 mongoose-encryption
import { fieldEncryption } from 'mongoose-field-encryption'

LeadSchema.plugin(fieldEncryption, {
  fields: ['email', 'phone', 'message'],
  secret: process.env.PII_ENCRYPTION_KEY,
  saltGenerator: ...
})
```

**注意**：

- 加密字段无法直接索引（需保留 hash 字段做查询）
- 需 KMS 管理密钥（Cloudflare Workers Secrets / AWS KMS）

**负责流**：W3 + W4 协作
**工作量**：2-3 天（含数据迁移）
**优先级**：🔴
**前置依赖**：KMS 选型

---

### 3.3 🟠 CSP 用 unsafe-inline

**当前**：`Content-Security-Policy` 头里有 `'unsafe-inline'`（Helmet 默认）
**风险**：XSS 攻击者注入的 `<script>...</script>` 能直接执行

**当前其他防护**：

- React 自动 escape 文本（不是输入根本注入不进 DOM）
- 严格的 input 校验

**为什么还要加固**：

- 第三方库（如 framer-motion）的 inline style 暴露面
- React 生态有时会有"绕过"（如 `dangerouslySetInnerHTML`）
- 纵深防御原则

**建议方案**：CSP nonce 模式

```typescript
// next.config.mjs
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
        style-src 'self' 'nonce-${nonce}';
        img-src 'self' data: https://*.zcritical.co;
        connect-src 'self' https://api.zcritical.co wss://api.zcritical.co https://api.paypal.com;
        font-src 'self' data:;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim()
    }]
  }]
}
```

**负责流**：W4
**工作量**：1-2 天（含适配 framer-motion / Tailwind）
**优先级**：🟠
**前置依赖**：先 audit 当前 inline style 来源

---

### 3.4 🟠 Webhook 无重放保护

**当前**：PayPal Webhook 验签了，但没有 timestamp 检查
**风险**：攻击者抓到一个合法 webhook（如订单 capture），重放 100 次。

- 我们有幂等性检查（按 `transaction_id`），所以不会重复处理
- 但**前提是幂等键正确实现**（见 3.5）

**建议方案**：

1. 检查 `PayPal-Transmission-Time` 在 ±5 分钟内
2. 持久化已处理的 `PayPal-Transmission-Id`，重复直接 reject

**负责流**：W3
**工作量**：0.5 天
**优先级**：🟠

---

### 3.5 🟠 幂等性键不完整

**当前**：部分写操作没有幂等键
**风险**：

- 用户重复点 "Pay Now"（PayPal capture 重复）
- 重试逻辑导致 admin 退款重复
- Webhook 重放（见 3.4）

**建议方案**：统一幂等性中间件

```typescript
// middleware/idempotency.ts
export async function idempotency(req, res, next) {
  const key = req.header('Idempotency-Key')
  if (!key) return next()  // 不强制，但建议

  const cached = await IdempotencyKey.findOne({ key, route: req.path })
  if (cached) {
    return res.status(cached.status).json(cached.response)
  }

  // 拦截 res.json 来缓存
  const orig = res.json
  res.json = function (body) {
    IdempotencyKey.create({ key, route, status: res.statusCode, response: body, ttl: 24h })
    return orig.call(this, body)
  }
  next()
}
```

应用到所有 mutation：`POST /api/orders/*`, `POST /api/admin/orders/*/refund`, etc.

**负责流**：W3
**工作量**：1 天
**优先级**：🟠

---

### 3.6 🟠 速率限制按 IP 不够

**当前**：所有限速按 IP（`req.ip`）
**风险**：

- 同 IP 多用户（公司 NAT）误伤
- 攻击者用代理池绕过
- 已登录 admin 没限速（如果密码泄露，攻击者可以慢速暴力测试 2FA）

**建议方案**：分层限速

```typescript
// 优先级（取最严格）
1. user_id 限速（已登录用户，按 sub claim）
2. session 限速（访客，按 sessionToken）
3. ip 限速（fallback）
```

特别地：

- 登录 5/5min/IP（已有）+ 5/5min/username（新增，防按用户名暴力）
- 已登录用户 60/min/user（防被持密钥的攻击者批量调用）

**负责流**：W4
**工作量**：1 天
**优先级**：🟠

---

### 3.7 🟠 缺 SAST 深度扫描

**当前**：仅 CodeQL（GitHub 默认）
**差距**：

- CodeQL 对 TS 项目误报较多 / 漏洞检测窄
- 缺 Semgrep 这类规则更丰富的工具
- 缺业务规则审计（如 "调用 PayPal 必须先验金额"）

**建议方案**：Semgrep + 自定义规则

```yaml
# .semgrep.yml
rules:
  - id: paypal-capture-must-verify-amount
    pattern: |
      paypal.captureOrder($X)
    pattern-not-inside: |
      ...
      verifyAmount($X, ...)
      ...
      paypal.captureOrder($X)
    message: "PayPal capture without verifyAmount() — possible price manipulation"
    severity: ERROR

  - id: no-direct-mongo-find-without-tenant
    pattern: $M.find({ ... })
    pattern-not: $M.find({ tenantId: ..., ... })
    message: "Mongo find without tenantId — multi-tenant leak risk"
    severity: WARNING
```

**负责流**：W4
**工作量**：1-2 天
**优先级**：🟠

---

## 4. 中优先级差距（🟡）

### 4.1 🟡 无 SBOM

**当前**：依赖列表只在 `pnpm-lock.yaml`
**差距**：供应链审计 / SCA 工具友好度低
**建议**：Syft 生成 SBOM

```yaml
# .github/workflows/sbom.yml
- uses: anchore/sbom-action@v0
  with:
    format: cyclonedx-json
    output-file: sbom.json
- uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
```

**负责流**：W4
**工作量**：0.5 天

---

### 4.2 🟡 无渗透测试

**建议**：上线前必做

- OWASP ZAP baseline scan（CI 自动）
- ZAP full scan（手动，季度）
- 邀请 1-2 位 bug bounty hunter 审计

**负责流**：W4
**工作量**：3-5 天
**安排**：Phase 0 月 3

---

### 4.3 🟡 GDPR 数据导出 API 缺失

**当前**：用户邮件请求数据导出，无自动化
**法律风险**：欧洲客户合规问题
**建议**：

```
POST /api/account/export-data
{ email, otp_token }  // OTP 验证身份
→ 200 { downloadUrl: 'https://r2.../<encrypted>.zip' }
```

**负责流**：W3
**工作量**：1-2 天

---

### 4.4 🟡 GDPR 数据删除 API 缺失

**建议**：

```
POST /api/account/delete
→ 软删除 + 30 天 grace period + 然后真删
```

**负责流**：W3
**工作量**：1 天

---

### 4.5 🟡 Cookie 安全标志审计

**当前**：refresh cookie 是 `HttpOnly + Secure + SameSite=Lax`
**建议**：升级到 `SameSite=Strict`

- Lax 在跨站 GET 时仍发 cookie
- Strict 完全不发 — 我们没有跨站 GET 需求
  **注意**：Strict 会导致 OAuth 跳转回来时 cookie 丢失。但我们没有 OAuth，所以安全可改。

**负责流**：W4
**工作量**：0.5 天

---

### 4.6 🟡 缺业务异常监控

**当前**：错误进 Sentry，但**业务异常**（如"24 小时内 100 个 IP 创建订单但没付款"）无监控
**建议**：定义关键业务指标，超阈值告警

- 订单创建无 capture 比例 > 20%
- Lead 来自单 IP > 50/h
- 退款率 > 5%

**实现**：MongoDB aggregation + 定时任务 + Sentry Alert

**负责流**：W3
**工作量**：1 天

---

### 4.7 🟡 缺 Anomaly Detection

**例如**：

- 同一 email 同时下 10 个订单
- 同一 IP 短时间内访问 100 个不同 product slug（爬虫）
- Admin 在异常时间登录

**建议**：基础规则引擎 + 累积告警
**负责流**：W4
**工作量**：2-3 天

---

## 5. 低优先级差距（🟢）

### 5.1 🟢 Bug Bounty 政策

**建议**：上线后 3 个月启动

- 用 HackerOne 或 Bugcrowd 平台
- 或自建（在 SECURITY.md 列规则）
- 奖金：Critical $500、High $200、Medium $50、Low 致谢

### 5.2 🟢 audit log 保留策略

**建议**：90 天热存 + 1 年冷存（R2）+ 法律要求年限删除

### 5.3 🟢 加 X-Robots-Tag 到敏感路由

**当前**：admin 路径靠 noindex meta tag
**升级**：HTTP header 也加，Nginx/Vercel 配置

```
X-Robots-Tag: noindex, nofollow, noarchive
```

### 5.4 🟢 Subresource Integrity (SRI)

**当前**：CDN 资源（如 Tailwind CDN — 但我们没用）
**升级**：所有外链 script/link 加 `integrity` 属性

### 5.5 🟢 强密码策略 + zxcvbn

**当前**：密码无长度 / 复杂度要求（除 Zod 的 min(8)）
**升级**：用 zxcvbn 做强度评分，弱密码拒绝

### 5.6 🟢 Account Lockout

**当前**：仅速率限制
**升级**：连续 5 次失败后 30 分钟锁定 + 邮件通知

### 5.7 🟢 Session 异地登录检测

**当前**：无
**升级**：记录 user-agent / IP，新设备登录时邮件告警

---

## 6. 网络层加固（Cloudflare）

部署后立即在 Cloudflare 启用：

| 设置              | 推荐值                           | 作用                           |
| ----------------- | -------------------------------- | ------------------------------ |
| Security Level    | High                             | 自动挑战可疑请求               |
| Bot Fight Mode    | On                               | 拦截已知机器人                 |
| DDoS Protection   | On (默认)                        | 大流量自动缓解                 |
| Rate Limiting     | 100 req/10s/IP                   | 边缘层多一层保护               |
| WAF Managed Rules | OWASP Core + Cloudflare Specials | OWASP Top 10                   |
| Custom WAF Rule   | 拦截已知 admin path bot scan     | 防自动扫描                     |
| HSTS              | Max-Age 1y, includeSubdomains    | （应用层已有，边缘再 enforce） |
| Always Use HTTPS  | On                               | HTTP 自动 301 到 HTTPS         |
| TLS 1.3           | On                               | 现代加密                       |
| Min TLS           | 1.2                              | 拒绝老协议                     |

---

## 7. 合规清单

### GDPR（欧洲）

- ✅ Privacy Policy
- ✅ Cookie consent banner
- 🟡 数据导出 API（W3 待加）
- 🟡 数据删除 API（W3 待加）
- 🟡 DPA / SCC（部署到欧洲服务器需要）

### CCPA（加州）

- ✅ Privacy Policy 包含 CCPA 条款
- 🟡 "Do Not Sell My Info" 链接（如果有数据销售）

### PCI-DSS

- ✅ 不存储信用卡（PayPal 处理，我们 PCI SAQ-A）
- ✅ HTTPS 全站

### 中国《个人信息保护法》

- ⚠️ 如果在中国境内运营，需要本地化部署 + 备案
- 当前 zcritical.co 在国外，不构成"中国境内提供服务"
- zcritical.cn 如果启用，需要备案 + 国内云

---

## 8. 时间表（与 STRATEGY.md 对齐）

### 月 1 W2 — 安全加固周（W4 主导）

| 周         | 任务                         | 优先级 |
| ---------- | ---------------------------- | ------ |
| W2 day 1-2 | Admin 2FA TOTP               | 🔴     |
| W2 day 3   | CSP nonce 重构               | 🟠     |
| W2 day 4   | 速率限制升级（user_id 维度） | 🟠     |
| W2 day 5   | Cookie SameSite=Strict 审计  | 🟡     |

### 月 1 W3 — 可靠性周（W3 主导）

| 任务                            | 优先级 |
| ------------------------------- | ------ |
| 幂等性中间件 + 全 mutation 覆盖 | 🟠     |
| Webhook 重放保护                | 🟠     |
| 库存分布式锁                    | 🟡     |

### 月 1 W4 — 监控周

| 任务                    |
| ----------------------- |
| Semgrep 集成 + 业务规则 |
| SBOM 自动生成           |
| 业务异常监控            |
| 自动备份                |

### 月 2 W5 — 加密 + 合规

| 任务                     |
| ------------------------ |
| PII 字段加密             |
| GDPR 数据导出 / 删除 API |
| Account Lockout          |
| Session 异地登录检测     |

### 月 3 W11 — 渗透测试

| 任务                        |
| --------------------------- |
| OWASP ZAP baseline + full   |
| 邀请 bug bounty hunter 审计 |
| Penetration test report     |
| 修复发现的所有问题          |

---

## 9. 验收标准

每个 Phase 末必须达到：

### Phase 0 末

- [ ] 所有 🔴 项已修
- [ ] 所有 🟠 项已修
- [ ] 60%+ 🟡 项已修
- [ ] OWASP ZAP baseline 0 high
- [ ] OWASP ZAP full 0 critical
- [ ] 邀请的 bug bounty hunter 报告无 critical
- [ ] 安全 Runbook 完整（应急响应流程）
- [ ] 所有 admin 启用 2FA
- [ ] 所有 PII 已加密
- [ ] 自动备份验证可恢复

### Phase 1 上线 30 天后

- [ ] 0 P0/P1 安全事件
- [ ] Cloudflare WAF 拦截统计 review
- [ ] Sentry 错误率 < 0.1%

---

## 10. 应急响应

### 安全事件分级

- **P0**：数据泄露 / 资金损失正在发生 → 立即响应（< 15 min）
- **P1**：高危漏洞被利用 → < 1h 响应
- **P2**：中危漏洞 / 异常增加 → < 24h 响应
- **P3**：低危 / 改进项 → 1 周

### Runbook（待 W4 起草）

- `docs/runbooks/SECURITY-INCIDENT.md`
- 关键操作：
  1. 立即收集证据（日志 / 数据库快照）
  2. 隔离（封禁 IP / 撤销 token）
  3. 评估影响范围
  4. 通知（受影响用户 / 监管 / 内部）
  5. 修复 + 验证
  6. 事后复盘

---

> "Security is a process, not a product."
> — Bruce Schneier
>
> 这个清单不是做完一次就完了，是每个 release 都要 review 一次的活文档。
