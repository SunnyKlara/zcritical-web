# Subresource Integrity (SRI) 政策

> **目前状态**：Critical 不外链任何第三方 script / link 资源，所以 SRI 暂时无可应用对象。本文档存在的目的是确立一条**红线**：将来引入任何 CDN-hosted 资源时必须按本流程附加 SRI。
>
> 持有人：W4

---

## 现状盘点

`grep -rE 'https?://.*\.(js|css)' frontend/src` 查全部 frontend 源码：

- 没有 `<script src="https://...">`
- 没有 `<link rel="stylesheet" href="https://...">`
- Tailwind 通过本地构建注入，不走 CDN
- next/font 把 Google Fonts 烘到 `_next/static`，不走 fonts.googleapis.com 实时
- 所有 JS bundle 通过 Vercel 自家 origin

**结论**：Critical 当前不需要 SRI，因为没有外链资源。CSP `script-src` 已经禁止任何非 self / nonce-marked 来源。

---

## 触发条件（什么时候必须加 SRI）

任何一个 PR 引入下面任一情况时：

1. `<script src="https://cdn.jsdelivr.net/...">`
2. `<script src="https://unpkg.com/...">`
3. `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/...">`
4. 内嵌 PayPal SDK / Stripe SDK 这类厂商 CDN（注：当前 PayPal SDK 已经按需加载，不在 HTML 中硬编码）
5. 任何走 `unpkg / jsdelivr / cdnjs` 等公共 CDN 的资源

→ **必须** 在该 `<script>` / `<link>` 标签上加：

```html
<script
  src="https://example.com/lib@1.2.3/dist/lib.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

---

## 怎么生成 integrity 值

```bash
# Linux / macOS
curl -s https://example.com/lib@1.2.3/dist/lib.min.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
# 拿到的字符串前面加 "sha384-" 就是 integrity 值
```

或在线工具：https://www.srihash.org/

---

## 设计审查的红线

PR review 必须拒绝：

- ❌ 外链 `*.js` / `*.css` **未带** integrity 属性
- ❌ integrity 用 sha1（已不安全）→ 必须 sha384 或 sha512
- ❌ 没有 `crossorigin="anonymous"`（少了它会让浏览器把跨源请求 fallback 到不带 cookie 的请求，Subresource Integrity 才能拿 raw 字节做哈希）

Semgrep 规则建议（待实施）：

```yaml
- id: external-script-without-sri
  message: External script tag without integrity hash — supply-chain risk.
  severity: ERROR
  languages: [html, typescript, javascript]
  pattern-either:
    - pattern: |
        <script src="https://$CDN/$PATH" />
    - pattern: |
        <link rel="stylesheet" href="https://$CDN/$PATH" />
  pattern-not-either:
    - pattern: integrity="sha384-...
    - pattern: integrity="sha512-...
```

→ 后续加到 `.semgrep.yml` 当我们有真实 case 时再启用，否则会全 false negative。

---

## 例外（少数允许的）

- **Google Fonts 不走 CDN**：用 `next/font/google` 让 Next 把字体下载到 `_next/static`，本质上变成 self-hosted。无需 SRI。
- **Sentry**：用 npm 包 + bundler 打到 self origin，不外链 sentry CDN。
- **PayPal SDK**：按点击 CTA 时 lazy-load，挂到 `<script src="https://www.paypal.com/sdk/js?client-id=...">`。**注意**：PayPal SDK 不能加 SRI（每次注入的 url 不一样，hash 会变）。这个属于"已知不能加，靠 CSP `script-src https://www.paypal.com` 限制来源"。在 PR review 时记上这条 exception。

当前 CSP 配置已经通过 `script-src 'self' 'nonce-...' 'strict-dynamic' https:` 给了一个上界：任何被注入的脚本都必须是 nonce-marked 或来自合法 self / https 来源。

---

## 相关

- OWASP Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html
- W3C SRI spec: https://www.w3.org/TR/SRI/
- 触发 RFC：将 SRI 自动化加入 CI 时（Semgrep / OWASP Dependency-Track）需要走 RFC 流程
