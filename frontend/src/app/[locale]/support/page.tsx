'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { FAQSchema, BreadcrumbSchema } from '@/components/seo/StructuredData'
import { ChevronDown, MessageCircle, Mail, HelpCircle } from 'lucide-react'

const faqCategories = [
  {
    title: '蓝牙连接',
    icon: HelpCircle,
    questions: [
      {
        q: '如何连接 Critical 设备？',
        a: '打开 Critical APP，确保设备已通电。进入「设备」页面，点击「扫描」按钮，在列表中找到你的设备（名称格式为 Critical-XXXX），点击即可配对连接。首次连接可能需要 5-10 秒。',
      },
      {
        q: '蓝牙连接不上怎么办？',
        a: '1. 确认设备已通电且指示灯亮起\n2. 确保手机蓝牙已开启\n3. 将手机靠近设备（3米以内）\n4. 尝试重启设备和 APP\n5. 如果仍无法连接，长按设备旋钮 5 秒恢复出厂设置',
      },
      {
        q: '可以同时连接多台设备吗？',
        a: '当前版本 APP 仅支持同时连接一台 Critical 设备。如需切换设备，请先断开当前连接。',
      },
    ],
  },
  {
    title: '固件升级',
    icon: HelpCircle,
    questions: [
      {
        q: '如何升级固件？',
        a: '推荐方式：打开 APP → 连接设备 → 进入「设置」→「固件升级」，APP 会自动检测新版本并引导升级。升级过程约 1-2 分钟，期间请勿断电。',
      },
      {
        q: '升级失败怎么办？',
        a: 'Critical 采用双分区 + Rollback 保护机制，升级失败会自动回滚到上一个稳定版本。如果设备无响应，请断电重启，设备会自动恢复。',
      },
      {
        q: '可以手动刷固件吗？',
        a: '可以。前往「固件更新日志」页面下载 .bin 固件文件，通过 USB-C 连接电脑，使用 esptool 或 ESP Flash Download Tool 进行刷写。仅建议有经验的用户操作。',
      },
    ],
  },
  {
    title: '灯效与音效',
    icon: HelpCircle,
    questions: [
      {
        q: '灯效有哪些模式？',
        a: '共 8 种动态灯效模式：转速条、脉冲、追逐、交替、波浪、闪电、风浪联动、舞台灯光秀。每种模式支持 14 色预设或自定义 RGB 颜色。',
      },
      {
        q: '如何让灯效跟随油门变化？',
        a: '在 APP 的「Colorize」模式中，选择任意灯效后开启「油门联动」开关。灯效的速度和亮度会实时响应油门/速度变化。',
      },
      {
        q: '引擎音效如何切换？',
        a: '在 APP 的「Running」模式中，点击音效图标可选择不同引擎声浪。音效会根据速度实时变化，支持 5 层混音交叉淡入。',
      },
    ],
  },
  {
    title: 'WiFi 音频',
    icon: HelpCircle,
    questions: [
      {
        q: '如何使用 WiFi 音频投射？',
        a: '在 APP 中进入「音频投射」页面，确保手机和 Critical 设备在同一 WiFi 网络下。点击「开始投射」，手机播放的音乐将实时推流到设备扬声器。',
      },
      {
        q: '音频延迟大怎么办？',
        a: 'WiFi 音频延迟通常在 50-100ms。如果延迟明显，请检查 WiFi 信号强度，尽量减少路由器与设备之间的障碍物。5GHz WiFi 不支持，请使用 2.4GHz 频段。',
      },
    ],
  },
]

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-expanded={open}
      >
        <span
          className={`text-sm font-medium transition-colors ${open ? 'text-primary' : 'text-gray-200 group-hover:text-white'}`}
        >
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-4' : 'max-h-0'}`}
      >
        <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{answer}</div>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const faqItems = faqCategories.flatMap((cat) =>
    cat.questions.map((q) => ({ question: q.q, answer: q.a })),
  )

  return (
    <main id="main-content" className="relative">
      <FAQSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: '首页', url: '/' },
          { name: '使用帮助', url: '/support' },
        ]}
      />
      <Navbar />

      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              使用<span className="text-gradient">帮助</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              常见问题解答，帮助你快速上手 Critical
            </p>
          </motion.div>

          <div className="space-y-8">
            {faqCategories.map((category, i) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {category.title}
                </h2>
                <div>
                  {category.questions.map((item) => (
                    <AccordionItem key={item.q} question={item.q} answer={item.a} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 text-center"
          >
            <h2 className="text-xl font-bold mb-4">没有找到答案？</h2>
            <p className="text-gray-400 mb-6">联系我们的技术支持团队，我们会尽快回复</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:support@zcritical.co" className="btn-ghost">
                <Mail className="w-4 h-4" />
                邮件支持
              </a>
              <a href="#" className="btn-ghost">
                <MessageCircle className="w-4 h-4" />
                在线客服
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
