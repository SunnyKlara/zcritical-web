# API 参考

> Critical 后端 API 文档。所有 API 以 `/api` 为前缀，运行在 `http://localhost:4000`（开发）或 `https://api.zcritical.co`（生产）。
>
> 本文档随 backend 实现进度更新。当前状态：M2（询盘转化）。

## 通用约定

### 认证

- **Public 端点** — 无需认证
- **Admin 端点** — 需要 `Authorization: Bearer <accessToken>` header
- **CSRF 端点** — 需要 `X-CSRF-Token` header（值取自 `mojing_csrf` cookie）

### 速率限制

- 全局 fallback：300 req/分钟/IP（所有 `/api/*`）
- 关键路由会有更严格限制（见各端点说明）

### 错误响应

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

HTTP 状态码：

- `400` — 请求格式/校验错误
- `401` — 未认证
- `403` — 已认证但无权限 / CSRF 失败
- `404` — 资源不存在
- `429` — 速率限制
- `500` — 服务器错误

---

## Health（健康检查）

### `GET /api/health`

**Public** · 存活探针。

```bash
curl https://api.zcritical.co/api/health
```

```json
{ "status": "ok", "uptime": 12345.67 }
```

### `GET /api/ready`

**Public** · 就绪探针（含 MongoDB ping）。

```json
{
  "status": "ready",
  "checks": { "mongoConnected": true, "mongoPing": true },
  "uptime": 12345.67
}
```

---

## Leads（询盘）— M2

### `POST /api/leads`

**Public** · 提交询盘表单。

**速率限制**：3 req/分钟/IP

```bash
curl -X POST https://api.zcritical.co/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com",
    "company": "某某公司",
    "phone": "+86 13800000000",
    "message": "有兴趣了解 Critical 的批发价格",
    "source": "website",
    "locale": "zh"
  }'
```

**字段约束**（参考 `shared/src/schemas/lead.schema.ts`）：

- `name` — 必填，1-100 字符
- `email` — 必填，合法邮箱
- `message` — 必填，1-2000 字符
- `company` / `phone` — 可选
- `source` / `locale` — 可选

**蜜罐**：`website` 字段被填则后端静默返回 202（不写库）。

**响应** `201`：

```json
{ "ok": true, "id": "65a..." }
```

**响应** `400` — 校验失败：

```json
{ "error": "Validation failed", "details": { ... } }
```

### `GET /api/leads` — Admin

列出询盘（管理员）。

**Query**：

- `status` — 过滤状态（`new` | `contacted` | `qualified` | `won` | `lost`）
- `limit` — 默认 100，最大 500

### `PATCH /api/leads/:id` — Admin

更新询盘状态/备注。

```json
{ "status": "contacted", "notes": "已电话联系" }
```

---

## Auth（认证）— M3 ✅ 已实现

### `POST /api/auth/login`

**Public** · 管理员登录。速率限制 5 req/分钟/IP。

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"admin","password":"change_me_strong_password"}'
```

**响应** `200`：

```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "username": "admin",
    "email": "admin@zcritical.co",
    "role": "admin",
    "displayName": "Administrator",
    "disabled": false
  }
}
```

Refresh token 通过 `critical_rt` httpOnly cookie 设置（路径 `/api/auth`）。

### `POST /api/auth/refresh`

依赖 `critical_rt` cookie，返回新的 access token + 轮换 refresh token。

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt -c cookies.txt \
  -H "X-CSRF-Token: $(grep critical_csrf cookies.txt | awk '{print $7}')"
```

### `POST /api/auth/logout`

清除 refresh cookie。

### `GET /api/auth/me`

**Admin** · 返回当前管理员信息。

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

---

## CSRF 双提交 Cookie

后端在每个响应自动设置 `critical_csrf` cookie（非 httpOnly，前端 JS 可读）。

所有状态变更请求（POST/PUT/PATCH/DELETE）必须带 `X-CSRF-Token` header，值与 cookie 一致。

**前端 `lib/api.ts` 已自动处理** — 不需要手动管理。

**豁免端点**（不需要 CSRF token）：

- `POST /api/leads` — 公开询盘
- `POST /api/auth/login` — 登录入口

**Bearer 认证请求自动豁免**（除 `/api/auth/refresh`，因其依赖 cookie）。

---

## Products / Orders / Payments — M4

详见 `docs/COMMERCE-SPEC.md`（M4 实施时撰写）。

---

## Devices / Firmware — M5/M6

详见 `docs/HARDWARE-SPEC.md`（M5/M6 实施时撰写）。
