# 参考开源项目深度学习清单

> 不是"看一眼就完事"，而是**每个项目专门拆解一个维度**学。
> 看完后你会拥有这些项目所有最佳实践的混合版。

---

## 1. 学习路径

按推荐学习顺序（从最相关到泛用）：

```
1. Cal.com         ← 最像我们的栈，先吃透
2. Dub             ← 营销站设计 + 数据看板
3. Documenso       ← 邮件 + 表单流程
4. Twenty / Plane  ← Admin / CRM 设计
5. PostHog         ← 大型 monorepo 工程化
6. Vercel Commerce ← Next 14 商务最佳实践
7. shadcn/taxonomy ← Next.js + Tailwind 范式
```

每个项目精读 1-2 个核心模块即可，不要全部看（容易 overwhelm）。

---

## 2. 项目深度拆解

### 2.1 Cal.com — 最值得学的

**仓库**：https://github.com/calcom/cal.com
**Stars**：33k+
**栈**：Next.js + TypeScript + Prisma + Stripe + i18n + monorepo

#### 为什么是首选

- 跟我们栈高度重合（Next + Monorepo + Stripe-like 支付 + i18n）
- 是 SaaS 营销 + 后台 + API 一体化典范
- 代码质量足够高（Series-A 级别）

#### 必看 5 个目录

| 目录                 | 学什么                                           | 我们要复用          |
| -------------------- | ------------------------------------------------ | ------------------- |
| `apps/web/`          | Next.js 项目结构（仍是 pages router 但思路通用） | 结构                |
| `packages/lib/`      | 共享工具函数 + 类型                              | shared/ 扩展        |
| `packages/features/` | 按业务领域分包（auth / billing / settings）      | 我们后期可借鉴      |
| `packages/trpc/`     | tRPC API 层（我们用 REST，但模式可学）           | 类型驱动 API        |
| `packages/embeds/`   | 嵌入式 widget 实现                               | ChatWidget 升级版本 |

#### 重点文件

| 文件                                          | 学什么                      |
| --------------------------------------------- | --------------------------- |
| `packages/lib/checkRateLimitAndThrowError.ts` | Upstash Redis 限速          |
| `packages/lib/server/i18n.ts`                 | i18n 服务端对接             |
| `apps/web/middleware.ts`                      | Next 中间件链               |
| `packages/emails/src/`                        | 邮件模板组织（React Email） |

#### 学完能用上的

- 限速从 IP 升级到混合策略
- 邮件模板从字符串拼接 → React Email
- 共享代码组织到 `packages/lib`

---

### 2.2 Dub — 营销站 + 数据看板

**仓库**：https://github.com/dubinc/dub
**Stars**：21k+
**栈**：Next.js 14 App Router + Tailwind + shadcn/ui + Prisma

#### 为什么看它

- 营销首页是 2026 年最潮的 Next 14 实践
- Admin dashboard（数据看板）做得超漂亮
- shadcn/ui 在大项目里如何组织

#### 必看 5 个文件

| 文件                                | 学什么                        |
| ----------------------------------- | ----------------------------- |
| `apps/web/app/(marketing)/page.tsx` | Hero 区设计 + 滚动动效        |
| `apps/web/ui/`                      | UI 库组织（基于 shadcn 扩展） |
| `apps/web/lib/middleware/utils.ts`  | A/B 测试中间件                |
| `apps/web/components/analytics/`    | PostHog / Tinybird 数据可视化 |
| `apps/web/lib/zod/`                 | Zod schema 集中管理           |

#### 学完能用上的

- 营销首页动效升级（参考他们的 Hero 设计）
- Admin dashboard 数据可视化（折线图 / 漏斗）
- A/B 测试基础设施（用 middleware）

---

### 2.3 Documenso — DocuSign 替代

**仓库**：https://github.com/documenso/documenso
**Stars**：11k+
**栈**：Next.js 14 + Prisma + Stripe + Resend + Trigger.dev

#### 为什么看它

- 邮件流程最复杂的项目之一（签名邀请 / 完成通知 / 提醒...）
- Resend 用法的范例
- Trigger.dev（背景任务）用法

#### 必看

| 文件                               | 学什么                          |
| ---------------------------------- | ------------------------------- |
| `apps/web/src/components/forms/`   | 复杂表单的 React Hook Form 用法 |
| `packages/email/`                  | 邮件模板（React Email + 多语）  |
| `apps/web/src/lib/trigger.ts`      | Trigger.dev 集成                |
| `packages/lib/server-only/limits/` | 限速 + 配额管理                 |

#### 学完能用上的

- 邮件模板从我们当前的 inline HTML → React Email
- 加 Trigger.dev / Inngest 做背景任务（上线后做）

---

### 2.4 Twenty — 开源 Salesforce

**仓库**：https://github.com/twentyhq/twenty
**Stars**：33k+
**栈**：NestJS（后端） + Next.js（前端） + GraphQL + PostgreSQL

#### 为什么看它

- 后端是 NestJS（有更好的依赖注入 / 模块化）
- Admin / CRM 界面是 enterprise 级
- 复杂权限系统（RBAC + 字段级权限）

#### 必看

| 模块                                     | 学什么               |
| ---------------------------------------- | -------------------- |
| `packages/twenty-server/src/engine/api/` | GraphQL 自动 CRUD    |
| `packages/twenty-front/src/modules/`     | 前端模块化（按领域） |
| `permissions/`                           | RBAC 实现            |

#### 学完能用上的

- 后端从 Express 重构到 NestJS（**Phase 2 才做**，现在不需要）
- Admin 界面参考他们的 CRM 视觉

---

### 2.5 PostHog — 大型 monorepo 工程化

**仓库**：https://github.com/PostHog/posthog
**Stars**：22k+
**栈**：Django + Next.js + ClickHouse

#### 为什么看它

- 70k+ 行 TS，monorepo 顶级管理
- Feature flags / A/B 测试 / Session replay 全自研
- 工程化（CI / Docker / k8s）一流

#### 必看（**只看工程化**，业务忽略）

| 文件                        | 学什么              |
| --------------------------- | ------------------- |
| `.github/workflows/`        | CI 矩阵设计         |
| `Dockerfile`                | 多阶段 + 优化       |
| `frontend/src/lib/utils.ts` | 工具函数命名 + 测试 |
| `posthog-js/`               | 客户端 SDK 设计     |

#### 学完能用上的

- CI 拆 job（我们当前 quality job 太单体）
- Docker 镜像瘦身

---

### 2.6 Vercel Commerce — Next 14 商务标杆

**仓库**：https://github.com/vercel/commerce
**Stars**：12k+
**栈**：Next 14 App Router + Shopify

#### 为什么看它

- Vercel 官方维护，**Next 14 最佳实践标准**
- Server Components / Server Actions 用法范例
- ISR / 缓存策略示范

#### 必看

| 文件                          | 学什么                  |
| ----------------------------- | ----------------------- |
| `app/[page]/page.tsx`         | 动态路由 + ISR          |
| `app/api/revalidate/route.ts` | webhook 触发缓存重建    |
| `components/cart/`            | useOptimistic Hook 实战 |
| `lib/shopify/`                | 第三方 API 封装         |

#### 学完能用上的

- Checkout 升级到 Server Actions（更安全）
- 商品页缓存策略（revalidate on demand）

---

### 2.7 shadcn/taxonomy — SaaS 模板

**仓库**：https://github.com/shadcn-ui/taxonomy
**Stars**：17k+
**栈**：Next 13/14 + Tailwind + Prisma + NextAuth

#### 为什么看它

- shadcn 作者的 SaaS 模板
- 简洁 + 现代
- Marketing + Auth + Dashboard + Editor 一体

#### 必看

| 文件                               | 学什么           |
| ---------------------------------- | ---------------- |
| `app/(marketing)/`                 | 营销站结构       |
| `app/(dashboard)/`                 | Dashboard 路由组 |
| `app/(editor)/`                    | 编辑器（MDX）    |
| `components/empty-placeholder.tsx` | Empty state 设计 |

#### 学完能用上的

- Empty state 组件
- MDX 编辑器（如果做博客）

---

## 3. 单一维度专项学习

### 3.1 邮件系统

**学谁**：[Documenso](https://github.com/documenso/documenso) + [Resend example](https://github.com/resend/resend-nextjs-app-router-example)

**核心**：React Email 替代字符串拼接

```tsx
// 当前我们这样做（不好）
const html = `<div style="...">订单 ${order.orderNo}...</div>`

// 应该这样
import { Html, Heading, Section } from '@react-email/components'
export default function OrderConfirmedEmail({ order }) {
  return (
    <Html>
      <Heading>Order {order.orderNo}</Heading>
      <Section>...</Section>
    </Html>
  )
}
```

**好处**：

- TypeScript 类型安全
- 可单元测试
- 在邮件客户端兼容性自动处理

**何时迁移**：Phase 0 月 2 W7

---

### 3.2 Background Jobs / 队列

**学谁**：[Inngest](https://github.com/inngest/inngest) 或 [Trigger.dev](https://github.com/triggerdotdev/trigger.dev)

**核心**：当前 setInterval 跑 order-cleanup 不够稳健

- 多实例时多次运行
- 进程崩溃丢任务
- 不能重试

**升级方案**：BullMQ + Redis（自托管）或 Inngest（托管）

```typescript
// 当前
setInterval(cleanupExpiredOrders, 5 * 60_000)

// 升级
import { Worker, Queue } from 'bullmq'
const queue = new Queue('orders')
queue.add('cleanup', {}, { repeat: { every: 5 * 60_000 } })
new Worker(
  'orders',
  async (job) => {
    if (job.name === 'cleanup') await cleanupExpiredOrders()
  },
  { connection: redis },
)
```

**何时做**：流量起来后（Phase 2）

---

### 3.3 实时通知 / 多渠道

**学谁**：[Novu](https://github.com/novuhq/novu)

**核心**：当前邮件硬编码，未来加 Push / IM / SMS 时一团乱

**升级方案**：抽象通知层

```typescript
notifier.send({
  user: order.email,
  template: 'order_confirmed',
  channels: ['email', 'push'], // 用户偏好
  data: order,
})
```

**何时做**：Phase 2

---

### 3.4 可观测性 / Logs

**学谁**：[Highlight](https://github.com/highlight/highlight)

**核心**：当前 Pino 日志没聚合，多实例时没法搜
**升级方案**：Better Stack / Logtail（免费档够用）

**何时做**：Phase 0 月 1 W4

---

### 3.5 大型 monorepo 管理

**学谁**：[turborepo examples](https://github.com/vercel/turbo/tree/main/examples)

**核心**：我们 pnpm workspaces 已经够用，但 build cache 可以加 Turborepo

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

**好处**：CI 时只 build 改了的 package，快 3-10 倍

**何时做**：Phase 0 月 1 W4

---

### 3.6 测试金字塔

**学谁**：[Astro 项目](https://github.com/withastro/astro)

**核心**：他们的测试组织是工业级

- e2e Playwright
- 集成 vitest
- 单元 vitest
- 类型测试 vitest typecheck

**当前差距**：我们没有单元测试 / 类型测试

**何时做**：Phase 0 月 3 W12

---

### 3.7 设计系统 / Storybook

**学谁**：[shadcn/ui](https://github.com/shadcn-ui/ui) 的组件库

**核心**：组件如何文档化 + 单独可测

**何时做**：Phase 0 月 2 W6

---

## 4. 关键技术深度学习

### 4.1 React Three Fiber（3D）

- **官方**：https://docs.pmnd.rs/react-three-fiber/
- **范例**：[lamina-examples](https://github.com/pmndrs/lamina) / [r3f-examples](https://github.com/pmndrs/react-three-fiber/tree/master/examples)
- **教程**：YouTube "Bruno Simon" 的 Three.js 课程

### 4.2 Edge Runtime

- **官方**：https://nextjs.org/docs/app/api-reference/edge
- **学**：哪些路由可以 Edge（不能用 Node API）

### 4.3 Server Actions

- **官方**：https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- **关键**：CSRF / 序列化 / 流式响应

### 4.4 PWA / Service Worker

- **学谁**：[next-pwa](https://github.com/shadowwalker/next-pwa)
- **范例**：[Workbox 官方](https://web.dev/learn/pwa/)

---

## 5. 多 Agent / 自动化

### 5.1 现状评估

| 框架                             | 当前成熟度 | 推荐用                             |
| -------------------------------- | ---------- | ---------------------------------- |
| MetaGPT                          | 实验       | ❌ 还不稳                          |
| CrewAI                           | beta       | ❌ 跑大项目易崩                    |
| AutoGen                          | alpha      | ❌ 微软内部尚未 GA                 |
| OpenHands                        | beta       | 🟡 可玩，不能依赖                  |
| LangGraph                        | stable     | 🟡 工作流编排不错，但 dev 流程不强 |
| **Cursor / Kiro / Cline 多窗口** | 成熟       | ✅ **目前最稳**                    |

**结论**：手动多窗口 + 我（Kiro）的方案当前最适合。

### 5.2 半自动化可能性

如果你想做轻度自动化，我能帮你写：

```javascript
// scripts/coordinator.mjs
import { execSync } from 'node:child_process'

const worktrees = ['critical-fe', 'critical-be', 'critical-sec', 'critical-content']

// 每天结束跑一次
for (const wt of worktrees) {
  const status = execSync(`cd ../${wt} && git status -s`).toString()
  const log = execSync(`cd ../${wt} && git log --oneline -5`).toString()
  console.log(`\n=== ${wt} ===\n${status}\n${log}`)
}

// 然后 fetch + 显示全局图
execSync('git fetch --all --prune')
execSync('git log --all --oneline --graph -30', { stdio: 'inherit' })
```

跑一下你就有全局视图。

### 5.3 完全自动化的未来

1-2 年内会成熟。届时方案：

- 每个 worktree 跑独立 Claude Code agent
- 有个 orchestrator agent 负责调度 + 冲突仲裁
- GitHub Actions + LLM = 自动 PR review + 自动合并

但**现在还达不到生产级**。

---

## 6. 学习节奏建议

### 月 1 W1（这周，立刻看）

1. Cal.com 的 monorepo 结构 + i18n（2 小时）
2. Dub 的营销 Hero（30 分钟）
3. shadcn/taxonomy 的 Empty State（30 分钟）

### 月 1 W2-W4（边做安全 / 后端边看）

1. Documenso 的邮件模板（1 小时，做我们邮件升级时看）
2. Cal.com 的限速实现（30 分钟）

### 月 2（边做 3D / AI 边看）

1. Bruno Simon Three.js 课程前 3 小时（精选）
2. R3F 官方 examples 浏览

### 月 3（上线前）

1. Vercel Commerce 的 cache 策略
2. PostHog 的 CI 设计

---

## 7. 不要看的（避坑）

| 项目                       | 为什么不看                      |
| -------------------------- | ------------------------------- |
| Strapi / Directus          | CMS 太重，我们不需要            |
| WordPress / Drupal         | 完全不同范式                    |
| 任何 "Next.js boilerplate" | 大部分质量低，学不到东西        |
| AI generated 代码          | 缺一致性，看了带歪              |
| 公司内部"前端架构"博客     | 90% 是吹牛 PR，提取不出有用模式 |

---

## 8. 学习方法论

### 不要一次看完一个项目

**抓重点**：每个项目找 3-5 个文件深读，剩下 skim。

### 边看边做笔记

- `docs/learnings/cal-com.md` 记你学到的
- 实际想用到我们项目的，立即开 issue

### 不要照搬

- 他们的架构服务他们的需求
- 我们抄思想，不抄代码
- 抄前问"我们真的需要这个吗"

### 跟原作者

- Cal.com 的 Peer Richelsen
- Dub 的 Steven Tey
- shadcn/ui 的 shadcn

他们的 Twitter 比博客有营养。

---

## 9. 代码风格借鉴优先级

按代码质量从高到低：

1. **Vercel 系**（vercel/commerce, vercel/next.js examples）
2. **shadcn 系**（shadcn-ui/ui, shadcn-ui/taxonomy）
3. **Cal.com**
4. **Dub**
5. **Astro**（不同栈但模式可借）

---

## 10. 反向工程目标

学完后能做到：

- ✅ 看一段 Next.js 14 代码立刻知道是不是最佳实践
- ✅ 设计 API 时能选对 REST vs tRPC vs Server Actions
- ✅ 邮件 / 限速 / 缓存 / 实时 / 队列 各有现成最佳方案
- ✅ Code review 时能精准指出"这里为什么不好"

> 站在巨人的肩膀上，但不要被巨人压住。
> 这些项目都是工具，最终要做的是 Critical 自己的样子。
