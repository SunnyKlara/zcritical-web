import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: '隐私政策',
  description: 'Critical 隐私政策 — 我们如何收集、使用和保护您的个人信息',
  robots: { index: true, follow: true },
}

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale)
  const lastUpdated = '2026 年 5 月 26 日'

  return (
    <main id="main-content" className="relative">
      <Navbar />

      <article className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              隐私<span className="text-gradient">政策</span>
            </h1>
            <p className="text-sm text-gray-500">最后更新：{lastUpdated}</p>
          </header>

          <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. 概述</h2>
              <p>
                Critical（以下简称&ldquo;我们&rdquo;）尊重并保护用户的隐私。本政策说明我们如何收集、使用、存储和保护您的个人信息。使用我们的产品或服务即表示您同意本政策的条款。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. 收集的信息</h2>
              <p className="mb-3">我们仅在必要时收集以下信息：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>
                  <strong className="text-gray-300">联系信息</strong>
                  ：填写询盘表单时的姓名、邮箱、公司、电话（可选）
                </li>
                <li>
                  <strong className="text-gray-300">订单信息</strong>
                  ：购买时的收货地址、邮箱、订单详情
                </li>
                <li>
                  <strong className="text-gray-300">设备数据</strong>
                  ：设备激活时的序列号、固件版本、硬件版本（用于售后支持和 OTA 升级）
                </li>
                <li>
                  <strong className="text-gray-300">技术信息</strong>：访问网站时自动收集的 IP
                  地址、浏览器类型、访问时间
                </li>
                <li>
                  <strong className="text-gray-300">Cookie</strong>：用于会话管理、CSRF
                  防护和网站功能
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. 信息使用</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>响应您的咨询和订单</li>
                <li>处理付款和发货</li>
                <li>提供售后服务和技术支持</li>
                <li>推送 OTA 固件更新</li>
                <li>改进产品和服务（基于聚合的、匿名的使用数据）</li>
                <li>遵守法律法规要求</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. 信息共享</h2>
              <p>我们不会出售、出租或交换您的个人信息。仅在以下情况下共享：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
                <li>支付服务商（如 PayPal）— 仅传递订单金额和必要信息</li>
                <li>物流服务商 — 仅传递收货地址和订单号</li>
                <li>云服务商（MongoDB Atlas、Render、Cloudflare）— 用于数据存储和应用托管</li>
                <li>邮件服务商 — 用于发送订单通知</li>
                <li>法律要求或保护权益时</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. 数据安全</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>所有传输使用 HTTPS 加密</li>
                <li>密码使用 bcrypt 算法哈希存储</li>
                <li>身份验证使用 JWT 双 token 机制</li>
                <li>CSRF 双提交 cookie 防护</li>
                <li>定期进行安全审计</li>
                <li>支付信息由 PayPal 处理，我们不接触卡号</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. 您的权利</h2>
              <p className="mb-3">您有权：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>访问和导出您的个人数据</li>
                <li>更正不准确的信息</li>
                <li>要求删除您的数据（&ldquo;被遗忘权&rdquo;）</li>
                <li>反对或限制特定数据处理</li>
                <li>撤回同意</li>
              </ul>
              <p className="mt-3">
                如需行使上述权利，请联系{' '}
                <a href="mailto:privacy@critical.bike" className="text-primary hover:underline">
                  privacy@critical.bike
                </a>
                。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. 数据保留</h2>
              <p>
                询盘数据保留 3 年；订单数据保留 7 年（满足税务和会计法规要求）；操作审计日志保留 1
                年。账户注销后数据将在 30 天内匿名化或删除。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. 国际数据传输</h2>
              <p>
                Critical 服务器部署在新加坡，数据库托管于 MongoDB
                Atlas（新加坡）。如您从中国大陆以外地区访问，您的数据将传输至新加坡处理。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. 政策变更</h2>
              <p>
                我们可能会更新本隐私政策。重大变更会通过邮件通知或在网站显著位置提示。继续使用服务即表示接受更新后的政策。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. 联系我们</h2>
              <p>如对本隐私政策有任何疑问，请通过以下方式联系：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
                <li>
                  邮箱：
                  <a
                    href="mailto:privacy@critical.bike"
                    className="text-primary hover:underline ml-1"
                  >
                    privacy@critical.bike
                  </a>
                </li>
                <li>
                  客服：
                  <a
                    href="mailto:support@critical.bike"
                    className="text-primary hover:underline ml-1"
                  >
                    support@critical.bike
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}
