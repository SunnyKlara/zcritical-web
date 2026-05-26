'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth, authFetch } from '@/lib/auth-context'
import { formatCents } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface OrderDetail {
  _id: string
  orderNo: string
  email: string
  status: string
  items: { sku: string; name: string; price: number; quantity: number; image: string }[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }
  payment: {
    method: string
    paypalOrderId?: string
    paypalCaptureId?: string
    paidAt?: string
  }
  fulfillment?: { carrier?: string; trackingNo?: string; trackingUrl?: string; shippedAt?: string }
  notes?: string
  createdAt: string
}

interface PaymentEvent {
  _id: string
  event: string
  providerId: string
  amount: number
  createdAt: string
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { user, accessToken, loading: authLoading, refresh } = useAuth()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showShipForm, setShowShipForm] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/admin/login')
  }, [authLoading, user, router])

  async function load() {
    if (!user || !params.id) return
    setLoading(true)
    try {
      const data = await authFetch<{ order: OrderDetail; events: PaymentEvent[] }>(
        `/api/admin/orders/${params.id}`,
        {},
        { accessToken, refresh },
      )
      setOrder(data.order)
      setEvents(data.events)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user])

  async function handleShip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!order) return
    const fd = new FormData(e.currentTarget)
    try {
      const updated = await authFetch<OrderDetail>(
        `/api/admin/orders/${order._id}/ship`,
        {
          method: 'POST',
          body: JSON.stringify({
            carrier: String(fd.get('carrier') || ''),
            trackingNo: String(fd.get('trackingNo') || ''),
            trackingUrl: String(fd.get('trackingUrl') || '') || undefined,
          }),
        },
        { accessToken, refresh },
      )
      setOrder(updated)
      setShowShipForm(false)
      setActionMsg('Shipped successfully')
      setTimeout(() => setActionMsg(''), 3000)
      void load()
    } catch (err) {
      console.error(err)
      setActionMsg('Failed to ship')
    }
  }

  async function handleRefund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!order) return
    const fd = new FormData(e.currentTarget)
    const amountDollars = parseFloat(String(fd.get('amount') || '0'))
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) return
    if (!confirm(`确认退款 $${amountDollars.toFixed(2)}? 此操作不可撤销。`)) return
    try {
      const updated = await authFetch<OrderDetail>(
        `/api/admin/orders/${order._id}/refund`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Math.round(amountDollars * 100),
            reason: String(fd.get('reason') || '') || undefined,
          }),
        },
        { accessToken, refresh },
      )
      setOrder(updated)
      setShowRefundForm(false)
      setActionMsg('Refunded successfully')
      setTimeout(() => setActionMsg(''), 3000)
      void load()
    } catch (err) {
      console.error(err)
      setActionMsg('Refund failed')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-dark-900">
        <p className="text-gray-400 mb-4">订单不存在</p>
        <Link href="/admin/orders" className="btn-ghost">
          返回列表
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">订单详情</h1>
            <p className="text-xs text-primary font-mono">{order.orderNo}</p>
          </div>
          <Badge tone={order.status === 'paid' ? 'primary' : 'neutral'}>{order.status}</Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {actionMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" aria-hidden />
            {actionMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">商品</h2>
              <ul className="divide-y divide-white/5">
                {order.items.map((item, i) => (
                  <li key={i} className="py-3 flex justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{formatCents(item.price)}</p>
                      <p className="text-xs text-gray-500">× {item.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="pt-3 mt-3 border-t border-white/5 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCents(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="font-mono">{formatCents(order.shipping)}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary">
                  <span>Total</span>
                  <span className="font-mono">{formatCents(order.total)}</span>
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">收货地址</h2>
              <p className="text-sm leading-relaxed">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
                {order.shippingAddress.phone && (
                  <>
                    <br />
                    {order.shippingAddress.phone}
                  </>
                )}
              </p>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">支付时间线</h2>
              <ol className="space-y-2">
                {events.map((ev) => (
                  <li key={ev._id} className="flex justify-between text-xs">
                    <div>
                      <span className="font-medium text-white">{ev.event}</span>
                      <span className="text-gray-500 ml-2 font-mono">{ev.providerId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{formatCents(ev.amount)}</span>
                      <span className="text-gray-600 ml-2">
                        {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="space-y-4">
            <section className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">操作</h2>

              {order.status === 'paid' && (
                <Button onClick={() => setShowShipForm(!showShipForm)} className="w-full mb-2">
                  <Truck className="w-4 h-4" />
                  标记发货
                </Button>
              )}

              {showShipForm && (
                <form onSubmit={handleShip} className="space-y-2 mb-3 pb-3 border-b border-white/5">
                  <Input name="carrier" placeholder="物流商（如 DHL / 云途）" required />
                  <Input name="trackingNo" placeholder="物流单号" required />
                  <Input name="trackingUrl" placeholder="物流查询链接（可选）" type="url" />
                  <Button type="submit" size="sm" className="w-full">
                    确认发货
                  </Button>
                </form>
              )}

              {(order.status === 'paid' || order.status === 'shipped') &&
                order.payment.paypalCaptureId && (
                  <Button
                    variant="danger"
                    onClick={() => setShowRefundForm(!showRefundForm)}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4" />
                    退款
                  </Button>
                )}

              {showRefundForm && (
                <form
                  onSubmit={handleRefund}
                  className="space-y-2 mt-3 pt-3 border-t border-white/5"
                >
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="金额（美元）"
                    required
                    defaultValue={(order.total / 100).toFixed(2)}
                  />
                  <Input name="reason" placeholder="退款原因（可选）" />
                  <Button type="submit" variant="danger" size="sm" className="w-full">
                    <AlertCircle className="w-3.5 h-3.5" />
                    确认退款
                  </Button>
                </form>
              )}
            </section>

            <section className="glass-card p-5 text-xs space-y-2">
              <h2 className="text-sm font-semibold mb-3">支付详情</h2>
              <div>
                <span className="text-gray-500">方式：</span>
                {order.payment.method}
              </div>
              {order.payment.paypalOrderId && (
                <div>
                  <span className="text-gray-500">PayPal Order：</span>
                  <span className="font-mono break-all">{order.payment.paypalOrderId}</span>
                </div>
              )}
              {order.payment.paypalCaptureId && (
                <div>
                  <span className="text-gray-500">Capture ID：</span>
                  <span className="font-mono break-all">{order.payment.paypalCaptureId}</span>
                </div>
              )}
              {order.payment.paidAt && (
                <div>
                  <span className="text-gray-500">付款时间：</span>
                  {new Date(order.payment.paidAt).toLocaleString()}
                </div>
              )}
            </section>

            <section className="glass-card p-5 text-xs">
              <h2 className="text-sm font-semibold mb-3">买家</h2>
              <p>
                <a href={`mailto:${order.email}`} className="text-primary hover:underline">
                  {order.email}
                </a>
              </p>
              <p className="text-gray-500 mt-1">
                下单 {new Date(order.createdAt).toLocaleString()}
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
