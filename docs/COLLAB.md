# 协作清单（需要你 + 我一起完成的事项）

> 这个文档跟踪所有"我代码层面做完了，但需要你提供外部信息/凭证才能闭环"的事项。
> 每个模块独立，按推荐顺序攻克。完成一个划掉一个。

## 工作模式

- 我每个 round 给出**当前模块需要你做的事 + 详细步骤 + 信息粘贴格式**
- 你按步骤获取信息，把需要的内容贴给我
- 我立即用代码层面的对应改动接住，commit + 验证 + 报告
- 进入下一个模块

如果你某一步卡住了（比如某个服务注册失败、信息找不到），告诉我具体哪一步，我帮你查。

---

## 模块清单（按优先级）

### 🟦 M-Setup-1：确定品牌域名 ← 当前正在做

**为什么先做这个**：域名是后面所有事项的基础（SMTP 验证发件域名 / Sentry 项目 / PayPal 商户名 / 站点 SEO / OG 图），先定下来后面少改动。

**状态**：⏳ 等你提供

**需要你提供**：
- [ ] 准备使用的域名（例：`critical.bike`、`getcritical.com`、`ridewind.io` 等）
- [ ] 是否已经注册？还是需要我帮你做注册前的可用性检查？
- [ ] 想用什么二级域名做 API？默认 `api.<domain>` 还是别的？

**我会做什么**：
- 全代码库批量替换 `critical.bike` → 实际域名（layout / sitemap / robots / metadata / emails / sentry config）
- 更新 `render.yaml` / `next.config.mjs` / `.env.example` 的 SITE_URL
- 改 `manifest.ts` 的 description
- 重新 build 验证 + commit

---

### 🟦 M-Setup-2：MongoDB Atlas（生产数据库）

**为什么需要**：本地用 docker-compose 跑 MongoDB，但部署需要远程托管的库。Atlas 免费档（M0，512MB）足够 v1.0 用。

**状态**：⏳ 等你提供

**需要你提供**（按顺序操作）：
1. 注册 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)（用 GitHub 登录最方便）
2. 创建 Free（M0）集群，区域选**AWS · Asia Pacific (Singapore)** 或离你最近的区域
3. **Database Access** → Add User → 填用户名密码（请用强随机密码）
4. **Network Access** → Add IP → 临时填 `0.0.0.0/0`（部署后我会教你换成 Render 出口 IP）
5. **Connect** → Drivers → 复制 connection string，把 `<password>` 替换成实际密码

**贴给我**：

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/critical?retryWrites=true&w=majority
```

**我会做什么**：
- 验证连接（跑 seed 脚本到这个库）
- 配置 `backend/.env` + `render.yaml` 注入凭证
- 文档化 IP allowlist 流程

---

### 🟦 M-Setup-3：JWT secrets + 管理员密码

**为什么需要**：当前 `.env.example` 里是占位符，必须用强随机串才能 commit 进 production env。

**状态**：⏳ 等你提供（或让我自动生成）

**两种做法 二选一**：

**方式 A — 我帮你生成**（推荐，省事）
- 我直接生成 3 个高熵随机串，贴在 chat 里给你
- 你贴到 Render env vars 配置面板
- 这样不在 git 历史里留痕

**方式 B — 你自己生成**
```bash
# 在你电脑上跑 3 次（PowerShell）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
把 3 个串分别命名 `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `ADMIN_PASSWORD`。

**告诉我用哪种方式**即可。

---

### 🟦 M-Setup-4：SMTP（邮件发送服务）

**为什么需要**：Lead 通知 / 订单确认 / 发货 / 退款 邮件全靠它。**没有这个，邮件全部静默丢弃**。

**状态**：⏳ 等你提供

**推荐服务（按免费额度高 → 低）**：
1. **SendGrid** — 100 封/天免费（适合小规模，最稳定）
2. **Resend** — 100 封/天免费 + API 友好（开发者体验最好）
3. **Brevo (前 Sendinblue)** — 300 封/天免费
4. **腾讯企业邮箱** — 国内备案后稳

**推荐用 Resend**（最现代，开发体验最佳）。

**操作步骤（Resend 为例）**：
1. 去 https://resend.com/signup 注册
2. **API Keys** → Create API Key → 复制
3. **Domains** → Add Domain → 输入你的域名 → 跟着提示给 DNS 加 SPF + DKIM + DMARC 三条记录（如果你 DNS 在 Cloudflare 或域名商那边）
4. 等域名验证通过（通常几分钟）

**贴给我**：

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
SMTP_FROM=hello@<your-domain>
NOTIFY_EMAIL=<你接收 Lead 通知的邮箱>
```

如果你选 SendGrid 我会用通用 SMTP 配置，给我：

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxx
SMTP_FROM=hello@<your-domain>
NOTIFY_EMAIL=<你的邮箱>
```

**我会做什么**：
- 接入对应 SDK / 通用 SMTP transport
- 跑邮件冒烟测试（发一封测试邮件确认到达）
- 写 `pnpm --filter backend test:email` 命令
- 把对应 env 加进 `render.yaml` 和 `.env.example`

---

### 🟦 M-Setup-5：Sentry（错误追踪）

**为什么需要**：生产线上崩溃了你能立刻收到通知，不用等用户投诉。免费档 5k events/月够用。

**状态**：⏳ 等你提供

**操作步骤**：
1. 去 https://sentry.io/signup/ 注册
2. **Create Project** → 选 **Next.js** → 项目名 `critical-frontend` → 复制 DSN
3. 重复一次 → 选 **Express** → 项目名 `critical-backend` → 复制 DSN

**贴给我**：

```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxx@o123456.ingest.sentry.io/4567890
SENTRY_DSN=https://yyyyyy@o123456.ingest.sentry.io/4567891
SENTRY_ORG=<你的 org slug，URL 里能看到>
SENTRY_PROJECT_FRONTEND=critical-frontend
SENTRY_PROJECT_BACKEND=critical-backend
```

**可选**（启用 source map 上传，错误能精确定位到源码行）：
- **Settings** → **Account** → **API → Auth Tokens** → Create New Token，勾选 `project:releases`
- 贴：`SENTRY_AUTH_TOKEN=sntrys_xxxxx`

**我会做什么**：
- 注入 DSN 到 frontend SentryInit + backend instrumentation
- 验证一个测试错误能上报到 Sentry dashboard
- 配置 source map 自动上传（如果给了 auth token）

---

### 🟦 M-Setup-6：PayPal（支付，sandbox 先做，live 上线前换）

**为什么需要**：Checkout / 订单 / 退款 完全依赖 PayPal。

**状态**：⏳ 等你提供

**操作步骤**：
1. 去 https://developer.paypal.com/dashboard/ 用你的 PayPal 账号登录（没有就注册一个个人账号即可）
2. **Apps & Credentials** → **Sandbox** tab → 已有一个 default app
3. 复制 **Client ID** 和 **Secret**
4. 滚到下方 **Webhooks** → Add webhook：
   - Webhook URL：`https://<api-domain>/api/webhooks/paypal`（先填占位，部署后再来更新）
   - Event types 勾选：
     - `CHECKOUT.ORDER.APPROVED`
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `PAYMENT.CAPTURE.REVERSED`
   - Save → 复制生成的 **Webhook ID**

**贴给我**：

```
PAYPAL_CLIENT_ID=AY...
PAYPAL_CLIENT_SECRET=EH...
PAYPAL_WEBHOOK_ID=8R...
PAYPAL_ENV=sandbox
```

**我会做什么**：
- 注入凭证 + 跑 sandbox checkout 全流程
- 写 sandbox E2E 测试（创建订单 → mock 付款 → capture → 验证 webhook）
- 文档化 sandbox → live 切换流程（上线前再切）

---

### 🟦 M-Setup-7：部署目标 + 首次部署

**为什么需要**：让网站真正能被访问。

**状态**：⏳ 等你决定

**我推荐的组合**：
- **Frontend → Vercel**（Next.js 原厂，部署 Next 14 最丝滑，免费档够用）
- **Backend → Render**（已经有 `render.yaml`，免费档 750h/月）

**也可以**：
- 全 Vercel（backend 跑在 Vercel Serverless）— 但 Socket.io 实时聊天不兼容 serverless
- 全 Render（frontend 也在 Render）— 没有 Vercel 的边缘缓存优势
- Cloudflare Pages + Workers — 国内访问快但配置复杂

**告诉我**：
- 选哪个组合？
- GitHub 仓库地址（我需要它来给你出 Vercel 一键导入链接 / Render 蓝图链接）
- 你是否已经把代码 push 到了 GitHub？

**我会做什么**：
- 创建对应的部署文档（一键导入步骤）
- 调整 build/env 配置
- 触发首次部署（你点确认即可）
- 拿到部署 URL 后把所有占位 URL 全替换

---

### 🟦 M-Setup-8：Cloudflare R2（固件二进制托管）— 可延后

**为什么需要**：M5 固件 OTA 的 binary 文件需要 CDN 托管。如果暂时不卖货 / 不发设备，可以延后到 v1.1。

**状态**：⏳ 可选

**等到要做的时候我再发详细步骤**。

---

### 🟦 M-Asset-1：真实素材（图片 / 视频）— 可延后

**当前已有的 SVG / Canvas 占位足够上线**，社媒分享卡 / 站点都不会"空"。
真实素材的引入可以放到 v1.1，等产品摄影完成。

---

### 🟦 M-Decision-1：业务策略 — 上线后再讨论

- 多语言扩展（日语 / 韩语等）
- 多币种（CNY / EUR）
- Admin 后台是否 i18n（当前 zh-only）

**这些决策不阻塞 v1.0 上线**。

---

## 当前进度

| 模块                  | 状态    | 备注                |
| --------------------- | ------- | ------------------- |
| M-Setup-1 域名        | ⏳ 进行中 | **现在就做**        |
| M-Setup-2 MongoDB     | ⏳ 待开始 |                     |
| M-Setup-3 Secrets     | ⏳ 待开始 |                     |
| M-Setup-4 SMTP        | ⏳ 待开始 |                     |
| M-Setup-5 Sentry      | ⏳ 待开始 |                     |
| M-Setup-6 PayPal      | ⏳ 待开始 |                     |
| M-Setup-7 部署        | ⏳ 待开始 |                     |
| M-Setup-8 R2          | 🟡 可延后 | 要发设备时再做     |
| M-Asset-1 素材        | 🟡 可延后 | 摄影完成后做       |
| M-Decision-1 业务决策 | 🟡 可延后 | 上线后规划         |

---

## 协作格式建议

每个模块完成后，我会在这个文档加一个 ✅ + 实际改动的 commit hash，方便回溯。

如果中途你卡住或遇到错误，**直接复制错误信息给我**，我帮你看怎么解决。
