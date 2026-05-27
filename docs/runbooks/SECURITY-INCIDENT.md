# 安全事件应急响应 Runbook

> 生效日期：2026-05-27
> 持有人：W4 / 主控
> 复盘节奏：每季度演练一次（tabletop），每次真实事件后 14 天内出 post-mortem。

这份手册的目标是在任何严重安全事件发生时，让值班工程师能在 15 分钟内做出正确的第一动作，而不是停下来想"接下来该做什么"。

---

## 0. 事件分级

| 等级   | 触发条件                                   | 首次响应 | 通报范围           |
| ------ | ------------------------------------------ | -------- | ------------------ |
| **P0** | 数据泄露发生中 / 资金正在流失 / 服务被勒索 | < 15 min | 全员 + 法务 + 客户 |
| **P1** | 高危漏洞确认被利用 / 管理员账号被夺        | < 1 h    | 全员 + 受影响客户  |
| **P2** | 中危漏洞 / 异常登录潮 / WAF 拦截激增       | < 24 h   | 工程团队           |
| **P3** | 低危改进项 / 单点告警                      | 1 周     | 工单跟踪           |

把握不准就升级。**宁可错升级一级，不可错降一级。**

---

## 1. 0~15 分钟：止损 + 取证

按顺序执行。

### 1.1 触发渠道

| 来源                                | 处理方式                                            |
| ----------------------------------- | --------------------------------------------------- |
| Sentry P0 告警 / 5xx 突增           | 直接进入此 runbook                                  |
| 客户邮件举报数据泄露 / 看到他人信息 | 不要回复"我们在查"。直接进入此 runbook 后再统一回复 |
| Cloudflare WAF 大量阻断             | 评估是否真实攻击；伪阳性进 P3 工单                  |
| Bug bounty / security@zcritical.co  | 24h 内第一封确认邮件，事件本身按危害等级分          |

### 1.2 先做证据，再做止损

先把关键日志快照存住。这一步永远不要省，**任何后续操作都可能擦除证据**。

```bash
# 1. Backend 日志（Render → Logs Explorer），导出过去 24h
#    Logs → Export → JSON 文件，存 / 加密存档（不要进 git）

# 2. 数据库快照
#    Atlas Console → Cluster → Backup → "Take Snapshot Now"
#    标注：incident-YYYY-MM-DD-HHMM

# 3. Sentry 事件导出
#    Sentry → Issues → Export → CSV，包含完整 stacktrace + breadcrumbs

# 4. 受影响审计日志
db.auditlogs.find({
  createdAt: { $gte: ISODate("YYYY-MM-DDTHH:MM:00Z") }
}).toArray()
# 导出为 JSON 存证
```

### 1.3 止损动作（按事件类型选）

#### A. 管理员账号被夺

```bash
# 1. 立即在 mongo shell 禁用所有 admin 账号（除值班自己）
db.users.updateMany(
  { role: 'admin', _id: { $ne: ObjectId("<your-id>") } },
  { $set: { disabled: true } }
)

# 2. 让所有 refresh token 失效（bump tokenVersion）
db.users.updateMany({}, { $inc: { tokenVersion: 1 } })

# 3. 撤销 Render Web Console 任何 active session
# Render → Settings → Members → 拉黑可疑成员，重置 OAuth

# 4. 强制全部 admin 重置密码 + 重新绑定 2FA
```

#### B. 资金流失（PayPal capture 异常 / 大量退款）

```bash
# 1. 把 PayPal app 设为 sandbox（即时）
#    PayPal Developer Console → My Apps → 切换到 sandbox secret
#    或在 backend env 里：PAYPAL_MODE=sandbox 然后 redeploy

# 2. 在 Cloudflare 暂时拒绝 /api/orders 流量
#    Cloudflare → WAF → Custom Rules → 加 "block /api/orders"

# 3. 找出最近 1 小时所有 paid 订单，列表给 PayPal
db.orders.find({
  status: 'paid',
  'payment.paidAt': { $gte: ISODate("YYYY-MM-DDTHH:MM:00Z") }
}, { orderNo: 1, total: 1, email: 1, 'payment.paypalCaptureId': 1 })

# 4. 给 PayPal 申请 emergency dispute / hold
#    PayPal Resolution Center → Open Case → "Investigate fraud"
```

#### C. 数据库泄露怀疑

```bash
# 1. 立即轮转 ENCRYPTION_KEY？不要！
#    旧 key 还需要解读已加密的 PII。新 key 启用前必须先做"双 key 解读期"。
#    短期：先让 Atlas IP allowlist 收紧到只允许 Render 出口

# 2. 重置 MongoDB user 凭证
#    Atlas → Database Access → 删除当前 user，新建一个，更新 Render env

# 3. 强制全部 admin 改密 + 重新启用 2FA（流程同 A）

# 4. 排查访问来源
db.auditlogs.aggregate([
  { $match: { createdAt: { $gte: ISODate("...") } } },
  { $group: { _id: '$ip', count: { $sum: 1 }, actions: { $addToSet: '$action' } } },
  { $sort: { count: -1 } }
])
```

#### D. WAF 持续 high-rate 攻击

```bash
# 1. Cloudflare → Security Level → "Under Attack"（开启 5s challenge）

# 2. 定位攻击特征
# Cloudflare → Analytics → Security → Top blocked IPs / countries / paths

# 3. 添加临时 WAF rule（按 ASN / country / pattern）
# 4. 评估是否需要扩容 Render（如果 5xx 是负载导致）
```

---

## 2. 15~60 分钟：评估影响范围

### 2.1 关键问题清单

按顺序回答，写在事件 Doc 里。

1. 攻击什么时候开始？最早的可疑事件时间戳？
2. 影响多少用户/订单/记录？给出精确数字（`db.x.countDocuments({...})`）
3. 哪些数据被读 / 改 / 删？
4. 攻击者是否还有持续访问？（refresh token / API key / mongo session）
5. 数据已经泄露到外部？还是仍在我们的边界内？

### 2.2 受影响数据的"血缘"追溯

```
用户层 → 影响什么？
  PII（email/phone/address）→ GDPR 通报必要 ✅
  支付凭证 → PayPal 我们不存，PCI 责任在 PayPal
  密码 → bcrypt cost 12 + 加盐，单条泄露 ≠ 立即被破
  TOTP secret → AES-256-GCM 加密存储，旧 key 不泄露则无忧
  Refresh token → bump tokenVersion 即可完全失效
  审计日志 → IP / userAgent，敏感度中等
```

### 2.3 是否需要监管通报

| 法律框架        | 触发条件                          | 时限                              |
| --------------- | --------------------------------- | --------------------------------- |
| GDPR (欧盟用户) | 个人数据泄露                      | 72 小时通报数据保护监管机构 (DPA) |
| CCPA (加州)     | "高风险" 漏洞                     | "最短可行时间内"                  |
| 中国 PIPL       | 未来如果 zcritical.cn 启用 → 适用 | 立即向网信办报告 + 通知用户       |

不确定就咨询法务。**默认按 GDPR 走流程**。

---

## 3. 60 分钟~24 小时：根因 + 修复

### 3.1 根因分析（5 Whys）

例：为什么 admin 账号被夺？

1. 因为攻击者拿到了密码 → 怎么拿到的？
2. 因为运营人员在 phishing 邮件输入了凭证 → 为什么没被 2FA 挡住？
3. 因为该账号没启用 2FA → 为什么强制 2FA 没生效？
4. 因为只在 frontend UI 提示，未在 backend 强制 → ...
5. 因为 W4 安全加固只做了"可启用"未做"必须启用" → 修：在 admin login 处强制 enroll

### 3.2 修复 + 验证

- 写最小可复现 case（PoC）→ 加进测试套件，永远不再回归
- 修代码 → PR → 走 CI 全部通过 → review → 合 main → 部署
- 在 Sentry 设置 Alert，相同特征 24h 内再现立即 P0

---

## 4. 24~72 小时：通报 + 复盘

### 4.1 用户通报模板（按事件改写）

```
主题：[Critical] 关于您账户的安全通知 / Security notice for your account

亲爱的客户，

我们于 [日期] 检测到一次涉及 [描述影响范围] 的安全事件。

发生了什么：
- [简明事实，不臆测]

我们已经做了什么：
- [止损动作清单]

我们建议您做：
- [改密 / 启用 2FA / 监控信用卡 / etc.]

如有疑问请回复本邮件或联系 security@zcritical.co。

— Critical 安全团队
```

写完后让法务过一遍再发。**不要承认尚未确认的事实**。

### 4.2 内部 post-mortem

模板见 [`docs/runbooks/POSTMORTEM-TEMPLATE.md`](./POSTMORTEM-TEMPLATE.md)（待写）。
关键栏目：

- 时间线（攻击开始 / 我们发现 / 止损完成 / 全部修复 / 通报）
- 影响范围
- 根因
- 处置过程的"做对了 vs 没做对"
- Action items（按 SMART 原则，每条有负责人 + ddl）

最后：把这次事件总结进 `SECURITY-AUDIT.md`，作为新的 case study。

---

## 5. 演练（Tabletop Exercise）

每季度选一个场景：

| 季度 | 场景                                  |
| ---- | ------------------------------------- |
| Q1   | Admin 账号被钓鱼夺取，48h 后被发现    |
| Q2   | MongoDB Atlas 配置错误暴露在公网 6h   |
| Q3   | PayPal Webhook 被伪造，注入假退款     |
| Q4   | DDoS 攻击致 24h 间断性宕机 + 勒索邮件 |

参与人在群里走完整 runbook，让没做过的人能接住。

---

## 6. 联系人速查

| 角色          | 联系方式                         |
| ------------- | -------------------------------- |
| 主控 / W1     | (填入)                           |
| 安全 / W4     | (填入)                           |
| 后端 / W3     | (填入)                           |
| 法务          | (填入 + DPA 通报邮箱)            |
| Render Status | https://status.render.com        |
| Atlas Status  | https://status.mongodb.com       |
| Cloudflare    | https://www.cloudflarestatus.com |
| PayPal Disp   | https://www.paypal.com/disputes  |

---

## 7. 重要 don'ts

- ❌ 不要在事件中第一时间删数据/日志/容器（会摧毁取证）
- ❌ 不要在公开渠道（Twitter / 论坛）抢跑发声明
- ❌ 不要回复 "我们正在调查" 给客户后失踪 24h，每 4-8h 同步进度
- ❌ 不要把 ENCRYPTION_KEY / JWT secret 通过 Slack / 邮件传递（用 1Password 临时分享）
- ❌ 不要在补丁还没合 main 前就部署到 prod

---

> "Plans are useless, but planning is indispensable."
> — Eisenhower
