import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutClient from '@/components/checkout/CheckoutClient'

export const metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

interface CheckoutPageProps {
  params: { locale: string }
  searchParams: { sku?: string; qty?: string }
}

export default function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  setRequestLocale(params.locale)

  const sku = searchParams.sku ?? ''
  const quantity = Math.max(1, Math.min(10, parseInt(searchParams.qty ?? '1', 10) || 1))

  return (
    <main id="main-content" className="relative">
      <Navbar />
      <section className="pt-32 pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <CheckoutClient initialSku={sku} initialQuantity={quantity} />
        </div>
      </section>
      <Footer />
    </main>
  )
}
