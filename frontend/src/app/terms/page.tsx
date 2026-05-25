import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: '用户协议',
  description: 'Critical 用户服务协议',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  const lastUpdated = '2026 年 5 月 26 日'

  return (
    <main id="main-content" className="relative">
      <Navbar />

      <article className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              用户<span className="text-gradient">协议</span>
            </h1>
            <p className="text-sm text-gray-500">最后更新：{lastUpdated}</p>
          </header>

          <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">
            <Section title="1. 协议接受">
              通过访问或使用 Critical 网站、APP
              或相关产品（以下统称&ldquo;服务&rdquo;），您即表示已阅读、理解并同意受本协议约束。如您不同意本协议任何条款，请勿使用本服务。
            </Section>

            <Section title="2. 服务说明">
              <p>Critical 是一款智能风洞模拟器，包括硬件设备、配套 APP 和云端服务。我们提供：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
                <li>硬件产品销售</li>
                <li>APP 软件下载与使用</li>
                <li>OTA 固件升级服务</li>
                <li>客户服务与技术支持</li>
                <li>产品保修服务</li>
              </ul>
            </Section>

            <Section title="3. 用户行为">
              <p>使用本服务时，您同意：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
                <li>提供真实、准确、完整的信息</li>
                <li>不上传违法、侵权或恶意内容</li>
                <li>不试图破解、逆向工程或干扰服务</li>
                <li>不利用服务进行违法活动</li>
                <li>遵守所在地区的法律法规</li>
              </ul>
            </Section>

            <Section title="4. 知识产权">
              <p>
                Critical 网站、产品、APP、固件、文档及所有相关知识产权归 Critical
                及其许可人所有，受著作权、商标权、专利权及其他法律保护。未经书面授权，您不得复制、修改、分发或商业使用任何内容。
              </p>
              <p className="mt-3">
                您上传的自定义内容（如 Logo、灯效配置）仍归您所有，但您授予 Critical
                在提供服务范围内使用的非独占许可。
              </p>
            </Section>

            <Section title="5. 订单与支付">
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>所有商品价格以美元（USD）显示，最终以下单时显示为准</li>
                <li>订单创建后 30 分钟内未付款将自动取消</li>
                <li>支付通过 PayPal 处理，受 PayPal 服务条款约束</li>
                <li>我们保留拒绝可疑订单的权利</li>
              </ul>
            </Section>

            <Section title="6. 物流与配送">
              <ul className="list-disc list-inside space-y-2 text-gray-400">
                <li>支持的目的地见结算页国家选择</li>
                <li>预计配送时间：7-15 个工作日（视目的国而定）</li>
                <li>运费根据目的国不同，详见结算页</li>
                <li>关税和进口税由收件人承担（如适用）</li>
              </ul>
            </Section>

            <Section title="7. 退换货政策">
              <p>
                自收到商品起 14
                天内，未拆封商品可申请退货退款（退回运费由买家承担）。已拆封但功能正常的商品恕不接受退货。
              </p>
              <p className="mt-3">
                因质量问题导致的退换货，由 Critical 承担运费。请在 30 天内联系{' '}
                <a href="mailto:support@critical.bike" className="text-primary hover:underline">
                  support@critical.bike
                </a>{' '}
                申请。
              </p>
            </Section>

            <Section title="8. 保修">
              <p>
                硬件产品自购买之日起享有 12
                个月有限保修，覆盖正常使用下的制造缺陷。以下情况不在保修范围：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
                <li>人为损坏、跌落、进水</li>
                <li>未经授权的拆解或改装</li>
                <li>非正常使用环境（如高温、高湿）</li>
                <li>正常磨损（如外壳划痕）</li>
              </ul>
            </Section>

            <Section title="9. 责任限制">
              在法律允许的最大范围内，Critical
              对因使用或无法使用本服务造成的间接、特殊、附带或后果性损害不承担责任。任何情况下，Critical
              的总责任不超过您过去 12 个月内为相关产品支付的金额。
            </Section>

            <Section title="10. 免责声明">
              Critical
              服务按&ldquo;现状&rdquo;提供。我们不保证服务始终可用、无错误或满足特定需求。OTA
              升级、第三方集成等可能受外部因素影响。
            </Section>

            <Section title="11. 协议修改">
              我们保留随时修改本协议的权利。重大修改会提前通知。继续使用服务即表示接受修改后的条款。
            </Section>

            <Section title="12. 适用法律">
              本协议受中华人民共和国法律管辖（不含冲突法规则）。因本协议产生的争议应优先协商解决；协商不成的，提交至
              Critical 主营业地有管辖权的法院。
            </Section>

            <Section title="13. 联系方式">
              如对本协议有疑问，请联系{' '}
              <a href="mailto:legal@critical.bike" className="text-primary hover:underline">
                legal@critical.bike
              </a>
              。
            </Section>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      {typeof children === 'string' ? <p>{children}</p> : children}
    </section>
  )
}
