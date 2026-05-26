'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, AlertCircle, CreditCard, Loader2 } from 'lucide-react'
import { createOrder, listProducts, ApiError } from '@/lib/api'
import { formatCents } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
]

const SHIPPING_BY_COUNTRY: Record<string, number> = {
  US: 4500,
  CA: 5000,
  GB: 5500,
  DE: 5500,
  FR: 5500,
  IT: 5500,
  ES: 5500,
  NL: 5500,
  JP: 4000,
  KR: 4000,
  AU: 6000,
  NZ: 6500,
  SG: 3500,
}
const SHIPPING_DEFAULT = 6500

interface ProductVariant {
  sku: string
  name: { zh: string; en: string }
  stock: number
  image: string
}

interface Product {
  _id: string
  name: { zh: string; en: string }
  slug: string
  price: number
  currency: string
  variants: ProductVariant[]
  images: string[]
}

interface CheckoutClientProps {
  initialSku: string
  initialQuantity: number
}

export default function CheckoutClient({ initialSku, initialQuantity }: CheckoutClientProps) {
  const t = useTranslations('Checkout')
  const locale = useLocale() as 'zh' | 'en'

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productError, setProductError] = useState('')
  const [selectedSku, setSelectedSku] = useState(initialSku)
  const [country, setCountry] = useState('US')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const quantity = initialQuantity

  useEffect(() => {
    listProducts<Product>()
      .then((items) => {
        setProducts(items)
        // Auto-select first variant if no SKU was passed in URL
        if (!selectedSku && items.length > 0 && items[0]?.variants[0]) {
          setSelectedSku(items[0].variants[0].sku)
        }
        setLoadingProducts(false)
      })
      .catch((err) => {
        console.error('Failed to load products:', err)
        setProductError(
          locale === 'zh'
            ? '无法加载商品信息，请刷新重试'
            : 'Could not load product info. Please refresh.',
        )
        setLoadingProducts(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resolve current variant + product for display & pricing
  const { product, variant } = (() => {
    for (const p of products) {
      const v = p.variants.find((vv) => vv.sku === selectedSku)
      if (v) return { product: p, variant: v }
    }
    return { product: undefined, variant: undefined }
  })()

  const unitPrice = product?.price ?? 0
  const subtotal = unitPrice * quantity
  const shipping = SHIPPING_BY_COUNTRY[country] ?? SHIPPING_DEFAULT
  const total = subtotal + shipping

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedSku) return
    setSubmitting(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    try {
      const response = await createOrder({
        email: String(fd.get('email') || ''),
        locale,
        items: [{ sku: selectedSku, quantity }],
        shippingAddress: {
          fullName: String(fd.get('fullName') || ''),
          line1: String(fd.get('line1') || ''),
          line2: String(fd.get('line2') || '') || undefined,
          city: String(fd.get('city') || ''),
          state: String(fd.get('state') || ''),
          postalCode: String(fd.get('postalCode') || ''),
          country: String(fd.get('country') || 'US'),
          phone: String(fd.get('phone') || '') || undefined,
        },
      })
      window.location.href = response.approveUrl
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError(t('errorRateLimit'))
        else if (err.status === 400 && err.message.toLowerCase().includes('stock')) {
          setError(t('errorOutOfStock'))
        } else setError(err.message || t('errorGeneric'))
      } else {
        setError(t('errorGeneric'))
      }
      setSubmitting(false)
    }
  }

  if (loadingProducts) {
    return (
      <div className="text-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin mb-4" aria-hidden />
        <p className="text-sm text-gray-500">
          {locale === 'zh' ? '加载商品信息…' : 'Loading product info…'}
        </p>
      </div>
    )
  }

  if (productError || !product || !variant) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-accent mx-auto mb-4" aria-hidden />
        <p className="text-sm text-gray-400">
          {productError || (locale === 'zh' ? '未找到商品' : 'Product not found')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="text-center mb-8">
        <ShoppingBag className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden />
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t('title')}</h1>
        <p className="text-sm text-gray-500">{t('secureNote')}</p>
      </header>

      {/* Order summary with variant picker */}
      <section className="glass-card p-5 mb-6" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-sm font-semibold text-gray-300 mb-3">
          {t('summary')}
        </h2>

        <div className="flex items-start gap-3 py-3 border-b border-white/5">
          <div className="w-16 h-16 rounded-lg bg-dark-700/50 border border-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-600 text-xs">
            {variant.image ? '📦' : 'img'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{product.name[locale]}</p>
            <p className="text-xs text-gray-500 mb-2">{variant.name[locale]}</p>
            {/* Variant switcher (when multiple variants exist) */}
            {product.variants.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {product.variants.map((v) => (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => setSelectedSku(v.sku)}
                    disabled={v.stock < 1}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      v.sku === selectedSku
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-white/10 text-gray-400 hover:border-white/30'
                    } ${v.stock < 1 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                  >
                    {v.name[locale]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-white">{formatCents(unitPrice)}</p>
            <p className="text-xs text-gray-500">× {quantity}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 pt-3">
          <span>{t('subtotal')}</span>
          <span className="font-mono">{formatCents(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span>{t('shipping')}</span>
          <span className="font-mono">{formatCents(shipping)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-3 border-t border-white/5 mt-3">
          <span>{t('total')}</span>
          <span className="font-mono text-primary">{formatCents(total)}</span>
        </div>
      </section>

      {/* Address form */}
      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-4" noValidate>
        <h2 className="text-sm font-semibold text-gray-300">{t('shippingAddress')}</h2>

        <Field label={t('fullName')} name="fullName" required />
        <Field label={t('email')} name="email" type="email" required />

        <Field label={t('line1')} name="line1" required />
        <Field label={t('line2')} name="line2" />

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('city')} name="city" required />
          <Field label={t('state')} name="state" required />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('postalCode')} name="postalCode" required />
          <div>
            <label htmlFor="country" className="block text-xs font-medium text-gray-400 mb-1.5">
              {t('country')} *
            </label>
            <select
              id="country"
              name="country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Field label={t('phone')} name="phone" type="tel" />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={submitting}
          disabled={submitting || !selectedSku}
        >
          <CreditCard className="w-4 h-4" aria-hidden />
          {submitting ? t('submitting') : t('payButton', { amount: formatCents(total) })}
        </Button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  const id = `co-${name}`
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
        {required && (
          <span className="text-primary ml-0.5" aria-label="required">
            *
          </span>
        )}
      </label>
      <Input id={id} name={name} type={type} required={required} />
    </div>
  )
}
