# 跨工作流契约（Interfaces）

> 这是各工作流之间的"边界协议"。改这里需要走 RFC。
> 改 `shared/` 里的 schema 必须先在这里有共识。

---

## 1. 设计哲学

### 单一真相源（Single Source of Truth）

```
        shared/src/schemas/
              ↓
       Zod schema
        ↙       ↘
   Frontend    Backend
   z.infer     z.parse
        ↓        ↓
    类型安全  运行时校验
```

任何 API 形状的变更，**先改 shared**，再分别在前后端使用。

### 不变量（Invariants）

这些规则**永远不变**，违反必须升级到 RFC：

1. **金额永远是 cents（整数）** — 不允许浮点
2. **时间永远是 ISO 8601 string 在 wire 上**，Date 对象只在内存
3. **email 永远在 schema 里 .toLowerCase().trim()**
4. **i18n 字段永远是 `{ zh: string; en: string }`**
5. **错误响应永远是 `{ error: string, code: string, requestId: string }`**
6. **分页永远用 `{ page: number, limit: number, total: number, items: T[] }`**

---

## 2. 共享 Schema 索引

完整定义在 `shared/src/schemas/`。变更必须 RFC。

### 2.1 Lead（询盘）

- 文件：`shared/src/schemas/lead.schema.ts`
- 端点：
  - `POST /api/leads` 公开（rate limited）
  - `GET /api/admin/leads` Admin
  - `PATCH /api/admin/leads/:id` Admin

### 2.2 Auth（认证）

- 文件：`shared/src/schemas/auth.schema.ts`
- 端点：
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/2fa/setup`（W4 待加）
  - `POST /api/auth/2fa/verify`（W4 待加）

### 2.3 Order（订单）

- 文件：`shared/src/schemas/order.schema.ts`
- 端点：
  - `POST /api/orders/create`
  - `POST /api/orders/capture`
  - `GET /api/orders/lookup`
  - `GET /api/admin/orders`
  - `PATCH /api/admin/orders/:id/ship`
  - `POST /api/admin/orders/:id/refund`

### 2.4 Product（商品）

- 文件：`shared/src/schemas/product.schema.ts`
- 端点：
  - `GET /api/products`
  - `GET /api/products/:slug`
  - `POST /api/admin/products`（待加）
  - `PATCH /api/admin/products/:id`（待加）

### 2.5 Firmware（固件）

- 文件：`shared/src/schemas/firmware.schema.ts`
- 端点：
  - `GET /api/firmware/check?serial=&current=`
  - `GET /api/firmware/list`
  - `POST /api/admin/firmware/upload`
  - `PATCH /api/admin/firmware/:id/publish`

### 2.6 Device（设备）

- 文件：`shared/src/schemas/device.schema.ts`
- 端点：
  - `POST /api/devices/activate`
  - `POST /api/devices/heartbeat`
  - `GET /api/devices/lookup`

### 2.7 Chat / Session

- 文件：`shared/src/schemas/session.schema.ts` + `message.schema.ts`
- 端点：
  - `POST /api/chat/session`
  - `GET /api/chat/history`
  - Socket.io: 见下文

### 2.8 Common（通用）

- 文件：`shared/src/schemas/common.schema.ts`
- 包括：`PaginationSchema`、`ErrorResponseSchema`、`I18nStringSchema`、`MoneyCentsSchema`

---

## 3. Socket.io 事件契约

文件：`shared/src/events.ts`

### 访客 → 服务端

| 事件                | Payload                 | 谁发            |
| ------------------- | ----------------------- | --------------- |
| `visitor:join`      | `{ sessionToken }`      | 访客 ChatWidget |
| `visitor:message`   | `{ content }`           | 访客发消息      |
| `visitor:typing`    | `{ isTyping: boolean }` | 访客打字状态    |
| `visitor:heartbeat` | `{}`                    | 每 30s          |

### 管理端 → 服务端

| 事件           | Payload                          | 谁发          |
| -------------- | -------------------------------- | ------------- |
| `admin:join`   | （JWT 由 connection 中间件验证） | Admin chat 页 |
| `admin:reply`  | `{ sessionId, content }`         | 客服回复      |
| `admin:typing` | `{ sessionId, isTyping }`        | 客服打字      |
| `admin:close`  | `{ sessionId }`                  | 关闭会话      |

### 服务端 → 客户端

| 事件             | Payload                                              | 谁收           |
| ---------------- | ---------------------------------------------------- | -------------- |
| `message:new`    | `{ sessionId, from, content, createdAt, messageId }` | 房间内所有人   |
| `typing:status`  | `{ sessionId, from, isTyping }`                      | 房间内所有人   |
| `session:closed` | `{ sessionId }`                                      | 房间内所有人   |
| `admin:notify`   | `{ sessionId, count }`                               | 仅 admins room |

### 错误事件（统一格式）

```typescript
'error': {
  code: 'AUTH_FAILED' | 'RATE_LIMITED' | 'SESSION_EXPIRED' | ...,
  message: string,
  details?: unknown,
}
```

---

## 4. HTTP 错误响应统一格式

所有 4xx / 5xx 响应必须遵循：

```typescript
{
  error: string,           // 人类可读消息
  code: ErrorCode,         // 机器可读代码（枚举）
  details?: unknown,       // 可选的详细信息（如 Zod 错误 detail）
  requestId: string,       // X-Request-Id（贯穿日志/Sentry）
}
```

### 错误代码枚举

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR' // 400 Zod 校验失败
  | 'UNAUTHORIZED' // 401 未认证
  | 'FORBIDDEN' // 403 权限不足
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409 业务冲突（如库存不足）
  | 'RATE_LIMITED' // 429
  | 'INTERNAL' // 500 服务器异常
  | 'BAD_GATEWAY' // 502 第三方服务异常
  | 'TOKEN_EXPIRED' // JWT access expired
  | 'CSRF_FAILED' // CSRF 校验失败
  | 'OUT_OF_STOCK' // 库存不足
  | 'PAYMENT_FAILED' // 支付失败
  | 'IDEMPOTENCY_REPLAY' // 幂等性键冲突
```

### 客户端处理范式

```typescript
import { ApiError } from '@/lib/api'

try {
  await apiCall()
} catch (e) {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'TOKEN_EXPIRED':
        await refresh()
        retry()
      case 'RATE_LIMITED':
        showToast('请稍后再试')
      case 'OUT_OF_STOCK':
        showOutOfStockUI()
      default:
        showGenericError(e.requestId)
    }
  }
}
```

---

## 5. 认证 Header 契约

### 公开端点

不需要任何 header（除 `Content-Type: application/json`）。

### 受保护端点（Admin / Visitor session）

```
Authorization: Bearer <accessToken>
```

或访客会话：

```
Cookie: critical_session_token=<token>
```

### Mutation 端点（额外要求）

```
X-CSRF-Token: <csrf>
```

（CSRF token 通过 Cookie + Header 双提交）

### 幂等性键（POST 创建/扣减资源）

```
Idempotency-Key: <uuid>
```

24h 内同 key 复用响应。

---

## 6. URL 命名规范

### 路径

- 资源用复数：`/api/leads` not `/api/lead`
- ID 路径参数：`/api/leads/:id`（不是 `/api/lead?id=`）
- 子资源：`/api/orders/:id/refund`
- Admin 路径前缀：`/api/admin/*`（始终 admin token 才能访问）

### 查询参数

- 分页：`?page=1&limit=20`
- 过滤：`?status=paid&from=2026-01-01`
- 排序：`?sort=-createdAt`（前缀 `-` 表示降序）

### 版本化（待 W3 实施）

当前：无版本前缀（视为 v1）
未来：`/api/v1/leads`、`/api/v2/leads`
迁移期：v1 保留 ≥ 6 个月，发 deprecation header

---

## 7. 数据格式约定

### 时间

- Wire format：ISO 8601 string `"2026-05-27T12:34:56.789Z"`
- 内存：`Date` 对象
- 数据库：MongoDB `Date`

### 金额

- Wire format：integer cents（`29900` 表示 $299.00）
- 显示：客户端格式化（`(amount / 100).toFixed(2)`）
- **永远不要** wire 上传 float

### i18n 字段

```typescript
{
  zh: "智能风洞模拟器",
  en: "Smart Wind Tunnel Simulator"
}
```

缺失语言 fallback 到 zh。

### 邮箱

- Wire format：lowercase + trim
- Schema：`z.string().email().toLowerCase().trim()`
- 数据库：lowercase 索引

### 电话

- Wire format：E.164 + 可选格式化（` `、`-`、`()`）
- Schema：宽松接受，业务用时再 normalize
- 验证：保留校验（不要严格拒绝国际格式）

---

## 8. CORS / 安全 Header 契约

后端必须返回：

```
Access-Control-Allow-Origin: https://zcritical.co (or staging URL)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, X-CSRF-Token, Idempotency-Key, Content-Type, X-Request-Id
Access-Control-Expose-Headers: X-Request-Id
```

前端必须发：

```
fetch(url, {
  credentials: 'include',  // 让 cookie 跟着走
  headers: {
    'Authorization': `Bearer ${access}`,
    'X-CSRF-Token': csrf,  // 仅 mutation
    'Idempotency-Key': uuid,  // 仅创建/扣减
  }
})
```

---

## 9. 速率限制契约

服务端在 429 响应里必须包含：

```
Retry-After: <seconds>
X-RateLimit-Limit: <number>
X-RateLimit-Remaining: <number>
X-RateLimit-Reset: <unix-ms>
```

客户端必须尊重 `Retry-After`，禁止瞬时重试。

### 当前限速规则（W3 调整时同步本文档）

| 端点                      | 限制           |
| ------------------------- | -------------- |
| `POST /api/leads`         | 3 / min / IP   |
| `POST /api/auth/login`    | 5 / 5min / IP  |
| `POST /api/orders/create` | 10 / hour / IP |
| `POST /api/chat/session`  | 5 / min / IP   |
| 全局                      | 300 / min / IP |

### 已登录用户额外限制（W4 待加）

按 user_id 限速，在 IP 之上叠加。

---

## 10. 文件上传契约

### 当前未启用，但留好契约

```typescript
POST /api/admin/firmware/upload
Content-Type: multipart/form-data
Authorization: Bearer <admin>

field: file (binary)
field: meta JSON {
  version: "1.0.1",
  channel: "stable",
  releaseNotes: { zh, en },
  hardwareVersions: ["v1.0"],
}

→ 200 {
  binaryUrl: "https://r2.zcritical.co/firmware/...",
  binaryHash: "sha256:...",
  binarySize: 1540000
}
```

最大文件大小：50 MB（Render 默认 100MB 上限）。
存储：直传 Cloudflare R2（presigned URL）。

---

## 11. WebSocket 重连协议

客户端必须实现：

- 指数退避：1s → 2s → 4s → 8s → ... 上限 30s
- 最多重试 10 次后放弃
- 重连成功后必须重新 emit `visitor:join` 或 `admin:join`
- 服务端 session 过期返回 `error: { code: 'SESSION_EXPIRED' }`，前端清理本地 session 后引导用户重新进入

---

## 12. 国际化（i18n）契约

### 翻译键命名

- `Namespace.subKey` 格式
- Namespace 大驼峰（`Hero`、`Checkout`、`AppShowcase`）
- subKey 小驼峰（`titleHighlight`、`ctaPrimary`）
- 不允许超过 3 层嵌套（如 `Foo.Bar.Baz.qux` ❌）

### 翻译键变更

- 加新 key：所有 locale 必须同时加（CI 守门）
- 删 key：先全代码搜引用，再删
- 改 key：等同删旧 + 加新

### 文档化

所有 key 在哪用：见 grep 即可，但**新增大块 namespace 时必须在 PR 里说明**。

---

## 13. 数据库迁移契约

### 当前：Mongoose 自动 schema

- 加字段：直接改 model，可选 `default` 让历史文档兼容
- 删字段：先 deprecated 1 个 release cycle，再 hard delete
- 改字段类型：写迁移脚本 `backend/src/scripts/migrate-{date}-{name}.ts`

### 未来：考虑 migrate-mongo

- 当前 ad-hoc 脚本足够
- 数据量上来后再引入

---

## 14. RFC 流程

任何对本文件的变更，必须走 RFC：

### 模板（PR 描述）

```markdown
# RFC: <标题>

## 现状

（当前是怎么做的）

## 提议

（要怎么改）

## 影响

- W2: ...
- W3: ...
- 其他: ...

## 迁移路径

（怎么从旧到新）

## 替代方案

（其他考虑过的方案）

## 决议

（W1 决定后填写）
```

### 时限

- 标准 RFC：24h 异议期
- 紧急 RFC（标 [URGENT]）：4h 异议期
- 重大 RFC（标 [BREAKING]）：72h 异议期 + 必须召开同步讨论

### 通过后

- 合并 RFC PR（包含本文件更新）
- 创建实施 issues 给各受影响流
- W1 跟踪到完成

---

## 15. 当前已知契约债务

| 债务                                   | 优先级 | 责任流 |
| -------------------------------------- | ------ | ------ |
| API 版本前缀 `/api/v1/*`               | 高     | W3     |
| 错误响应格式标准化（部分路由还不规整） | 高     | W3     |
| OpenAPI 自动生成（手写 spec 易漂移）   | 中     | W3     |
| Socket.io 事件 schema 化（用 Zod）     | 中     | W3     |
| i18n 缺 placeholder 检测（CI 守门）    | 低     | W2     |

---

> "Programs are meant to be read by humans and only incidentally for computers to execute."
> — Donald Knuth
>
> 接口契约更是如此。这个文件就是给人读的。
