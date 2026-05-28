# 上线前安全 Review 自检表

> 用法：每次准备 release 时打印一份逐项打勾。三个角色各自跑一遍：
>
> - **W1 主控**：把控全局 + 决定是否放行
> - **W4 安全**：执行验证
> - **DevOps / 部署人**：环境凭证 + 部署后 smoke
>
> 任何一项未勾选都必须有"风险接受"的明确决定（写进 release notes）。
>
> 本表 derived from `docs/SECURITY-AUDIT.md` Phase 0 验收标准。

---

## 1. 凭证 / 密钥（部署人 + W4）

| 项                                                 | 验证方式                     | 通过判定                                             |
| -------------------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `JWT_ACCESS_SECRET` ≥ 32 字节随机                  | Render env 面板              | 在 1Password 内有备份；未在 git / Slack / 邮件中出现 |
| `JWT_REFRESH_SECRET` ≥ 32 字节随机，与 access 不同 | 同上                         | 同上                                                 |
| `ENCRYPTION_KEY` = 64 hex 字符                     | Render env 面板              | **必须**在 1Password 备份；丢失后无法恢复任何 PII    |
| `PAYPAL_WEBHOOK_ID` 非空                           | Render env 面板              | sandbox webhook 来一发能验签通过                     |
| `ADMIN_PASSWORD` zxcvbn ≥ 3 + ≥ 12 字符            | `seedDefaultAdmin` 启动日志  | prod 启动若密码弱会 fail-fast                        |
| `MONGODB_URI` Atlas IP 白名单只允许 Render 出口    | Atlas Network Access         | 不是 `0.0.0.0/0`                                     |
| SMTP DKIM + SPF + DMARC 配置                       | https://www.mail-tester.com/ | 得分 ≥ 9/10，邮件不进 spam                           |
| Sentry DSN 已配 + 错误能接收                       | Sentry web UI                | 主动触发一次 5xx 看到事件                            |

## 2. 网络层加固（DevOps）

| 项                                                           | 通过判定                                               |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| Cloudflare → "Always Use HTTPS" 开                           | http 请求自动 301                                      |
| Cloudflare → Min TLS 1.2                                     | TLS 1.0/1.1 被拒                                       |
| Cloudflare → HSTS Max-Age ≥ 1y + includeSubdomains + preload | hstspreload.org 验收                                   |
| Cloudflare → Bot Fight Mode 开                               | dashboard 显示                                         |
| Cloudflare → Security Level: Medium 或 High                  | dashboard 显示                                         |
| Cloudflare → Rate Limiting 100 req/10s/IP                    | dashboard 显示                                         |
| CAA 记录限制可签发 CA                                        | `dig CAA zcritical.co` 看到 letsencrypt + cloudflareca |

## 3. 应用层（W4）

| 项                                       | 验证方式                                   | 通过判定                                                                                     |
| ---------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| HTTPS 强制 + Helmet 默认头               | `curl -I https://zcritical.co`             | `Strict-Transport-Security` / `X-Frame-Options DENY` / `X-Content-Type-Options nosniff` 存在 |
| CSP 生产无 `unsafe-inline` 在 script-src | 浏览器 DevTools                            | `Content-Security-Policy: script-src 'self' 'nonce-...' 'strict-dynamic' https:`             |
| `/admin/*` 加 `X-Robots-Tag: noindex`    | `curl -I https://zcritical.co/admin/login` | header 出现                                                                                  |
| CORS 白名单只含 FRONTEND_URL             | OPTIONS preflight from random origin       | 被拒                                                                                         |
| CSRF 双提交 cookie 工作                  | 不带 `X-CSRF-Token` 的 admin POST          | 403                                                                                          |
| Rate limit 全局 / 登录 / 表单            | 暴打 `/api/auth/login`                     | 第 6 次 429，username 维度 5/5min                                                            |
| Account Lockout                          | 5 次错误密码                               | 第 6 次 423 + lockedUntil 字段                                                               |
| Admin 2FA 全流程                         | 后台启用 → 退登 → 重登                     | 强制走 TOTP 阶段                                                                             |
| Backup code 一次性                       | 用一个 backup code 登 → 再用同一个         | 第二次 401                                                                                   |
| PayPal capture 金额 mismatch 拒绝        | 故意改 order.total                         | 拒绝 + audit `error` 事件                                                                    |
| Webhook 重放（手动 curl）                | 同一 transmission-id 二次 POST             | 第二次 200 但无业务副作用                                                                    |
| 幂等性键                                 | `Idempotency-Key: x` 调 capture 两次       | 第二次返回缓存                                                                               |
| PII 数据库无明文                         | mongo console `db.leads.findOne()`         | `email` 是 `v1:...`，`emailHash` 64 hex                                                      |
| GDPR export 完整                         | 完整跑一次 OTP → verify                    | JSON 含全部 lead/order/device 明文                                                           |
| GDPR delete 30 天 grace                  | OTP → verify → 看 `scheduledDeleteAt`      | 设置在 30 天后                                                                               |

## 4. 流水线（W1）

| 项                                   | 通过判定                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| CI 主路径全绿（PR + main）           | typecheck / lint / format:check / test / audit / build / Lighthouse |
| CodeQL 上次扫描 0 high alert         | GitHub Code Scanning 面板                                           |
| Semgrep 上次扫描 0 ERROR             | GitHub Code Scanning 面板                                           |
| Dependabot 无 high / critical 待处理 | repo Security 面板                                                  |
| SBOM 上次生成成功                    | Actions artifact `sbom-<sha>` 存在                                  |

## 5. 监控 / 告警（W4）

| 项                                        | 通过判定                                                |
| ----------------------------------------- | ------------------------------------------------------- |
| Sentry 接收一条 backend test 事件         | event 出现，level=info                                  |
| Sentry 接收一条 frontend test 事件        | event 出现，level=info                                  |
| UptimeRobot ping `/api/health` 5 分钟一次 | dashboard 显示                                          |
| anomaly detector 在跑                     | 启动日志 `Anomaly detector started`                     |
| 备份能恢复                                | 上线前一次 dry-run：`mongorestore --dry-run`（v1 手动） |

## 6. 应急（W4）

| 项                                                       | 通过判定                                      |
| -------------------------------------------------------- | --------------------------------------------- |
| `docs/runbooks/SECURITY-INCIDENT.md` 联系人填好          | 列表内主控 / 安全 / 后端 / 法务有真实联系方式 |
| 1Password 临时分享流程已验过                             | 至少两位团队成员能拿到关键 secret 30 分钟链接 |
| 至少一名团队成员能登 Render / Atlas / Cloudflare console | 不是单点风险                                  |

## 7. 合规（W1）

| 项                                 | 通过判定                 |
| ---------------------------------- | ------------------------ |
| Privacy Policy 含 GDPR + CCPA 条款 | `/[locale]/privacy` 渲染 |
| Cookie consent banner 在欧盟 IP 弹 | VPN 测试                 |
| GDPR 数据导出 + 删除 API 可用      | §3 已验证                |
| 邮件含 List-Unsubscribe header     | 实际收到的订单邮件检查   |

---

## 风险接受签字栏

> 任何一项未通过 + W1 决定接受风险 = 写在这里 + 给出补救日期。

| 项              | 风险等级 | 接受人 | 补救日期       | 备注                  |
| --------------- | -------- | ------ | -------------- | --------------------- |
| ZAP full scan   | Medium   |        | 上线后 14 天内 | 等域名 + staging 就绪 |
| Bug bounty 政策 | Low      |        | 上线后 90 天   | 等真实流量后启动      |

---

> "Security is a process, not a product." — Bruce Schneier
