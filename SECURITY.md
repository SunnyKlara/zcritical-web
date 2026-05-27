# Security Policy

## Supported Versions

| Version       | Supported |
| ------------- | --------- |
| main (latest) | ✅        |

只有当前 `main` 分支接收安全更新。

## Reporting a Vulnerability

如果您发现安全漏洞，**请勿在公开 issue 中报告**。

请通过以下任一渠道私下联系我们：

- **邮件**：security@zcritical.co（推荐，PGP 公钥见下方）
- **GitHub Security Advisory**：https://github.com/SunnyKlara/Zcritical/security/advisories/new

### 报告应包含

- 漏洞类型（XSS / SSRF / RCE / IDOR / Auth Bypass / 等）
- 受影响的组件和版本
- 复现步骤（含 PoC，如适用）
- 潜在影响评估
- 建议修复方案（可选）

### 响应承诺

| 严重程度 | 首次响应  | 修复时间目标    |
| -------- | --------- | --------------- |
| Critical | 24 小时内 | 7 天            |
| High     | 48 小时内 | 14 天           |
| Medium   | 7 天内    | 30 天           |
| Low      | 14 天内   | 下个 minor 版本 |

修复发布后，我们会：

1. 在 CHANGELOG.md 记录漏洞描述（已脱敏）
2. 发布 GitHub Security Advisory（可选 CVE）
3. 致谢报告者（除非您要求匿名）

## Security Best Practices for Operators

如果您部署 Critical 用于生产环境：

### 必做

- [ ] 修改默认 admin 密码（`ADMIN_PASSWORD` 环境变量）
- [ ] 使用 `openssl rand -hex 32` 生成 JWT secrets，长度 ≥ 32 字节
- [ ] 启用 HTTPS（Cloudflare / Vercel / Render 默认提供）
- [ ] MongoDB Atlas Network Access 收紧到 Render IP，不要 `0.0.0.0/0`
- [ ] 配置 Sentry 错误监控
- [ ] 启用 GitHub Actions CI 强制 `pnpm audit --audit-level=critical`
- [ ] 定期 `pnpm update` 应用安全补丁

### 推荐

- [ ] 启用 Cloudflare WAF + Rate Limit
- [ ] 配置 UptimeRobot 监控 `/api/health`
- [ ] 定期备份 MongoDB（M2+ 自动备份）
- [ ] 使用密码管理器存储所有 secrets，绝不硬编码
- [ ] 审查 `audit_logs` 集合，发现异常登录及时禁用账户

### 已知限制

V1 版本的安全简化：

- 后台仅 1 个 admin 角色（多角色 RBAC 在 V2）
- 未做 IP 白名单 / 地理限制（依赖速率限制）
- 邮件通过 SMTP 明文传输（建议用 TLS 端口 465 或 STARTTLS）

## Security Architecture

### 认证与会话

- JWT 双 token：access (15min) + refresh (7d httpOnly cookie)
- Refresh token 自动轮换，旧 token 不可重用
- bcrypt cost factor 12 用于密码哈希
- CSRF 双提交 cookie 防护

### 输入验证

- 所有 API 输入用 Zod schema 严格校验
- NoSQL 注入防护：MongoDB 查询参数白名单
- HTML 转义：邮件模板手动转义
- Rate limit：登录 5/min、表单 3/min、全局 300/min

### 数据保护

- 敏感字段（password / token / cookie）从日志中 redact
- 支付信息由 PayPal 处理，我方零卡号接触（PCI SAQ-A）
- 数据库连接使用 TLS（Atlas 默认）

### 监控与审计

- 所有管理员操作写入 `audit_logs` 集合
- Sentry 实时错误告警
- Pino 结构化日志，每个请求有 X-Request-Id 追踪

## Disclosure Policy

我们采用 **协调披露（Coordinated Disclosure）**：

- 报告者与我们共同确认漏洞和修复
- 修复发布前不公开漏洞细节
- 修复后 30 天内公开披露（Critical 漏洞可能更早）

## PGP Public Key

```
TODO: 添加 PGP 公钥
```

---

**Thank you for helping keep Critical and our users safe.**
