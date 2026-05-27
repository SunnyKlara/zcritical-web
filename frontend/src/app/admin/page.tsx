'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Inbox,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageCircle,
  Package,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useAuth, authFetch } from '@/lib/auth-context'

interface Lead {
  _id: string
  name: string
  email: string
  message: string
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  createdAt: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, accessToken, loading, logout, refresh } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    authFetch<Lead[]>('/api/leads?limit=10', {}, { accessToken, refresh })
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLeadsLoading(false))
  }, [user, accessToken, refresh])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const newLeadsCount = leads.filter((l) => l.status === 'new').length
  const contactedCount = leads.filter((l) => l.status === 'contacted').length
  const wonCount = leads.filter((l) => l.status === 'won').length

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">C</span>
            </div>
            <div>
              <p className="text-sm font-bold tracking-wider">CRITICAL</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:border-white/30 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">订单</span>
            </Link>
            <Link
              href="/admin/chat"
              className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:border-white/30 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">客服</span>
            </Link>
            <Link
              href="/admin/security"
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
                user.totpEnabled
                  ? 'border-green-500/30 text-green-400 hover:border-green-500/50'
                  : 'border-amber-500/30 text-amber-400 hover:border-amber-500/50'
              }`}
              title={user.totpEnabled ? '2FA 已启用' : '建议启用 2FA'}
            >
              {user.totpEnabled ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">安全</span>
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white">{user.displayName || user.username}</p>
              <p className="text-[10px] text-gray-500 capitalize">{user.role}</p>
            </div>
            <button
              onClick={async () => {
                await logout()
                router.push('/admin/login')
              }}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-400 hover:border-white/30 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold mb-1">欢迎回来，{user.displayName || user.username}</h1>
          <p className="text-sm text-gray-500">这里是 Critical 管理控制台</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard label="新询盘" value={newLeadsCount} icon={Inbox} color="text-primary" />
          <StatCard label="跟进中" value={contactedCount} icon={Clock} color="text-amber-400" />
          <StatCard label="已成交" value={wonCount} icon={CheckCircle2} color="text-green-400" />
          <StatCard
            label="转化率"
            value={leads.length > 0 ? `${Math.round((wonCount / leads.length) * 100)}%` : '—'}
            icon={TrendingUp}
            color="text-blue-400"
          />
        </motion.div>

        {/* Recent leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">最近询盘</h2>
            <Link
              href="/admin/leads"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              查看全部
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            {leadsLoading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无询盘</p>
                <p className="text-xs text-gray-600 mt-1">访客提交联系表单后会显示在这里</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {leads.slice(0, 5).map((lead) => (
                  <LeadRow key={lead._id} lead={lead} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

const STATUS_CONFIG: Record<
  Lead['status'],
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  new: { label: '新', color: 'bg-primary/10 text-primary border-primary/30', icon: Inbox },
  contacted: {
    label: '跟进中',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: Clock,
  },
  qualified: {
    label: '意向',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: TrendingUp,
  },
  won: {
    label: '成交',
    color: 'bg-green-500/10 text-green-400 border-green-500/30',
    icon: CheckCircle2,
  },
  lost: { label: '流失', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: XCircle },
}

function LeadRow({ lead }: { lead: Lead }) {
  const config = STATUS_CONFIG[lead.status]
  const Icon = config.icon
  const date = new Date(lead.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link
      href={`/admin/leads/${lead._id}`}
      className="block p-4 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-sm text-primary font-medium">
          {lead.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-white">{lead.name}</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${config.color}`}
            >
              <Icon className="w-2.5 h-2.5" />
              {config.label}
            </span>
            <span className="text-xs text-gray-600 ml-auto">{date}</span>
          </div>
          <p className="text-xs text-gray-500 mb-1">{lead.email}</p>
          <p className="text-xs text-gray-400 line-clamp-1">{lead.message}</p>
        </div>
      </div>
    </Link>
  )
}
