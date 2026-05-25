'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  Filter,
  Inbox,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useAuth, authFetch } from '@/lib/auth-context'
import type { LEAD_STATUSES } from '@critical/shared'

type LeadStatus = (typeof LEAD_STATUSES)[number]

interface Lead {
  _id: string
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  source?: string
  locale?: string
  status: LeadStatus
  notes?: string
  createdAt: string
}

const STATUS_CONFIG: Record<
  LeadStatus,
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

export default function AdminLeadsPage() {
  const router = useRouter()
  const { user, accessToken, loading, refresh } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    setLeadsLoading(true)
    const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`
    authFetch<Lead[]>(`/api/leads${query}`, {}, { accessToken, refresh })
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLeadsLoading(false))
  }, [user, accessToken, refresh, statusFilter])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = leads.filter((lead) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company?.toLowerCase().includes(q) ||
      lead.message.toLowerCase().includes(q)
    )
  })

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold">询盘管理</h1>
          <span className="text-xs text-gray-500">{filtered.length} 条</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索姓名 / 邮箱 / 公司 / 留言..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <FilterChip
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              label="全部"
            />
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((status) => (
              <FilterChip
                key={status}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                label={STATUS_CONFIG[status].label}
              />
            ))}
          </div>
        </motion.div>

        {/* List */}
        {leadsLoading ? (
          <div className="glass-card p-12 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">没有匹配的询盘</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/5">
              {filtered.map((lead) => {
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
                    key={lead._id}
                    href={`/admin/leads/${lead._id}`}
                    className="block p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-sm text-primary font-medium">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-white">{lead.name}</span>
                          {lead.company && (
                            <span className="text-xs text-gray-500">· {lead.company}</span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${config.color}`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-600 ml-auto">{date}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1.5">{lead.email}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{lead.message}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
        active
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}
