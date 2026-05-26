"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Search, Package, Truck, AlertCircle, ExternalLink } from "lucide-react";
import { lookupOrder, ApiError, type OrderLookupResult } from "@/lib/api";
import { formatCents } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_TO_BADGE_TONE: Record<string, "primary" | "success" | "warning" | "neutral" | "accent"> = {
  pending_payment: "warning",
  paid: "primary",
  shipped: "success",
  delivered: "success",
  cancelled: "neutral",
  refunded: "accent",
};

export default function OrderLookupClient({ initialOrderNo }: { initialOrderNo: string }) {
  const t = useTranslations("OrderLookup");
  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderLookupResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setOrder(null);
    try {
      const result = await lookupOrder(email.trim(), orderNo.trim());
      setOrder(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t("errorNotFound"));
      } else {
        setError(t("errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" aria-hidden />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("title")}</h1>
          <p className="font-mono text-primary">{order.orderNo}</p>
        </div>

        <div className="glass-card p-5 mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t("status")}</span>
            <Badge tone={STATUS_TO_BADGE_TONE[order.status] ?? "neutral"}>
              {t(`status${pascalize(order.status)}`)}
            </Badge>
          </div>
          {order.fulfillment?.carrier && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t("shippingCarrier")}</span>
                <span className="text-sm">{order.fulfillment.carrier}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{t("tracking")}</span>
                <span className="font-mono text-sm text-primary">
                  {order.fulfillment.trackingNo}
                </span>
              </div>
              {order.fulfillment.trackingUrl && (
                <a
                  href={order.fulfillment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Truck className="w-3.5 h-3.5" aria-hidden />
                  {t("trackOnCarrier")}
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
              )}
            </>
          )}
        </div>

        <div className="glass-card p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t("items")}
          </h2>
          <ul className="divide-y divide-white/5">
            {order.items.map((item, i) => (
              <li key={i} className="py-2.5 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{item.sku}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-mono">{formatCents(item.price)}</p>
                  <p className="text-xs text-gray-500">× {item.quantity}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold pt-3 border-t border-white/5 mt-3">
            <span>Total</span>
            <span className="font-mono text-primary">{formatCents(order.total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOrder(null);
            setOrderNo("");
            setEmail("");
          }}
          className="w-full text-sm text-gray-400 hover:text-primary transition-colors py-2"
        >
          {t("back")}
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <header className="text-center mb-8">
        <Search className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden />
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-sm text-gray-400">{t("subtitle")}</p>
      </header>

      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-4">
        <div>
          <label htmlFor="ol-email" className="block text-xs font-medium text-gray-400 mb-1.5">
            {t("email")}
          </label>
          <Input
            id="ol-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="ol-no" className="block text-xs font-medium text-gray-400 mb-1.5">
            {t("orderNo")}
          </label>
          <Input
            id="ol-no"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            required
            placeholder="CR-20260101-XXXX"
            className="font-mono"
          />
        </div>
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" isLoading={submitting} disabled={submitting}>
          <Search className="w-4 h-4" aria-hidden />
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </div>
  );
}

function pascalize(s: string): string {
  return s
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
