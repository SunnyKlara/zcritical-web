import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";

export const metadata = { robots: { index: false, follow: false } };

interface Props {
  params: { locale: string };
}

export default function CheckoutCancelPage({ params }: Props) {
  setRequestLocale(params.locale);
  return (
    <main id="main-content" className="relative">
      <Navbar />
      <CancelContent />
      <Footer />
    </main>
  );
}

function CancelContent() {
  const t = useTranslations("CheckoutCancel");
  return (
    <section className="pt-32 pb-24 lg:pb-32 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-accent" aria-hidden />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{t("title")}</h1>
        <p className="text-gray-400 mb-8">{t("desc")}</p>
        <Link href="/checkout" className="btn-primary">
          {t("back")}
        </Link>
      </div>
    </section>
  );
}
