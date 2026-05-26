import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutSuccessClient from '@/components/checkout/CheckoutSuccessClient'

export const metadata = { robots: { index: false, follow: false } }

interface Props {
  params: { locale: string }
  searchParams: { token?: string }
}

export default function CheckoutSuccessPage({ params, searchParams }: Props) {
  setRequestLocale(params.locale)
  return (
    <main id="main-content" className="relative">
      <Navbar />
      <CheckoutSuccessClient paypalOrderId={searchParams.token ?? ''} />
      <Footer />
    </main>
  )
}
