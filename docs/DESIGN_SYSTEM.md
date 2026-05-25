# Critical Design System

> 品牌调性：科技感 · 速度感 · 沉浸感
> 参考风格：Tesla（简洁）+ Razer（暗色科技）+ Apple（产品展示）

---

## 配色方案

### 背景层级

| Token      | 值        | 用途        |
| ---------- | --------- | ----------- |
| `dark-950` | `#0A0A0A` | 最深背景    |
| `dark-900` | `#0A0A0F` | 页面背景    |
| `dark-850` | `#0F0F1A` | 微妙层级    |
| `dark-800` | `#12121A` | 卡片背景    |
| `dark-700` | `#1A1A2E` | 区块强调    |
| `dark-600` | `#222230` | 边框/分割线 |

页面整体使用 `#0A0A0A → #1A1A2E` 纵向渐变（`background-attachment: fixed`）。

### 品牌色

| Token           | 值        | 用途                     |
| --------------- | --------- | ------------------------ |
| `primary`       | `#00D4FF` | 电光蓝 — CTA、高亮、灯效 |
| `primary-dark`  | `#00A3CC` | 按下/深色变体            |
| `primary-light` | `#66E5FF` | Hover 亮色变体           |
| `accent`        | `#FF3B30` | 赛车红 — 速度相关        |
| `accent-dark`   | `#CC2F26` | 红色深色变体             |

### 文字层级

| Token            | 值        | 用途           |
| ---------------- | --------- | -------------- |
| `text-primary`   | `#FFFFFF` | 标题、重要文字 |
| `text-secondary` | `#A0A0B0` | 正文、描述     |
| `text-tertiary`  | `#6B6B80` | 辅助信息       |
| `text-muted`     | `#4A4A5A` | 占位/禁用      |

### 表面/玻璃效果

| Token      | 值                                               |
| ---------- | ------------------------------------------------ |
| 卡片背景   | `rgba(255,255,255,0.05)` + `backdrop-blur(12px)` |
| 卡片 Hover | `rgba(255,255,255,0.08)`                         |
| 边框       | `rgba(255,255,255,0.1)`                          |
| 边框 Hover | `rgba(255,255,255,0.15)`                         |

---

## 字体

| 用途      | 字体                 | Weight  | CSS Variable                          |
| --------- | -------------------- | ------- | ------------------------------------- |
| 标题      | Inter + Noto Sans SC | 700     | `--font-inter`, `--font-noto-sans-sc` |
| 正文      | Inter + Noto Sans SC | 400     | 同上                                  |
| 数字/参数 | JetBrains Mono       | 400-700 | `--font-jetbrains-mono`               |

Tailwind 使用：

- `font-sans` — 标题和正文
- `font-mono` — 技术参数、数字
- `font-display` — 超大标题

---

## 间距系统

| Token        | 桌面   | 移动 |
| ------------ | ------ | ---- |
| Section 间距 | 120px  | 80px |
| 卡片间距     | 24px   | 16px |
| 内容最大宽度 | 1200px | 100% |

Tailwind 使用：`py-section-desktop` / `py-section-mobile`，或 CSS 变量 `var(--section-spacing)`。

---

## 动效原则

### 入场动画

- 方向：从下方 20px 淡入
- 时长：0.6s
- 缓动：`ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`)
- 触发：Intersection Observer, `threshold: 0.2`, `once: true`

### Hover 交互

- 缩放：`scale(1.02)`
- 阴影加深
- 过渡：0.3s `ease`
- 仅使用 `transform` + `opacity`（GPU 合成层）

### 性能规则

- ✅ 优先 `transform` / `opacity`（不触发 layout/paint）
- ✅ 使用 `will-change` 仅在动画激活时
- ❌ 避免动画 `width` / `height` / `top` / `left`
- ❌ 避免 `layout thrashing`（读写交替）

### 无障碍

- 尊重 `prefers-reduced-motion: reduce`
- JS 加载失败时内容仍可见（`@media (scripting: none)` 回退）

---

## Tailwind 工具类速查

```
.text-gradient          — 品牌蓝渐变文字
.text-gradient-accent   — 赛车红渐变文字
.glow-primary           — 蓝色辉光
.glow-primary-strong    — 强蓝色辉光
.glow-accent            — 红色辉光
.glass                  — 玻璃导航栏
.glass-card             — 玻璃卡片（含 hover 效果）
.btn-primary            — 主 CTA 按钮
.btn-ghost              — 幽灵/描边按钮
.section-padding        — 响应式 section 间距
.content-container      — 内容容器（max-width + padding）
.text-spec              — 等宽数字文字
```

---

## 文件结构

```
tailwind.config.ts      — 所有 design tokens 定义
src/app/globals.css     — CSS 变量 + 工具类 + 动画关键帧
src/app/layout.tsx      — 字体加载配置
```
