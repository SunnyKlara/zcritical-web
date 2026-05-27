# Critical 系统架构可视化

> 8 张 Mermaid 图覆盖项目所有关键面。GitHub / VSCode / Mermaid Live Editor 都能直接渲染。

---

## 图 1：系统拓扑全景（Bird's Eye View）

```mermaid
graph TB
  subgraph "Client Layer"
    User[👤 用户浏览器]
    APP[📱 Critical App<br/>Android/iOS]
    Device[🚲 Critical 设备<br/>ESP32-S3]
  end

  subgraph "Edge Layer · Cloudflare"
    CF_DNS[Cloudflare DNS<br/>zcritical.co]
    CF_CDN[Cloudflare CDN<br/>静态资源缓存]
    CF_WAF[Cloudflare WAF<br/>DDoS / Bot 防护]
  end

  subgraph "Application Layer"
    Vercel[🟢 Vercel<br/>Next.js Frontend<br/>SSR + ISG]
    Render[🟣 Render<br/>Express API<br/>+ Socket.io]
  end

  subgraph "Data Layer"
    Atlas[(🍃 MongoDB Atlas<br/>9 collections)]
    R2[(☁️ Cloudflare R2<br/>固件二进制)]
  end

  subgraph "External Services"
    PayPal[💳 PayPal<br/>Orders API v2]
    Resend[📧 Resend<br/>SMTP]
    Sentry[🐛 Sentry<br/>错误追踪]
    PostHog[📊 PostHog<br/>用户分析]
    OpenAI[🤖 OpenAI<br/>AI 客服]
  end

  User -->|HTTPS| CF_DNS
  CF_DNS --> CF_WAF
  CF_WAF --> CF_CDN
  CF_CDN --> Vercel
  Vercel -->|/api/*| Render
  APP -.->|BLE/WiFi| Device
  APP -->|HTTPS| Render
  Device -->|OTA check| Render
  Device -->|Download firmware| R2

  Render --> Atlas
  Render -.->|Webhook| PayPal
  Render -.->|Send| Resend
  Render -.->|Errors| Sentry
  Vercel -.->|Web Vitals| Sentry
  Vercel -.->|Events| PostHog
  Render -.->|FAQ chat| OpenAI

  classDef edge fill:#f96,stroke:#333,stroke-width:2px
  classDef app fill:#9cf,stroke:#333,stroke-width:2px
  classDef data fill:#9f9,stroke:#333,stroke-width:2px
  classDef ext fill:#fc9,stroke:#333,stroke-width:1px
  class CF_DNS,CF_CDN,CF_WAF edge
  class Vercel,Render app
  class Atlas,R2 data
  class PayPal,Resend,Sentry,PostHog,OpenAI ext
```

**关键洞察**：

- 用户请求**永远先走 Cloudflare**（DNS + WAF + CDN）
- Vercel 处理静态/SSR，所有动态业务逻辑都打到 Render
- 设备直连 R2 下载固件（不经过后端，省带宽）
- 所有外部服务都是**异步 fire-and-forget**，不阻塞主流程

---

## 图 2：数据流 - Lead 询盘提交

```mermaid
sequenceDiagram
  autonumber
  participant U as 👤 访客
  participant FE as 🟢 Frontend (Vercel)
  participant BE as 🟣 Backend (Render)
  participant DB as 🍃 MongoDB
  participant ML as 📧 Resend
  participant SE as 🐛 Sentry

  U->>FE: 滚到 Contact Section, 填表单
  FE->>FE: Zod 校验（前端）
  FE->>BE: POST /api/leads<br/>+ honeypot field
  BE->>BE: Rate limit check (3/min/IP)
  BE->>BE: Honeypot check (隐藏字段不为空 → 静默 202)
  BE->>BE: Zod 校验（后端，单一真相源）
  BE->>DB: Lead.create({...})
  DB-->>BE: { _id, ...lead }

  par 邮件通知（不阻塞响应）
    BE->>ML: notifyNewLead(lead)
    ML-->>BE: 250 OK
    Note right of ML: 失败时 log 不影响主流程
  end

  BE-->>FE: 201 { ok: true, id }
  FE->>FE: 显示成功 UI

  alt 任何步骤异常
    BE->>SE: captureException(err)
    BE-->>FE: 4xx/5xx + requestId
    FE-->>U: 错误提示 + 重试 + 联系客服
  end
```

**关键设计**：

- **双重校验**（前端 + 后端，用 shared schema 防漂移）
- **Honeypot** 静默返回 202，让爬虫以为成功了
- **Rate limit** 在后端做，而不是依赖前端 throttle
- **邮件 fire-and-forget**，绝不阻塞用户响应
- **所有异常**都带 requestId 方便客服查日志

---

## 图 3：数据流 - 订单全流程（Critical Path）

```mermaid
sequenceDiagram
  autonumber
  participant U as 👤 用户
  participant FE as Frontend
  participant BE as Backend
  participant DB as MongoDB
  participant PP as 💳 PayPal
  participant ML as 📧 Resend

  rect rgb(240, 248, 255)
    Note over U,ML: 阶段 1：创建订单
    U->>FE: 选择变体 + 填收货地址
    FE->>BE: POST /api/orders/create
    BE->>DB: Product.findOne({slug})
    DB-->>BE: product + variants
    BE->>BE: 校验库存 + 计算运费 + 总价
    BE->>DB: Order.create({status: 'pending_payment'})
    BE->>PP: orders.create({intent:CAPTURE})
    PP-->>BE: { id, links: [{rel:approve}] }
    BE->>DB: Order.update({paypalOrderId})
    BE-->>FE: { orderNo, approveUrl }
    FE->>U: redirect to PayPal
  end

  rect rgb(255, 250, 240)
    Note over U,ML: 阶段 2：用户在 PayPal 完成支付
    U->>PP: 登录 + 确认支付
    PP-->>FE: redirect /checkout/success?token=xxx
  end

  rect rgb(240, 255, 240)
    Note over U,ML: 阶段 3：后端 capture（关键）
    FE->>BE: POST /api/orders/capture { token }
    BE->>BE: 幂等性检查（idempotency-key）
    BE->>PP: orders.capture(token)
    PP-->>BE: { status: COMPLETED, amount }
    BE->>BE: 验证 amount === order.total
    BE->>DB: 原子库存扣减<br/>findOneAndUpdate + $elemMatch + $inc
    alt 库存扣减失败（并发售空）
      BE->>PP: 立即退款（refunds.create）
      BE-->>FE: 409 Out of stock
    else 库存成功
      BE->>DB: Order.update({status: 'paid'})
      BE->>DB: PaymentEvent.create(audit log)
      BE->>ML: notifyOrderConfirmed(order)
      BE-->>FE: 200 { order }
      FE->>U: 显示订单确认页
    end
  end

  rect rgb(255, 245, 245)
    Note over U,ML: 阶段 4：Webhook 兜底（防错过 capture）
    PP->>BE: POST /api/webhooks/paypal<br/>PAYMENT.CAPTURE.COMPLETED
    BE->>BE: verifyWebhookSignature()
    BE->>DB: 检查订单是否已 paid（幂等）
    Note right of BE: 已处理 → skip<br/>未处理 → 同上 capture 流程
  end
```

**关键设计**：

- **幂等性键** 防止重复 capture（用户刷新页面）
- **金额验证** 防止前端篡改价格
- **原子库存扣减** 用 `findOneAndUpdate` 单语句完成
- **库存失败立即退款** 防止用户付钱拿不到货
- **Webhook 兜底** 防止网络问题导致 capture 错过

---

## 图 4：认证授权时序（JWT 双 Token）

```mermaid
sequenceDiagram
  autonumber
  participant Admin as 👨‍💼 管理员
  participant FE as Frontend
  participant BE as Backend
  participant DB as MongoDB

  rect rgb(240, 248, 255)
    Note over Admin,DB: 登录
    Admin->>FE: 输入用户名密码
    FE->>BE: POST /api/auth/login
    BE->>DB: User.findOne({username})
    BE->>BE: bcrypt.compare(password, hash)
    BE->>BE: 生成 access (15min) + refresh (7d)
    BE-->>FE: 200 { accessToken, user }
    Note right of BE: refresh token 通过 Set-Cookie<br/>HttpOnly + Secure + SameSite=Strict
    FE->>FE: 存 accessToken 到 memory（不入 localStorage）
  end

  rect rgb(240, 255, 240)
    Note over Admin,DB: 调用受保护 API
    FE->>BE: GET /api/admin/leads<br/>Authorization: Bearer {access}
    BE->>BE: jwt.verify(access)
    BE->>DB: 业务查询
    BE-->>FE: 200 [...]
  end

  rect rgb(255, 250, 240)
    Note over Admin,DB: Access 过期，自动 refresh
    FE->>BE: GET /api/admin/leads (access expired)
    BE-->>FE: 401 { code: 'TOKEN_EXPIRED' }
    FE->>BE: POST /api/auth/refresh<br/>Cookie: refresh=xxx<br/>X-CSRF-Token: yyy
    BE->>BE: 验证 refresh + CSRF token
    BE->>BE: 生成新 access + 新 refresh<br/>（refresh rotation）
    BE-->>FE: 200 { accessToken } + Set-Cookie
    FE->>BE: GET /api/admin/leads（重试，自动）
    BE-->>FE: 200 [...]
  end

  rect rgb(255, 245, 245)
    Note over Admin,DB: 登出
    Admin->>FE: 点登出
    FE->>BE: POST /api/auth/logout
    BE->>DB: Session.delete (撤销 refresh)
    BE-->>FE: 200 + Clear-Cookie
    FE->>FE: 清理 memory token
  end
```

**安全设计**：

- **Access token 在内存**（不进 localStorage 防 XSS）
- **Refresh token 在 HttpOnly cookie**（JS 读不到）
- **CSRF 双提交** 保护 refresh / 任何 mutation
- **Refresh rotation** 每次 refresh 都换新的，旧的失效
- **Session 表** 让管理员能强制登出某用户

---

## 图 5：实时客服 Socket.io 架构

```mermaid
graph LR
  subgraph "访客端"
    V1[👤 访客 1<br/>session_a]
    V2[👤 访客 2<br/>session_b]
    V3[👤 访客 3<br/>session_c]
  end

  subgraph "管理端"
    A1[👨‍💼 客服 1]
    A2[👨‍💼 客服 2]
  end

  subgraph "Socket.io Server"
    direction TB
    Auth[Connection Middleware<br/>验证 sessionToken / JWT]
    Rooms{Room 路由}
    R_Visitor1[Room: visitor:session_a]
    R_Visitor2[Room: visitor:session_b]
    R_Visitor3[Room: visitor:session_c]
    R_Admins[Room: admins<br/>所有客服]
  end

  subgraph "Persistence"
    Msg[(Message<br/>collection)]
    Ses[(Session<br/>collection)]
  end

  V1 -.->|sessionToken| Auth
  V2 -.-> Auth
  V3 -.-> Auth
  A1 -.->|JWT| Auth
  A2 -.->|JWT| Auth

  Auth --> Rooms
  Rooms --> R_Visitor1
  Rooms --> R_Visitor2
  Rooms --> R_Visitor3
  Rooms --> R_Admins

  R_Visitor1 <-.-> V1
  R_Visitor2 <-.-> V2
  R_Visitor3 <-.-> V3
  R_Admins <-.-> A1
  R_Admins <-.-> A2

  R_Visitor1 -->|message| Msg
  Auth -->|connect/disconnect| Ses

  classDef visitor fill:#9cf
  classDef admin fill:#f9c
  classDef server fill:#fc9
  classDef store fill:#9f9
  class V1,V2,V3 visitor
  class A1,A2 admin
  class Auth,Rooms,R_Visitor1,R_Visitor2,R_Visitor3,R_Admins server
  class Msg,Ses store
```

**关键设计**：

- **房间隔离**：每个访客独立房间，访客之间互不可见
- **管理员公共房**：所有客服在 `admins` 房间，任何访客新消息广播到所有客服
- **持久化**：消息写库，断网重连能拉历史
- **重连指数退避**：失败重连 1s → 2s → 4s → ... 上限 30s

---

## 图 6：部署拓扑（Production）

```mermaid
graph TB
  subgraph "Internet"
    User[👤 全球用户]
  end

  subgraph "Cloudflare（边缘层）"
    DNS[DNS<br/>zcritical.co A → Vercel<br/>api.zcritical.co CNAME → Render]
    WAF[WAF + DDoS]
    Cache[CDN Cache<br/>静态资源 / OG 图]
  end

  subgraph "Vercel（前端）"
    Edge[Edge Functions<br/>Middleware: i18n routing]
    SSR[SSR Functions<br/>Region: iad1 主, hkg1 副]
    Static[Static Assets<br/>预渲染 HTML / JS / CSS]
  end

  subgraph "Render（后端 - Singapore）"
    LB[Render Load Balancer]
    API[Express + Socket.io<br/>Standard 512MB / 0.5 CPU]
    Cron[order-cleanup<br/>setInterval 5min]
  end

  subgraph "MongoDB Atlas（Singapore）"
    Primary[(Primary Replica)]
    Secondary1[(Secondary 1)]
    Secondary2[(Secondary 2)]
  end

  subgraph "Cloudflare R2"
    Firmware[firmware/v*.bin]
    Backups[backups/atlas-*.tar.gz]
  end

  User --> DNS
  DNS --> WAF
  WAF --> Cache
  Cache -->|miss| Edge
  Edge --> SSR
  Edge --> Static
  SSR -.->|/api/*| LB
  LB --> API
  API --> Primary
  Primary -.->|replication| Secondary1
  Primary -.->|replication| Secondary2

  API -->|presigned URL| Firmware
  Cron -->|nightly| Backups

  classDef edge fill:#f96,stroke:#333
  classDef app fill:#9cf,stroke:#333
  classDef db fill:#9f9,stroke:#333
  class DNS,WAF,Cache edge
  class Edge,SSR,Static,LB,API,Cron app
  class Primary,Secondary1,Secondary2,Firmware,Backups db
```

**关键设计**：

- **多 region**（Vercel iad1 + hkg1，Render Singapore）适合中美双向用户
- **Atlas 3 副本**自动故障转移
- **Cron 单实例**避免多实例 race condition
- **R2 用 presigned URL** 让设备直连下载，不走后端

---

## 图 7：数据模型 ER 图

```mermaid
erDiagram
  USER ||--o{ AUDIT_LOG : "operates"
  USER {
    ObjectId _id PK
    string username UK
    string email UK
    string passwordHash
    enum role "admin/agent"
    boolean disabled
    boolean twoFactorEnabled
    string twoFactorSecret "encrypted"
    Date lastLoginAt
  }

  LEAD {
    ObjectId _id PK
    string name
    string email
    string company
    string phone
    string message
    enum status "new/contacted/qualified/won/lost"
    string source
    enum locale "zh/en"
    string notes
    Date createdAt
  }

  PRODUCT ||--|{ VARIANT : "contains"
  PRODUCT {
    ObjectId _id PK
    object name "i18n: {zh,en}"
    string slug UK
    object description "i18n"
    int price "cents"
    string currency
    array images
    enum status "active/draft/archived"
    boolean featured
  }

  VARIANT {
    string sku PK
    object name "i18n"
    int stock
    string image
    int weight
  }

  ORDER ||--o{ ORDER_ITEM : "contains"
  ORDER ||--o{ PAYMENT_EVENT : "audit"
  ORDER {
    ObjectId _id PK
    string orderNo UK "CRT-YYMMDD-XXXX"
    string email
    enum status "pending_payment/paid/shipped/delivered/cancelled/refunded"
    int subtotal "cents"
    int shipping "cents"
    int total "cents"
    string currency
    enum locale "zh/en"
    object shippingAddress
    object fulfillment "{carrier, trackingNo, trackingUrl}"
    string paypalOrderId
    string idempotencyKey UK
    Date paidAt
    Date shippedAt
  }

  ORDER_ITEM {
    string sku
    string name
    int price
    int quantity
  }

  PAYMENT_EVENT {
    ObjectId _id PK
    ObjectId orderId FK
    enum type "create/capture/refund/webhook"
    object payload
    Date createdAt
  }

  FIRMWARE {
    ObjectId _id PK
    string version UK "semver"
    enum channel "stable/beta/dev"
    object releaseNotes "i18n"
    string binaryUrl
    int binarySize
    string binaryHash "SHA256"
    array hardwareVersions
    int rolloutPercent "0-100"
    enum status "draft/published/deprecated"
    Date publishedAt
  }

  DEVICE ||--o| ORDER : "linked to"
  DEVICE {
    ObjectId _id PK
    string serialNumber UK
    string hardwareVersion
    string firmwareVersion
    string email "auto-link to order"
    ObjectId orderId FK
    Date activatedAt
    Date lastSeenAt
    object metadata
  }

  SESSION ||--o{ MESSAGE : "contains"
  SESSION {
    string sessionId PK "UUID"
    string sessionToken
    string visitorName
    enum status "active/closed"
    Date lastActivityAt
  }

  MESSAGE {
    ObjectId _id PK
    string sessionId FK
    enum from "visitor/admin"
    string content
    Date createdAt
  }

  AUDIT_LOG {
    ObjectId _id PK
    ObjectId actorId FK
    string action
    string entityType
    string entityId
    object before
    object after
    string ip
    string userAgent
    Date createdAt
  }
```

**关键设计**：

- **i18n 字段** 用嵌套对象 `{zh, en}`（不是单语言）
- **金额都用 cents**（避免浮点误差）
- **审计字段**全表都有 `createdAt`，关键操作有 `AuditLog`
- **唯一索引** 在 `slug` / `sku` / `orderNo` / `serialNumber` / `version` / `idempotencyKey`

---

## 图 8：网络与安全分层

```mermaid
graph TB
  subgraph "Layer 0: 用户"
    U[👤 用户浏览器]
  end

  subgraph "Layer 1: 边缘防护"
    direction LR
    L1A[DDoS 缓解<br/>Cloudflare 自动]
    L1B[Bot 识别<br/>Cloudflare Bot Fight]
    L1C[WAF 规则<br/>OWASP Top 10]
    L1D[国家级封禁<br/>可选]
  end

  subgraph "Layer 2: HTTPS / TLS"
    direction LR
    L2A[TLS 1.3<br/>HSTS preload]
    L2B[CAA 限制 CA<br/>仅 Cloudflare Issue]
  end

  subgraph "Layer 3: 应用层防护"
    direction LR
    L3A[CSP nonce<br/>无 unsafe-inline]
    L3B[X-Frame-Options DENY<br/>Permissions-Policy]
    L3C[Referrer-Policy<br/>strict-origin]
    L3D[CORS 白名单]
  end

  subgraph "Layer 4: 认证 / 授权"
    direction LR
    L4A[JWT 双 Token]
    L4B[CSRF 双提交]
    L4C[Admin 2FA TOTP]
    L4D[速率限制]
  end

  subgraph "Layer 5: 输入验证"
    direction LR
    L5A[Zod schema<br/>统一校验]
    L5B[Mongoose 类型]
    L5C[Helmet 默认头]
    L5D[Honeypot 防机器人]
  end

  subgraph "Layer 6: 数据保护"
    direction LR
    L6A[bcrypt cost 12]
    L6B[Mongoose 字段加密<br/>PII 列加密]
    L6C[Atlas at-rest encryption]
    L6D[备份加密 + 异地]
  end

  subgraph "Layer 7: 可观测 / 审计"
    direction LR
    L7A[AuditLog 所有写]
    L7B[Pino 日志 redact]
    L7C[Sentry 错误]
    L7D[PostHog 行为]
  end

  subgraph "Layer 8: 供应链 / 合规"
    direction LR
    L8A[CodeQL 周扫]
    L8B[Semgrep PR 扫]
    L8C[Dependabot]
    L8D[SBOM Syft]
    L8E[GDPR 数据导出]
  end

  U --> L1A
  L1A --> L1B
  L1B --> L1C
  L1C --> L1D
  L1D --> L2A
  L2A --> L2B
  L2B --> L3A
  L3A --> L3B
  L3B --> L3C
  L3C --> L3D
  L3D --> L4A
  L4A --> L4B
  L4B --> L4C
  L4C --> L4D
  L4D --> L5A
  L5A --> L5B
  L5B --> L5C
  L5C --> L5D
  L5D --> L6A
  L6A --> L6B
  L6B --> L6C
  L6C --> L6D
  L6D --> L7A
  L7A --> L7B
  L7B --> L7C
  L7C --> L7D
  L7D --> L8A
  L8A --> L8B
  L8B --> L8C
  L8C --> L8D
  L8D --> L8E

  classDef l1 fill:#f99
  classDef l2 fill:#fc9
  classDef l3 fill:#ff9
  classDef l4 fill:#9f9
  classDef l5 fill:#9fc
  classDef l6 fill:#9cf
  classDef l7 fill:#c9f
  classDef l8 fill:#f9c

  class L1A,L1B,L1C,L1D l1
  class L2A,L2B l2
  class L3A,L3B,L3C,L3D l3
  class L4A,L4B,L4C,L4D l4
  class L5A,L5B,L5C,L5D l5
  class L6A,L6B,L6C,L6D l6
  class L7A,L7B,L7C,L7D l7
  class L8A,L8B,L8C,L8D,L8E l8
```

**关键设计**：

- **8 层纵深防御** — 任何一层失守，下一层兜底
- **零信任原则** — 每层都重新验证，不假设上一层做过
- **当前状态**：
  - ✅ Layer 1-2 已配（Cloudflare）
  - ✅ Layer 3-5 大部分已配
  - 🟡 Layer 6 部分（bcrypt 已配，PII 加密 W2 做）
  - ✅ Layer 7 已配
  - 🟡 Layer 8 部分（CodeQL 已配，其他 W2 做）

---

## 如何使用这些图

### 给开发者

- 上手前先看图 1 + 图 7，30 分钟理解全貌
- 改动支付相关代码前必看图 3
- 改动认证相关代码前必看图 4

### 给安全审计

- 图 8 是审计的入口
- 任何防护层缺失立刻定位

### 给运维

- 图 6 是部署故障排查的总图
- 配合 `docs/DEPLOY.md` Runbook

### 给产品 / 客户

- 图 1 简化版可作 pitch deck 一页 slide
- 图 3 可作"你的钱怎么处理"信任建立材料

---

## 维护原则

- **任何新模块进入系统**，必须先在对应图加节点
- **任何流程变更**，时序图必须同步更新
- **每个 Phase 末**，PR 必须勾选"架构图已更新"
- 图位置：本文件 + `docs/diagrams/*.mmd`（独立文件方便单独 review）

---

> 一图胜千言。但一张乱图能毁掉千言。
> 这些图必须保持简洁、准确、当前。
