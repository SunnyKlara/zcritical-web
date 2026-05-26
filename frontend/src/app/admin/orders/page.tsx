"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Filter,
} from "lucide-react";
import { useAuth, authFetch } from "@/lib/auth-context";
import { formatCents } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

interface OrderRow {
  _id: string;
  orderNo: string;
  email: string;
  status: OrderStatus;
  total: number;
  currency: string;
  shippingAddress: { city: string; country: string };
  createdAt: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    tone: "primary" | "success" | "warning" | "neutral" | "accent";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pending_payment: { label: "待付款", tone: "warning", icon: Clock },
  paid: { label: "已付款", tone: "primary", icon: Package },
  shipped: { label: "已发货", tone: "success", icon: Truck },
  delivered: { label: "已送达", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "已取消", tone: "neutral", icon: XCircle },
  refunded: { label: "已退款", tone: "accent", icon: RotateCcw },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, accessToken, loading, refresh } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    const query = filter === "all" ? "" : `?status=${filter}`;
    authFetch<OrderRow[]>(`/api/admin/orders${query}`, {}, { accessToken, refresh })
      .then(setOrders)
      .catch(console.error)
      .finally(() => setOrdersLoading(false));
  }, [user, accessToken, refresh, filter]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-semibold">订单管理</h1>
          <span className="text-xs text-gray-500">{orders.length} 单</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 overflow-x-auto mb-6"
        >
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            全部
          </Chip>
          {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {STATUS_CONFIG[s].label}
            </Chip>
          ))}
        </motion.div>

        {ordersLoading ? (
          <div className="glass-card p-12 text-center text-gray-500">加载中…</div>
        ) : orders.length === 0 ? (
          <div className="glass-card p-12 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无订单</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px_100px_80px] sm:grid-cols-[140px_1fr_100px_120px_120px_100px] px-5 py-3 bg-dark-700/50 border-b border-white/5 text-xs text-gray-500 font-medium">
              <span className="hidden sm:block">订单号</span>
              <span>买家</span>
              <span>金额</span>
              <span>地区</span>
              <span>时间</span>
              <span className="text-right">状态</span>
            </div>
            <ul className="divide-y divide-white/5">
              {orders.map((o) => {
                const config = STATUS_CONFIG[o.status];
                const Icon = config.icon;
                const date = new Date(o.createdAt).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <li key={o._id}>
                    <Link
                      href={`/admin/orders/${o._id}`}
                      className="grid grid-cols-[1fr_100px_120px_100px_80px] sm:grid-cols-[140px_1fr_100px_120px_120px_100px] px-5 py-3 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="hidden sm:block font-mono text-xs text-primary">
                        {o.orderNo}
                      </span>
                      <span className="text-sm text-white truncate">{o.email}</span>
                      <span className="font-mono text-sm">{formatCents(o.total)}</span>
                      <span className="text-xs text-gray-500">
                        {o.shippingAddress.city}, {o.shippingAddress.country}
                      </span>
                      <span className="text-xs text-gray-600">{date}</span>
                      <span className="flex justify-end">
                        <Badge tone={config.tone}>
                          <Icon className="w-2.5 h-2.5" />
                          {config.label}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
