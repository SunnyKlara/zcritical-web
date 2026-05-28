# 上线就绪清单（Launch Readiness）

> 版本：v1 · 日期：2026-05-27 · 持有人：W1 / W4
>
> **唯一可信源**。所有"上线还差什么"的讨论以这份文档为准。每完成一项就打勾。
> 这份清单是 [`docs/DEFERRED.md`](./DEFERRED.md) Tier 1 的执行版，加上 W4 安全验证项。

---

## 现状（一句话）

代码层面 v1.0 全闭环 + 三批安全加固已完成（57 tests 全绿）。**剩下的全部是"在真环境验证 + 接通外部依赖"，不是写代码。**

---

## P0 — 不做不能上线（hard block）

每项给一个明确的"完成判定"，可独立验证。

### A. 凭证 / 密钥（半天）

> 在 Render 后端 web service 的 Environment 面板填入。永远不要写进 git。

| 变量                                                  | 命令 / 来源                | 完成判定                                                                    |
| ----------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`                                   | `openssl rand -hex 32`     | ≥ 32 字符且与 refresh secret 不同                                           |
| `JWT_REFRESH_SECRET`                                  | `openssl rand -hex 32`     | ≥ 32 字符且与 access secret 不同                                            |
| `ENCRYPTION_KEY`                                      | `openssl rand -hex 32`     | 64 hex 字符；**生成后立即在 1Password 备份**，丢了等于所有加密 PII 不可恢复 |
| `MONGODB_URI`                                         | Atlas M0 集群创建          | 能从 Render 出口 IP 连得通                                                  |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL`   | 管理员选                   | 密码必须 zxcvbn ≥ 3（≥ 12 字符 + 复杂度），否则 prod 启动会 fail-fast       |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SendGrid Free 注册         | 验证发件域名（DKIM + SPF + DMARC 全配）                                     |
| `NOTIFY_EMAIL`                                        | 内部邮箱                   | 收到一封测试 lead 通知                                                      |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`           | PayPal Developer Live App  | 能成功创建一个测试 order                                                    |
| `PAYPAL_WEBHOOK_ID`                                   | PayPal Webhook 订阅时获取  | 能验签一次 sandbox webhook                                                  |
| `SENTRY_DSN`（backend + frontend 各一个）             | sentry.io 创建项目         | Sentry 控制台收到一条来自 backend 的 test event                             |
| `FRONTEND_URL`                                        | `https://zcritical.co`     | CORS 白名单匹配                                                             |
| `NEXT_PUBLIC_BACKEND_URL` (frontend)                  | `https://api.zcritical.co` | 前端 fetch 不被 CORS 拒绝                                                   |

**完成判定（整组）**：在 Render 控制台点 "Manual Deploy"，启动日志里 `seedDefaultAdmin` 不报错，`/api/health` 返回 200。

### B. DNS / 域名 / TLS（1-2 小时）

| 项                          | 操作                                                                       | 完成判定                                               |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `zcritical.co` → Vercel     | Cloudflare DNS：CNAME 到 Vercel 提供的目标                                 | 浏览器访问 `https://zcritical.co` 看到首页             |
| `api.zcritical.co` → Render | Cloudflare DNS：CNAME 到 Render 服务域                                     | `curl https://api.zcritical.co/api/health` 返回 200    |
| 邮件子域                    | SendGrid 给的 MX/CNAME 记录                                                | SendGrid Domain Authentication 绿勾                    |
| CAA 记录                    | 限制可签发证书的 CA                                                        | `dig CAA zcritical.co` 看到 letsencrypt + cloudflareca |
| Cloudflare 边缘             | Always Use HTTPS / HSTS / Bot Fight Mode / WAF Managed Rules / Min TLS 1.2 | 控制面板逐项打勾                                       |

### C. 在 Staging 验证未跑过的链路（1-2 天）

> **强烈建议先开 staging**：用一个独立 Render service + 一个独立 Vercel project + 一个 Atlas M0，全部用 sandbox / test 凭证。Staging 验证完再切 production。

| 链路                 | 怎么验                                                                                                                                 | 完成判定                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **PII 加密迁移**     | 先在 staging 灌入几条假 lead/order/device，跑 `pnpm --filter backend exec tsx src/scripts/encrypt-existing-pii.ts`，再跑一次（验幂等） | mongo console 看 `email` 是 `v1:...` 密文；管理后台依然能看到明文       |
| **SMTP**             | 提交一个 lead，不在 honeypot 触发；下一个订单走 sandbox PayPal                                                                         | NOTIFY_EMAIL 收到 lead 邮件 + 买家邮箱收到 order 邮件 + 不进垃圾箱      |
| **PayPal sandbox**   | 用 PayPal sandbox 买家账号下单 → 完成支付 → 触发 webhook                                                                               | 订单状态从 `pending_payment` 自动转 `paid`；audit log 有 `order.paid`   |
| **CSP nonce**        | 浏览器 DevTools → Console + Network → 看响应头                                                                                         | `Content-Security-Policy` 含 `nonce-XYZ`；Console 无 CSP violation 报错 |
| **Admin 2FA 全流程** | 登录 → /admin/security 启用 2FA → 扫 QR → 输入 6 位码 → 下载 backup codes → 退出 → 重新登录 → 输 TOTP                                  | 全部成功；新设备邮件告警送达                                            |
| **GDPR 数据导出**    | 用真实邮箱发起 `/api/account/data-request` (export) → 收 OTP → verify → 拿到 JSON                                                      | 返回的 JSON 含该邮箱的所有 lead/order/device 明文                       |
| **GDPR 软删 + 取消** | 同流程发 delete → 收 OTP → verify → cancel-deletion → 再 delete → 跑一次 anomaly tick 把日期推到过去 → 跑硬删 worker                   | 软删期间记录还在；cancel 后 `scheduledDeleteAt` 被清；硬删后 row 消失   |
| **Webhook 重放保护** | 复制一条 sandbox webhook，重放                                                                                                         | 第二次返回 200 但 audit log 无新事件；mongo `webhookevents` 只有一条    |
| **幂等性**           | 用 `Idempotency-Key: test-1` 调用 capture 两次                                                                                         | 第二次返回首次结果；Order 只 capture 一次                               |
| **Account Lockout**  | 5 次错误密码 → 第 6 次正确密码                                                                                                         | 第 6 次返回 423；15 分钟后自动解锁                                      |

**完成判定（整组）**：以上 10 条全部✅，截图保存到 `docs/staging-smoke-screenshots/`。

### D. Lighthouse baseline（半天 + 数小时优化）

| 项             | 命令                                                                                  | 目标 |
| -------------- | ------------------------------------------------------------------------------------- | ---- |
| Performance    | `pnpm --filter frontend exec lhci autorun --collect.url=https://staging.zcritical.co` | ≥ 90 |
| Accessibility  | 同上                                                                                  | ≥ 95 |
| Best Practices | 同上                                                                                  | ≥ 95 |
| SEO            | 同上                                                                                  | ≥ 95 |

**预期会失败的项 + 修复手段**：

- LCP 超 2.5s → Hero 视频压缩（HandBrake H.264 ≤ 3MB）/ 降级到静态图
- TBT 高 → PayPal SDK 改成点击 "Continue" 时再注入
- 字体 layout shift → `next/font` 已就位，需在 production 真实测一次

### E. 静态资源（1-2 周，可与上面并行）

> 详见 [`docs/DEFERRED.md` §1.1](./DEFERRED.md)。最低集合：

- [ ] `public/videos/hero-bg.mp4` 或者下线 video 元素
- [ ] 6 个产品/Hero 大图
- [ ] PWA 图标（已用 next/og 自动生成 PNG，但 maskable 还需手工）
- [ ] PDF 说明书（`/[locale]/download` 引用）

---

## P1 — 上线后第一周内必做（不阻塞 launch）

| 项                                                       | 影响                              | 估时      |
| -------------------------------------------------------- | --------------------------------- | --------- |
| 上线后 30 天的 Sentry 告警 review + 调阈值               | 异常监控误报率                    | 持续      |
| Cloudflare WAF 拦截统计 review                           | 看是否有真实攻击模式              | 1 小时/周 |
| `X-Robots-Tag: noindex` HTTP header on `/admin/*`        | 双保险，避免 admin 被搜索引擎收录 | 0.5 天    |
| audit log TTL 索引（90 天热）+ 月度导出到 R2（1 年冷存） | 合规保留 + 性能                   | 1 天      |
| Light 主题视觉适配（DEFERRED §2.2）                      | 用户体验                          | 1 周      |
| 邮件模板的 List-Unsubscribe header + DKIM 实测           | 送达率                            | 0.5 天    |

---

## P2 — 业务规模驱动（按需启动，不在 launch 范围）

详见 DEFERRED Tier 3 / Tier 4。本节只列触发条件，不列细节：

- 100 单/天 后：物流商 API、Redis + BullMQ
- 10k DAU 后：PostHog 分析、A/B test
- 团队 > 3 人后：Storybook、OpenAPI 自动生成
- 上线 3 个月后：bug bounty 政策、邀请独立渗透测试

---

## P3 — 持续技术债（任何时候都可以做，不上线）

详见 DEFERRED Tier 4。不列。

---

## 决策记录（避免反复)

- **不做 SameSite=Strict** — 跨 site 部署不可行，已 ADR-0002 记录
- **不上 Redis** — Express + setInterval 在单实例 Render 完全够用，等需要横向扩展再说
- **不拆后端微服务** — 单体性能足够，过早拆分是 anti-pattern
- **不做 GraphQL** — REST + OpenAPI + Zod 已经足够
- **不接 AI 客服** — 现阶段 Socket.io 实时人工客服已闭环，AI 是优化不是必需

---

## 当前进度（请定期更新）

| 阶段                       | 状态                                        |
| -------------------------- | ------------------------------------------- |
| Phase 0 安全加固 Batch 1-3 | ✅ 已完成（feat/sec-phase0-batch123 待 PR） |
| P0.A 凭证                  | 🟡 等用户去外部账号开通                     |
| P0.B DNS / 域名            | 🟡 域名已注册，DNS 待切                     |
| P0.C Staging 验证          | ⬜ 未开始                                   |
| P0.D Lighthouse            | ⬜ 未开始                                   |
| P0.E 静态资源              | 🟡 部分有 SVG 占位，视频/PDF 待补           |
| P1 上线后第一周            | 上线后再启动                                |

---

## 触发"立即冻结上线"的红线

任何一项命中就停下：

- 🔴 P0.A 任一凭证缺失或弱
- 🔴 P0.C 中的 PII 加密迁移失败
- 🔴 P0.C 中的 PayPal capture 金额不匹配
- 🔴 P0.C 中的 webhook 重放成功（理论上不应该）
- 🔴 Sentry 在 staging 24h 内有 P0/P1 错误未修
- 🔴 Lighthouse Performance < 70（可用但用户体验差）
