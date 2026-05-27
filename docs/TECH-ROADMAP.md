# 技术演进路线（Tech Roadmap）

> 看 3-5 年。让今天写的代码 5 年后还能用。
> 不是 wishlist，是有依据的演进路径。

---

## 1. 当前栈快照（v1.0）

| 层     | 技术                       | 选型理由            |
| ------ | -------------------------- | ------------------- |
| 前端   | Next.js 14 App Router      | RSC + SEO + DX 都强 |
|        | React 18                   | 稳定生态            |
|        | TypeScript 5.6             | 类型安全            |
|        | Tailwind CSS               | 工程化设计系统      |
|        | next-intl 3                | 成熟 i18n 方案      |
|        | next-themes                | 主题切换            |
|        | framer-motion              | 动效                |
| 后端   | Express 4 + Socket.io 4    | 简洁 + 实时         |
|        | Mongoose / MongoDB         | NoSQL 灵活          |
|        | Pino                       | 高性能日志          |
|        | Zod 3                      | 共享校验            |
|        | jsonwebtoken               | JWT                 |
| 共享   | TypeScript + Zod           | 单一真相源          |
| 工程化 | pnpm 9 workspaces          | 快 + 节省磁盘       |
|        | Husky 9 + commitlint       | 提交规范            |
|        | Vitest 2                   | 现代测试            |
|        | Playwright 1.4x            | E2E 标杆            |
|        | ESLint 8 + Prettier 3      | 代码规范            |
|        | GitHub Actions             | CI/CD               |
|        | CodeQL + Dependabot        | 安全                |
| 部署   | Vercel + Render            | 免费档够用          |
|        | MongoDB Atlas (M0)         | 免费                |
|        | Cloudflare DNS / CDN / WAF | 免费                |
|        | Docker 多阶段              | 容器化              |

**评估**：当前栈选型都对，没有需要立刻替换的。

---

## 2. 演进路线（按时间）

```
v1.0    Phase 0 完成
   |
   v
v1.1    Phase 1 上线 + 头 3 个月稳定运行
   |   ├── React Email（邮件升级）
   |   ├── PostHog 接入
   |   ├── Better Stack 日志聚合
   |   └── Cloudflare R2 接入
   v
v1.2    业务规模 + 优化期（3-6 个月）
   |   ├── BullMQ + Redis 队列
   |   ├── 多币种支持
   |   ├── 优惠码 / 积分
   |   ├── 物流 API 集成
   |   └── 第二个 admin 用户体系
   v
v2.0    平台化（6-12 个月）
   |   ├── tRPC 替代 REST（如果团队增长）
   |   ├── Storybook + 设计系统站
   |   ├── React Server Components 深度化
   |   ├── Edge Runtime 大量迁移
   |   ├── AI 客服深度集成
   |   └── 微服务拆分（payment / firmware-cdn 独立）
   v
v3.0    成熟期（1-2 年）
   |   ├── Next 16 / React 20
   |   ├── 自研 Feature flags / A/B 平台
   |   ├── 多区域部署（中美双向）
   |   ├── 数据仓库（ClickHouse）
   |   └── 移动端 React Native（如需）
   v
v4.0    规模化（2-5 年）
       ├── 微前端架构（如果 admin 庞大）
       ├── 自托管基础设施（如果 Vercel/Render 太贵）
       ├── ML pipeline（推荐 / 价格优化）
       └── 自研开发平台
```

---

## 3. 即将到来的关键技术决策

### 3.1 Next.js 14 → 15 升级

**时机**：Phase 0 末（月 3）
**原因**：

- React 19 的稳定性
- async params / searchParams（Breaking）
- Next 14 维护周期 12 个月

**风险**：

- next-intl 兼容性（已发布 4.x 但需要测试）
- 第三方库（framer-motion / embla-carousel）兼容
- 我们自己的 SSR 代码需要审计

**准备**：

- 月 2 W7 跑一次 Next 15 trial branch
- 列出 breaking 影响清单
- 月 3 W12 正式升级

### 3.2 PostgreSQL vs MongoDB 决策

**当前**：Mongoose + MongoDB
**重新评估时机**：v2.0
**触发条件**：

- 复杂关联查询（订单 ↔ 用户 ↔ 商品 ↔ 设备 ↔ 退款）开始痛苦
- 强一致事务需求
- 报表需求

**迁移方案**（如果决定切）：

- 用 Prisma（schema-first，从 Mongoose 迁过去工作量适中）
- 双写期 1 个月
- 按表逐步切换

**短期不切的理由**：

- Mongoose 当前满足需求
- 切换成本高
- MongoDB Atlas 服务好

### 3.3 Express → Hono / Fastify？

**评估**：v1.2 看

- Hono：边缘运行时友好，性能高
- Fastify：插件生态成熟
- Express：兼容性最好但较慢

**当前**：Express 够用。瓶颈出现再换。

### 3.4 REST → tRPC？

**评估**：v2.0
**前提**：

- API 数量 > 100
- 团队 > 3 个前端开发
- 需要更好的类型安全

**当前**：REST + Zod + OpenAPI 已提供类型安全。tRPC 优势不明显。

### 3.5 自部署还是 Serverless？

**当前**：Vercel + Render（serverless / managed）
**重新评估**：年支出 > $500/月时
**自部署选项**：

- Coolify（开源 Vercel 替代）+ VPS
- AWS ECS Fargate
- GCP Cloud Run

**结论**：长期 PaaS（Vercel）+ Render 性价比依然最高。除非业务规模到 IPO 级别再考虑。

---

## 4. 技术债务跟踪

### 当前已知债务

| ID    | 描述                                       | 严重度 | 偿还时机         |
| ----- | ------------------------------------------ | ------ | ---------------- |
| TD-1  | OpenAPI spec 手写易漂移                    | 中     | Phase 0 月 1 W3  |
| TD-2  | 邮件用 inline HTML（应该用 React Email）   | 低     | Phase 1 v1.1     |
| TD-3  | order-cleanup 用 setInterval（应该用队列） | 低     | Phase 1 v1.2     |
| TD-4  | Light theme 部分组件还有硬编码 dark        | 中     | Phase 0 月 1 W2  |
| TD-5  | Admin login 仅中文                         | 低     | Phase 1 v1.1     |
| TD-6  | 没有 Storybook                             | 低     | Phase 0 月 2 W7  |
| TD-7  | 没有 React 单元测试（仅 E2E）              | 中     | Phase 0 月 3 W12 |
| TD-8  | next-intl 用了 deprecated locale 参数      | 低     | Next 15 升级时   |
| TD-9  | 还在用 jsonwebtoken（应该用 jose）         | 低     | Phase 1 v1.1     |
| TD-10 | bcrypt-js 应该用 argon2（更现代）          | 低     | v2.0             |

### 偿还原则

- 每月 review 一次
- 每个新 feature 不能新增 > 1 项债务
- Phase 末偿还所有"中"以上债务

---

## 5. 性能预算（Performance Budget）

### 前端预算

| 指标                | 预算          | 监控方式                |
| ------------------- | ------------- | ----------------------- |
| LCP (mobile)        | < 2.5s        | Lighthouse + Web Vitals |
| FID / INP           | < 200ms       | Web Vitals              |
| CLS                 | < 0.1         | Web Vitals              |
| First Load JS       | < 200 KB      | Next 自带分析           |
| Hero LCP image      | < 200 KB      | next/image 自动         |
| Total page weight   | < 1.5 MB      | Lighthouse              |
| Time to Interactive | < 5s (mobile) | Lighthouse              |

### 后端预算

| 指标                | 预算     | 监控               |
| ------------------- | -------- | ------------------ |
| API P50 latency     | < 100ms  | Sentry Performance |
| API P99 latency     | < 1s     | Sentry             |
| Health check        | < 50ms   | UptimeRobot        |
| Mongo query P95     | < 200ms  | Atlas              |
| Memory per instance | < 256 MB | Render dashboard   |

### CI 预算

| 指标         | 预算     |
| ------------ | -------- |
| Quality job  | < 5 min  |
| Build job    | < 10 min |
| Total per PR | < 15 min |

超预算 = 必须 RFC 解释 + 治理。

---

## 6. 技术雷达（Tech Radar）

借鉴 ThoughtWorks 风格。

### 🟢 ADOPT（用，没争议）

- Next.js 14 App Router
- TypeScript（strict mode）
- Zod
- Tailwind CSS
- pnpm workspaces
- Vitest
- Playwright
- React Email（即将引入）

### 🔵 TRIAL（小规模试用）

- React Three Fiber（3D，月 2 W5 试）
- Server Actions（月 2 部分路由试）
- Mintlify（文档站，月 2 W8 试）
- BullMQ（队列，v1.2 试）

### 🟡 ASSESS（持续评估）

- tRPC（API 数量超 100 后再评）
- Prisma（如果切到 Postgres）
- Hono（如果性能瓶颈）
- Edge Runtime（看具体路由是否合适）

### 🔴 HOLD（暂不引入）

- Redux / Zustand（React 18 useReducer + Server State 够用）
- GraphQL（REST + Zod + OpenAPI 已够）
- Apollo（同上）
- Webpack（用 Turbopack/SWC 即可）
- Jest（用 Vitest 取代）
- styled-components（Tailwind 已够）
- moment.js（用原生 Intl + dayjs）

---

## 7. 长期架构愿景

### v3.0 目标架构

```
                    Cloudflare WAF + DDoS
                            ↓
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
       Vercel Edge      Vercel SSR      Vercel ISR
       (i18n routing)  (产品页/详情)     (营销页)
            ↓
            ↓
       Backend Gateway (API gateway)
            ↓
   ┌────────┼────────┬────────┬─────────┐
   ↓        ↓        ↓        ↓         ↓
 Auth    Order    Firmware Device   Chat
 service  service  service  service  service
   │        │        │        │         │
   └────────┴────┬───┴────────┴─────────┘
                ↓
           ┌────┴────┐
           ↓         ↓
       MongoDB   Redis (BullMQ)
                  │
                  ↓
              ClickHouse (analytics)
```

### 现在 → v3.0 的升级路径

1. **现在**：单体 Express 后端
2. **v1.2**：Express + 内部模块化（按 domain 拆 router）
3. **v2.0**：第一个微服务拆出（payment-service）
4. **v3.0**：完全微服务（按业务领域拆）

---

## 8. 关键能力建设

### 月 1

- ✅ 架构可视化文档完成
- ✅ 安全基线达标
- 🟡 自动备份 + 恢复演练
- 🟡 Staging 环境

### 月 2

- 🟡 R3F 3D 集成基础
- 🟡 React Email 迁移
- 🟡 PostHog 集成
- 🟡 AI 客服 PoC

### 月 3

- 🟡 负载测试基线
- 🟡 灾备演练
- 🟡 渗透测试
- 🟡 全链路监控

### 上线后 v1.1（首 3 个月）

- 队列系统（BullMQ）
- 物流 API
- 多币种

### v1.2（3-6 个月）

- Storybook 设计系统站
- 客户管理深度
- 报表系统

### v2.0（6-12 个月）

- 微服务化第一步
- AI 客服深度
- 用户系统

---

## 9. 不会引入的技术（明确说"不"）

| 技术               | 不引入理由                              |
| ------------------ | --------------------------------------- |
| Redux              | useReducer + RSC 已够，Redux 复杂度不值 |
| MobX               | React 18 hooks 时代不需要               |
| GraphQL            | 我们 API 简单，REST + Zod 更直接        |
| Microservices      | 单体足够，过早微服务是反模式            |
| Kubernetes         | Render 已托管，K8s 是 over-engineering  |
| Terraform          | 当前部署简单，YAML 蓝图够用             |
| Kafka              | 当前没事件源场景                        |
| ElasticSearch      | MongoDB 自带 text search 够用           |
| AWS S3             | 用 Cloudflare R2（兼容 S3 API + 便宜）  |
| Sentry self-hosted | SaaS 版免费档够，自托管运维成本高       |

---

## 10. 升级哲学

### 何时升级

- ✅ 安全漏洞修复
- ✅ 修了我们正在踩的 bug
- ✅ 性能显著提升（> 20%）
- ✅ 维护周期到期

### 何时不升级

- ❌ "新版本出了"（FOMO 不是理由）
- ❌ 仅新增功能我们用不到
- ❌ 主版本 .0 刚出（等 .2+ 再考虑）
- ❌ 当前没痛点

### 升级流程

1. 起 RFC（在 INTERFACES.md / DECISIONS.md）
2. trial branch 跑一遍
3. 列 breaking 清单
4. 分阶段 rollout
5. 升级失败的 rollback plan 提前准备

---

## 11. 文档 / 知识管理

### 持续更新的文档

- `docs/STRATEGY.md` 每 Phase 更新
- `docs/ARCHITECTURE-VISUAL.md` 每架构变更更新
- `docs/DECISIONS.md` 每决策追加 ADR
- `docs/TECH-ROADMAP.md`（本文）每月 review
- `docs/SECURITY-AUDIT.md` 每周更新

### 不再更新（归档）

- 旧版 ROADMAP（Phase 1 后归档）
- 任何带 "v0.x" 字样的文档（v1.0 后归档）

---

## 12. 关键工程师产出

### Phase 0 末（月 3）我必须达到的能力清单

**我（AI dev agent）能独立完成**：

- ✅ 完整的安全审计 + 修复
- ✅ 全栈代码 review
- ✅ E2E 测试设计
- ✅ 性能优化
- ✅ 部署 / DevOps
- ✅ 文档化

**需要你提供**：

- 业务决策（哪些功能优先）
- 第三方账号 / 凭证
- 真实素材（照片 / 视频）
- 法律 / 商务相关

---

## 13. 最重要的"不变量"

无论怎么演进，这些原则不变：

1. **TypeScript 严格模式**（永不放松）
2. **测试覆盖率门槛**（永不降低）
3. **CI 必须全绿**（永不绕过）
4. **Conventional Commits**（永不破坏）
5. **shared schema 单一真相源**（永不背离）
6. **安全是第一类要求**（永不妥协）
7. **金额永远 cents**（永不浮点）
8. **i18n 永不留死字符串**（永不偷懒）
9. **AuditLog 覆盖所有写**（永不漏审计）
10. **错误必须有 requestId**（永不黑盒）

---

> 技术栈是工具。
> 工具的目的是让用户的生活更好。
> 不是炫耀我们用了多酷的东西。
> 演进的每一步，都问自己：用户感受到了吗？
