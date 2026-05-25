'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Building, Globe, Calendar, Save, CheckCircle2 } from 'lucide-react'
import { useAuth, authFetch } from '@/lib/auth-context'
import { LEAD_STATUSES } from '@critical/shared'

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
  updatedAt: string
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: '新',
  contacted: '跟进中',
  qualified: '有意向',
  won: '已成交',
  lost: '已流失',
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { user, accessToken, loading: authLoading, refresh } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeadStatus>('new')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/admin/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || !params.id) return
    authFetch<Lead[]>(`/api/leads`, {}, { accessToken, refresh })
      .then((leads) => {
        const found = leads.find((l) => l._id === params.id)
        if (found) {
          setLead(found)
          setStatus(found.status)
          setNotes(found.notes ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user, accessToken, refresh, params.id])

  async function handleSave() {
    if (!lead) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await authFetch<Lead>(
        `/api/leads/${lead._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, notes }),
        },
        { accessToken, refresh },
      )
      setLead(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!lead) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-dark-900">
        <p className="text-gray-400 mb-4">询盘不存在</p>
        <Link href="/admin/leads" className="btn-ghost">
          返回列表
        </Link>
      </main>
    )
  }

  const createdAt = new Date(lead.createdAt).toLocaleString('zh-CN')
  const updatedAt = new Date(lead.updatedAt).toLocaleString('zh-CN')

  return (
    <main className="min-h-screen bg-dark-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin/leads"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold">询盘详情</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Contact info */}
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-card p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl text-primary font-medium">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{lead.name}</h2>
                  {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={Mail}
                  label="邮箱"
                  value={lead.email}
                  link={`mailto:${lead.email}`}
                />
                {lead.phone && (
                  <InfoRow
                    icon={Phone}
                    label="电话"
                    value={lead.phone}
                    link={`tel:${lead.phone}`}
                  />
                )}
                {lead.company && <InfoRow icon={Building} label="公司" value={lead.company} />}
                {lead.source && <InfoRow icon={Globe} label="来源" value={lead.source} />}
                {lead.locale && <InfoRow icon={Globe} label="语言" value={lead.locale} />}
                <InfoRow icon={Calendar} label="提交时间" value={createdAt} />
                {createdAt !== updatedAt && (
                  <InfoRow icon={Calendar} label="最后更新" value={updatedAt} />
                )}
              </div>
            </section>

            <section className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">留言内容</h3>
              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                {lead.message}
              </p>
            </section>
          </div>

          {/* Right: Status + notes */}
          <div className="space-y-6">
            <section className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">状态</h3>
              <div className="space-y-2">
                {LEAD_STATUSES.map((s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      status === s
                        ? 'bg-primary/10 border border-primary/30'
                        : 'border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="sr-only"
                    />
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        status === s ? 'border-primary bg-primary' : 'border-gray-600'
                      }`}
                    />
                    <span className={`text-sm ${status === s ? 'text-white' : 'text-gray-400'}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">备注</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="跟进记录、客户偏好等..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </section>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存修改
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  link?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        {link ? (
          <a href={link} className="text-sm text-primary hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm text-white break-all">{value}</p>
        )}
      </div>
    </div>
  )
}
