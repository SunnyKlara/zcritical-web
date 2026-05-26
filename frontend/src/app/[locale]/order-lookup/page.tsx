import { setRequestLocale } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrderLookupClient from "@/components/checkout/OrderLookupClient";

export const metadata = { robots: { index: false, follow: false } };

interface Props {
  params: { locale: string };
  searchParams: { orderNo?: string };
}

export default function OrderLookupPage({ params, searchParams }: Props) {
  setRequestLocale(params.locale);
  return (
    <main id="main-content" className="relative">
      <Navbar />
      <section className="pt-32 pb-24 lg:pb-32 px-4">
        <div className="max-w-xl mx-auto">
          <OrderLookupClient initialOrderNo={searchParams.orderNo ?? ""} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
