"use client";

import { useState, useEffect, useCallback } from "react";
import { useSSE } from "@/frontend/hooks/use-sse";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { CreditCard, RefreshCw } from "lucide-react";
import type { DashboardOrder } from "@/shared/types";
import type { OrderStatus } from "@/generated/prisma";

// Payment status shown to the owner, derived from the order's lifecycle state.
// PAID/PREPARING/READY/COMPLETED all mean the money was collected; only
// PAYMENT_PENDING is in-flight, FAILED did not go through, CANCELLED was
// pulled after the fact.
type PayState = "pending" | "paid" | "failed" | "cancelled";

function payState(status: OrderStatus): PayState {
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "PAYMENT_PENDING" || status === "CREATED") return "pending";
  return "paid";
}

const PAY_BADGE: Record<PayState, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  paid: { label: "Paid", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  cancelled: { label: "Cancelled", className: "bg-stone-500/15 text-stone-500 border-stone-500/30" },
};

const FILTERS: { label: string; value: "ALL" | PayState }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
];

// Every lifecycle status, so pending and failed payments show here too (the
// fulfillment board only lists PAID onwards).
const ALL_STATUSES = "PAYMENT_PENDING,PAID,PREPARING,READY,COMPLETED,CANCELLED,FAILED";

function formatMoney(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function DashboardPaymentsPage() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [filter, setFilter] = useState<"ALL" | PayState>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const params = new URLSearchParams({
        status: ALL_STATUSES,
        limit: "300",
        dateFrom: todayStart.toISOString(),
      });
      const res = await fetch(`/api/dashboard/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders((data.data.orders as Record<string, unknown>[]).map(mapOrder));
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 6s. Polling is the reliable source for the
  // pending -> paid/failed transitions, which are not all pushed over SSE.
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // SSE layered on top for instant "paid" and status updates.
  useSSE({
    url: "/api/dashboard/orders/stream",
    events: ["new_order", "order_updated"],
    onMessage: (_event, data) => {
      const incoming = (data as { order: DashboardOrder }).order;
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === incoming.id);
        if (idx === -1) return [incoming, ...prev];
        const next = [...prev];
        next[idx] = incoming;
        return next;
      });
    },
  });

  const counts = orders.reduce(
    (acc, o) => {
      acc[payState(o.status)] += 1;
      return acc;
    },
    { pending: 0, paid: 0, failed: 0, cancelled: 0 } as Record<PayState, number>
  );

  const visible = orders.filter((o) => filter === "ALL" || payState(o.status) === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">Payments</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchOrders} className="self-start sm:self-auto">
          <RefreshCw size={16} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Pending" value={counts.pending} className="text-amber-600" />
        <SummaryCard label="Paid" value={counts.paid} className="text-green-600" />
        <SummaryCard label="Failed" value={counts.failed} className="text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto menu-scroll pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-100",
              filter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-surface text-muted border border-border hover:border-primary/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="No orders yet"
          description="Payments will appear here in real-time as customers pay"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-surface border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="min-w-[64px]">Order</span>
            <span className="flex-1">Items</span>
            <span className="w-24 text-right">Amount</span>
            <span className="w-[92px] text-right">Payment</span>
          </div>
          <div className="divide-y divide-border">
            {visible.map((o) => {
              const ps = payState(o.status);
              const badge = PAY_BADGE[ps];
              const itemsSummary =
                o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ") || "—";
              return (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 bg-background">
                  <div className="flex flex-col min-w-[64px]">
                    <span className="font-semibold text-sm">#{o.orderNumber}</span>
                    <span className="text-[11px] text-muted">{formatTime(o.createdAt)}</span>
                  </div>
                  <div
                    className="hidden sm:block flex-1 text-sm text-muted truncate"
                    title={itemsSummary}
                  >
                    {itemsSummary}
                  </div>
                  <div className="w-24 text-sm font-semibold text-right tabular-nums ml-auto sm:ml-0">
                    {formatMoney(o.chargeablePaise || o.totalPaise)}
                  </div>
                  <div className="w-[92px] text-right">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                        badge.className,
                        ps === "pending" && "animate-pulse"
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-3 sm:p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("text-2xl font-bold mt-0.5 tabular-nums", className)}>{value}</p>
    </div>
  );
}

function mapOrder(o: Record<string, unknown>): DashboardOrder {
  const cafe = o.cafe as Record<string, unknown> | undefined;
  const items = (o.items as Record<string, unknown>[]) ?? [];
  return {
    id: o.id as string,
    orderNumber: o.orderNumber as string,
    status: o.status as OrderStatus,
    totalPaise: o.totalPaise as number,
    customerName: o.customerName as string | null,
    customerPhone: o.customerPhone as string | null,
    notes: o.notes as string | null,
    createdAt: o.createdAt as string,
    updatedAt: o.updatedAt as string,
    cafeName: (o.cafeName ?? cafe?.name ?? null) as string | null,
    cafeSlug: (o.cafeSlug ?? cafe?.slug) as string | undefined,
    isSubsidised: false,
    chargeablePaise: items.reduce(
      (sum, i) => sum + (i.isSubsidised ? 0 : (i.subtotalPaise as number)),
      0
    ),
    items: items.map((i) => ({
      id: i.id as string,
      itemName: i.itemName as string,
      itemPricePaise: i.itemPricePaise as number,
      quantity: i.quantity as number,
      subtotalPaise: i.subtotalPaise as number,
      isSubsidised: i.isSubsidised as boolean,
    })),
  };
}
