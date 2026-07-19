"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { ClipboardList, RefreshCw, Store } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { paiseToCurrencyShort } from "@/shared/utils/currency";

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  cafe?: { id: string; name: string; slug: string };
}

interface Cafe {
  id: string;
  name: string;
  slug: string;
}

type DatePreset = "today" | "week" | "month" | "all";

const datePresets: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: "all" },
];

function getDateRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  if (preset === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString() };
  }
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString() };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString() };
  }
  return {};
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [cafeFilter, setCafeFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchCafes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cafes");
      const data = await res.json();
      if (data.success) setCafes(data.data);
    } catch {
      console.error("Failed to fetch cafes");
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(datePreset);
      const params = new URLSearchParams({ status: "COMPLETED", limit: "500" });
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      if (cafeFilter !== "ALL") params.set("cafeId", cafeFilter);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [datePreset, cafeFilter]);

  useEffect(() => { fetchCafes(); }, [fetchCafes]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPaise, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Completed Orders</h1>
          <p className="text-sm text-muted mt-0.5">View and filter all completed orders across branches</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchOrders} className="self-start sm:self-auto">
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Date presets */}
        <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 shadow-sm">
          {datePresets.map((p) => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100",
                datePreset === p.value
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Cafe filter */}
        <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 overflow-x-auto shadow-sm">
          <button
            onClick={() => setCafeFilter("ALL")}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100",
              cafeFilter === "ALL"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            )}
          >
            <Store size={11} />
            All Branches
          </button>
          {cafes.map((c) => (
            <button
              key={c.id}
              onClick={() => setCafeFilter(c.id)}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100",
                cafeFilter === c.id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center gap-6 bg-surface rounded-xl border border-border px-5 py-3 mb-5 shadow-sm">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide font-medium">Orders</p>
            <p className="text-lg font-bold">{orders.length}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide font-medium">Revenue</p>
            <p className="text-lg font-bold text-emerald-600">{paiseToCurrencyShort(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border animate-pulse flex gap-4">
              <div className="h-3.5 bg-surface-hover rounded w-24" />
              <div className="h-3.5 bg-surface-hover rounded w-32" />
              <div className="h-3.5 bg-surface-hover rounded w-28" />
              <div className="h-3.5 bg-surface-hover rounded w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="No completed orders"
          description="Completed orders will appear here"
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-primary text-xs">{order.orderNumber}</span>
                  <span className="font-semibold text-sm">{paiseToCurrencyShort(order.totalPaise)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{order.customerName || <span className="text-muted">Guest</span>}</p>
                    <p className="text-xs text-muted">{order.cafe?.name ?? "-"}</p>
                  </div>
                  <span className="text-xs text-muted text-right">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: datePreset === "all" ? "numeric" : undefined,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-surface-hover border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wide">
              <span>Order #</span>
              <span>Branch</span>
              <span>Customer</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Date & Time</span>
            </div>
            {orders.map((order, i) => (
              <div
                key={order.id}
                className={cn(
                  "grid grid-cols-5 gap-3 px-4 py-3 text-sm items-center hover:bg-surface-hover/50 transition-colors",
                  i < orders.length - 1 && "border-b border-border"
                )}
              >
                <span className="font-semibold text-primary text-xs">{order.orderNumber}</span>
                <span className="text-muted truncate text-xs">{order.cafe?.name ?? "-"}</span>
                <span className="text-foreground truncate text-xs">{order.customerName || <span className="text-muted">Guest</span>}</span>
                <span className="text-right font-semibold text-xs">{paiseToCurrencyShort(order.totalPaise)}</span>
                <span className="text-right text-muted text-xs">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: datePreset === "all" ? "numeric" : undefined,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
