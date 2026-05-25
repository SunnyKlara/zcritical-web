# Critical 6 周开发路线图

> 版本: v0.1 · 日期: 2026-05-26
>
> 把 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 描述的闭环拆成可独立交付的里程碑。
> 每个里程碑可演示、可部署、可被老板看到价值。

---

## M1：品牌展示站 ✅ 已完成

**目标**：一个能让访客了解产品的静态网站。

- [x] Hero / 产品概览 / 8 大功能 / APP 展示 / 硬件规格 / 使用场景
- [x] SEO meta + JSON-LD
- [x] 响应式布局
- [x] 4 个独立子页面（/firmware、/support、/download、/blog）
- [x] 设计系统 tokens（颜色、字体、间距、动效）

**当前位置**：`critical-website/`

**演示能力**：访客可查看产品介绍、下载 APP（直链 GitHub Release）。

---

## M2：询盘转化（1 周）🚧 当前阶段

**目标**：访客能留资，老板能收到邮件通知。

### 任务清单

| #   | 任务                                                             | 文件                                              | 验收                                                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| 1   | 建立 monorepo 骨架                                               | `package.json` `pnpm-workspace.yaml`              | `pnpm install` 通过                                  |
| 2   | shared 包 + Lead schema                                          | `shared/src/schemas/lead.schema.ts`               | `pnpm --filter shared typecheck` 通过                |
| 3   | 后端骨架（Express + Mongo + Pino）                               | `backend/src/server.ts`                           | `pnpm --filter backend dev` 启动并 `/api/health` 200 |
| 4   | Lead model + POST /api/leads                                     | `backend/src/routes/lead.routes.ts`               | curl 提交表单数据返回 201                            |
| 5   | 邮件通知（SMTP）                                                 | `backend/src/services/mailer.service.ts`          | 提交后收到邮件                                       |
| 6   | 前端 Contact 表单（迁到 monorepo 之前先在 critical-website/ 加） | `critical-website/src/components/ContactForm.tsx` | 表单提交后端，UI 反馈                                |
| 7   | Sentry 后端接入                                                  | `backend/src/lib/sentry.ts`                       | 抛错后 Sentry 收到                                   |
| 8   | 部署后端到 Render                                                | `docker/Dockerfile.api` `render.yaml`             | 公网可访问 `/api/health`                             |

### 演示能力

填表单 → 后端落库 → 老板邮箱收到通知。

### 学到什么

- 前后端 monorepo 协作流程
- Zod schema 共享
- 后端云部署完整链路

---

## M3：管理后台 + 实时客服（已大部分完成）✅

**目标**：老板能登录后台看 Lead，能在网页上和访客实时聊。

### 已完成

- [x] User model + JWT 认证（access + refresh + 自动轮换）
- [x] Audit 日志 service
- [x] requireAdmin / requireRole 中间件
- [x] CSRF 双提交 cookie 中间件
- [x] POST /api/auth/login + /refresh + /logout + GET /api/auth/me
- [x] GET /api/admin/leads + PATCH /:id（已挂载在 leadRouter，需 Admin token）
- [x] 前端 /admin 路由组 + 登录页
- [x] 前端 AuthProvider + authFetch（自动 refresh）
- [x] 前端 /admin Dashboard（统计 + 最近询盘）
- [x] 前端 /admin/leads 列表（搜索 + 筛选）
- [x] 前端 /admin/leads/[id] 详情（状态切换 + 备注）

### 待完成（Socket.io 客服系统）

- [ ] Session model + Message model
- [ ] Socket.io 服务端 handler（visitor + admin 房间）
- [ ] 前端 ChatWidget（访客侧）
- [ ] 前端 /admin/chat（客服侧）

### 演示能力

老板登录 `/admin/login` → 看到 Dashboard 统计 → 点 Lead 列表 → 修改状态/添加备注。

---

## M4：交易闭环（2 周）

**目标**：访客能下单 → PayPal 付款 → 收到订单确认邮件。

### 任务清单（第一周：商品 + 订单）

| #   | 任务                                | 验收                      |
| --- | ----------------------------------- | ------------------------- |
| 1   | Product model（含 variants 库存）   | seed 1 个商品成功         |
| 2   | GET /api/products + /:slug          | 返回商品                  |
| 3   | Admin 商品管理 CRUD                 | /admin/products 可增删改  |
| 4   | Order model + PaymentEvent model    | schema 通过 typecheck     |
| 5   | 运费表（按国家固定）                | 切换国家运费实时变化      |
| 6   | POST /api/orders（创建 + 库存校验） | 返回 orderNo + approveUrl |
| 7   | 前端 Checkout 页                    | 单页填表跳 PayPal         |

### 任务清单（第二周：支付 + 履约）

| #   | 任务                                       | 验收                                  |
| --- | ------------------------------------------ | ------------------------------------- |
| 8   | PayPal Service（OAuth + Create + Capture） | sandbox 跑通                          |
| 9   | POST /api/payments/paypal/capture          | 金额验证 + 库存原子扣减 + 订单转 paid |
| 10  | PayPal Webhook（退款通知）                 | `PAYMENT.CAPTURE.REFUNDED` 处理       |
| 11  | 订单确认邮件模板                           | 收到带订单详情的 HTML 邮件            |
| 12  | 前端 /checkout/success 落地页              | 显示订单确认                          |
| 13  | 前端 /order-lookup（邮箱+订单号查单）      | 能查到自己的订单                      |
| 14  | Admin /admin/orders 列表 + 详情            | 看到订单状态时间线                    |
| 15  | Admin 标记发货 + 退款操作                  | 触发对应邮件                          |
| 16  | 订单超时清理（30 分钟未付款）              | setInterval 跑通                      |

### 演示能力

访客 → 商品页 → Checkout → PayPal sandbox 付款 → 邮件 → 订单查询 / Admin 看订单 / 发货 / 退款。

---

## M5：固件分发（1 周）

**目标**：固件版本可上传/发布/灰度，APP 检查更新走 API。

### 任务清单

| #   | 任务                                | 验收                                |
| --- | ----------------------------------- | ----------------------------------- |
| 1   | Cloudflare R2 bucket 创建 + IAM key | `aws s3 cp` 命令能上传              |
| 2   | Firmware model                      | schema 通过                         |
| 3   | Admin 上传接口（multipart + R2）    | 200 MB 内文件能上传                 |
| 4   | GET /api/firmware/list              | 返回已发布版本                      |
| 5   | GET /api/firmware/check（APP 调）   | 返回签名下载 URL                    |
| 6   | 灰度策略（按 serialNumber hash）    | `rolloutPercent: 50` 一半设备能升级 |
| 7   | 前端 /firmware 页面接入真实 API     | 不再调 GitHub API                   |
| 8   | Admin /admin/firmware 管理页        | 列表 + 上传 + 发布                  |

### 演示能力

老板上传新固件 → 设置渠道 stable → APP 检查更新返回新版本 → 设备开始下载。

---

## M6：设备绑定（1 周）

**目标**：硬件激活后能关联订单和用户，后台可见设备列表。

### 任务清单

| #   | 任务                                            | 验收                       |
| --- | ----------------------------------------------- | -------------------------- |
| 1   | Device model                                    | schema 通过                |
| 2   | POST /api/devices/activate                      | APP 上报序列号成功落库     |
| 3   | POST /api/devices/heartbeat                     | 设备 lastSeenAt 更新       |
| 4   | GET /api/devices/:serialNumber（带 email 验证） | 查询自己的设备             |
| 5   | Admin /admin/devices 列表                       | 看到所有激活设备           |
| 6   | 设备 → 订单关联（按 email + 订单号）            | Admin 查订单时看到关联设备 |
| 7   | APP 集成激活 API（甲方侧）                      | APP 启动时上报             |

### 演示能力

APP 启动 → 上报激活 → Admin 看到新设备 → 点进去看到关联订单。

---

## M7+：后续可选

按业务优先级排：

- **多语言（en / zh）** — 整站 next-intl 接入，邮件模板双语
- **预订单（preorder）模式** — V1 之前可以先收预定金
- **Stripe / 信用卡直接收单** — 提升转化率
- **AI 客服** — 接 OpenAI / Claude，覆盖 FAQ
- **用户作品 UGC** — 骑行视频上传 + 灯效模板分享
- **物流 API 自动对接** — 云途 / 4PX / DHL
- **多币种** — JPY / EUR 本币显示
- **运营数据看板** — 订单转化漏斗、Lead 质量分析

---

## 节奏建议

每周一开始：

1. 看本文档当前 M 的任务清单
2. 创建 `docs/weekN/PLAN.md` 列具体任务和负责人
3. 每个任务单独 commit，commit message 用 `feat(M2): ...` / `fix(backend): ...` 格式
4. 周五写 `docs/weekN/REPORT.md` 总结实际进度 vs 计划

每个里程碑结束：

1. 部署到 Render / Vercel staging 环境
2. 自测全部演示能力
3. 录一段 1-2 分钟 demo 视频给老板/客户
4. 写一篇博客（顺带 SEO）
