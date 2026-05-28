# Audit Log 保留策略

> 持有人：W4
> 当前状态：**90 天热保留 in MongoDB**（设计已敲定，cron sweeper 实现作为 Phase 0 PR 合并后的后续 PR）
> 冷存档（R2）作为 Phase 1 计划

---

## 为什么需要保留策略

`AuditLogModel` 记录每一次有意义的状态变化：

- `auth.login` / `auth.login.lock` / `auth.login.locked` / `auth.2fa.fail` / `auth.2fa.success`
- `auth.password.change` / `auth.2fa.setup` / `auth.2fa.enable` / `auth.2fa.disable`
- `auth.new_device`
- `lead.create` / `lead.update`
- `order.create` / `order.paid` / `order.ship` / `order.refund` / `order.refund.webhook`
- `device.activate`
- `gdpr.request` / `gdpr.verify.fail` / `gdpr.export` / `gdpr.delete.schedule` / `gdpr.delete.cancel`
- `anomaly.<kpi>`

按 1k DAU + 平均 5 audit / day 估算 → 5k 行/天 → ~1.8M 行/年。MongoDB 单 collection 撑得住，但：

1. **查询变慢**：查"过去 24h 谁登录失败" 时如果有 5 年的旧数据混在一起，索引扫描压力线性增长
2. **备份膨胀**：Atlas 自动备份按 cluster 大小计费
3. **GDPR / CCPA 合规**：审计日志含 IP / userAgent / 部分 ID — 个人数据，不能无限期保留
4. **法规上限**：大多数司法辖区要求"为业务必要保留时长" — 商业登录失败记录通常 ≤ 1 年合理

---

## 设计

### 三层存储

```
   ┌─────────────────────────────────────────────────────────┐
   │ 0~90 天      Hot   in MongoDB        立即查询           │
   ├─────────────────────────────────────────────────────────┤
   │ 90~365 天    Warm  Cloudflare R2     gzip JSON 月度归档 │
   ├─────────────────────────────────────────────────────────┤
   │ > 365 天     Delete                                     │
   └─────────────────────────────────────────────────────────┘
```

### 数据流

```
       新行
          ↓
  AuditLogModel.create
          ↓
  Hot collection (MongoDB)
          ↓ (每月 1 号凌晨 UTC 03:00 cron)
  Cold archive worker:
    1. 拉取 createdAt < (now - 90d) 的所有行
    2. 按月分桶 → JSON Lines 格式 → gzip
    3. 上传 R2: critical-audit/<year>-<month>.jsonl.gz
    4. 验证 R2 写入成功 (HEAD object)
    5. MongoDB.deleteMany({_id: {$in: archived._ids}})
          ↓
  Cold archive (R2)
          ↓ (季度 1 次 cron)
  Cold archive purge worker:
    1. 列出 R2 critical-audit/ 内所有 object
    2. 删除 createdAt > 365 天的
```

### 为什么要分两步（archive + purge）

- **archive 失败不丢数据**：worker 在 R2 写入成功之后才从 MongoDB 删
- **purge 单独跑**：万一审计调查需要回溯 2-3 年内的，给 ops 一个紧急"暂停 purge"的开关
- **R2 自身有版本 / 不可变锁定**：上传 archive 时设置 `Object Lock` 模式，防止内部人员篡改归档

### Idempotency

- archive worker 跑两次：R2 object 已存在 → 验证 hash 一致 → 跳过 → 删 MongoDB
- 不存在 → 上传 + 删

→ 总是安全的，可以从 cron 失败 / 部分成功状态恢复。

---

## 实施计划

### Phase 0 收尾（短期）

**仅 hot retention sweeper**（不接 R2）：

```ts
// backend/src/services/anomaly.service.ts —— 已有的 5 分钟 cron 顺手扫
async function pruneAuditLog(): Promise<void> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const r = await AuditLogModel.deleteMany({ createdAt: { $lt: cutoff } })
  if (r.deletedCount > 0) {
    logger.info({ deleted: r.deletedCount, cutoff }, 'Audit log retention sweep')
  }
}
```

> ⚠️ **注意**：上面这段代码作为后续 PR 落地，现在还**没有**进 main。开 R2 archive 之前必须先把 cutoff 设成 1 year，避免 90 天 → 直接 hard delete。

### Phase 1（中期）

把 cutoff 改 90d，引入：

- 新模型 `ArchiveJob`（跑过的月份记录 + 校验 hash）
- 新 service `services/audit-archive.service.ts`
- node-cron 或 BullMQ 调度器（取决于届时是否引入 Redis）
- 新环境变量 `R2_AUDIT_BUCKET`、`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`
- 新 admin API `GET /api/admin/audit/archive?month=2026-08` 给运营查归档（按需 download R2 object）

### Phase 2（长期）

- 把 audit log 写入路径改为 append-only ledger（用 hash chain，每行 store `prevHash`）
- 上 SIEM 工具（Elastic / Datadog / Loki）做实时查询
- ML / 异常检测从静态阈值升级到时序模型

---

## 合规对照

| 要求                                    | 我们的方案                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GDPR Art. 5 (1)(e) — 存储不超过必要时长 | 总保留 365 天 + R2 上自动 lifecycle 删除                                                                                                                                |
| GDPR Art. 17 — 删除权                   | 用户走 `/api/account/data-request kind=delete`，删除其本人 lead/order/device。审计日志的 actor 字段含 username 不含 PII，**不删除审计记录**（合法利益例外，Recital 65） |
| CCPA §1798.100 (a)(2) — 数据保留通知    | Privacy Policy 须列出"审计日志保留 1 年"条款（待补）                                                                                                                    |
| PCI-DSS 10.5.5 — 日志完整性             | hash chain（Phase 2）                                                                                                                                                   |
| 中国 PIPL §47 — 个人信息存储期限        | 同 GDPR：1 年                                                                                                                                                           |

---

## 风险 / 决策记录

- **不立即上 R2**：避免引入新 KMS / 新 secret / 新依赖在 Phase 0 收尾阶段；先确保 hot retention 工作再扩展冷存
- **不写"用户可下载自己的审计记录"**：审计日志是面向 admin / 监管的内部数据，用户已经能通过 `/api/account/data-request` 拿到他**自己产生**的 lead / order / device 数据
- **不保留超过 1 年**：除非未来法律要求扩展（届时需要重开 ADR）

---

## 相关

- `docs/SECURITY-AUDIT.md` §5.2
- `docs/runbooks/SECURITY-INCIDENT.md` — 应急响应中"先存证再止损"依赖审计日志
- AWS S3 Object Lock 文档（R2 兼容 API）：https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
