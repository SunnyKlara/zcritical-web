"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, AlertCircle, CreditCard } from "lucide-react";
import { createOrder, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
];

const SHIPPING_BY_COUNTRY: Record<string, number> = {
  US: 4500, CA: 5000, GB: 5500, DE: 5500, FR: 5500, IT: 5500, ES: 5500, NL: 5500,
  JP: 4000, KR: 4000, AU: 6000, NZ: 6500, SG: 3500,
};

interface CheckoutClientProps {
  initialSku: string;
  initialQuantity: number;
}

export default function CheckoutClient({ initialSku, initialQuantity }: CheckoutClientProps) {
  const t = useTranslations("Checkout");
  const locale = useLocale() as "zh" | "en";
  const [country, setCountry] = useState("US");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // V1 mock pricing — wire this to /api/products in production
  const unitPrice = 29900; // $299.00 in cents
  const quantity = initialQuantity;
  const subtotal = unitPrice * quantity;
  const shipping = SHIPPING_BY_COUNTRY[country] ?? 6500;
  const total = subtotal + shipping;

  const productLabel = initialSku
    ? `Critical (${initialSku}) × ${quantity}`
    : `Critical × ${quantity}`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    try {
      const response = await createOrder({
        email: String(fd.get("email") || ""),
        locale,
        items: [
          {
            sku: initialSku || "CRITICAL-V1",
            quantity,
          },
        ],
        shippingAddress: {
          fullName: String(fd.get("fullName") || ""),
          line1: String(fd.get("line1") || ""),
          line2: String(fd.get("line2") || "") || undefined,
          city: String(fd.get("city") || ""),
          state: String(fd.get("state") || ""),
          postalCode: String(fd.get("postalCode") || ""),
          country: String(fd.get("country") || "US"),
          phone: String(fd.get("phone") || "") || undefined,
        },
      });
      // Redirect to PayPal for approval
      window.location.href = response.approveUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError(t("errorRateLimit"));
        else if (err.status === 400 && err.message.toLowerCase().includes("stock")) {
          setError(t("errorOutOfStock"));
        } else setError(err.message || t("errorGeneric"));
      } else {
        setError(t("errorGeneric"));
      }
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header className="text-center mb-8">
        <ShoppingBag className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden />
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t("title")}</h1>
        <p className="text-sm text-gray-500">{t("secureNote")}</p>
      </header>

      {/* Order summary */}
      <section className="glass-card p-5 mb-6" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-sm font-semibold text-gray-300 mb-3">
          {t("summary")}
        </h2>
        <div className="flex items-center justify-between py-3 border-b border-white/5">
          <span className="text-sm text-white">{productLabel}</span>
          <span className="text-sm font-mono text-white">{formatCents(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 pt-3">
          <span>{t("subtotal")}</span>
          <span className="font-mono">{formatCents(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span>{t("shipping")}</span>
          <span className="font-mono">{formatCents(shipping)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-3 border-t border-white/5 mt-3">
          <span>{t("total")}</span>
          <span className="font-mono text-primary">{formatCents(total)}</span>
        </div>
      </section>

      {/* Address form */}
      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-4" noValidate>
        <h2 className="text-sm font-semibold text-gray-300">{t("shippingAddress")}</h2>

        <Field label={t("fullName")} name="fullName" required />
        <Field label={t("email")} name="email" type="email" required />

        <Field label={t("line1")} name="line1" required />
        <Field label={t("line2")} name="line2" />

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("city")} name="city" required />
          <Field label={t("state")} name="state" required />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("postalCode")} name="postalCode" required />
          <div>
            <label htmlFor="country" className="block text-xs font-medium text-gray-400 mb-1.5">
              {t("country")} *
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

        <Field label={t("phone")} name="phone" type="tel" />

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

        <Button type="submit" className="w-full" size="lg" isLoading={submitting} disabled={submitting}>
          <CreditCard className="w-4 h-4" aria-hidden />
          {submitting ? t("submitting") : t("payButton", { amount: formatCents(total) })}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  const id = `co-${name}`;
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
  );
}
