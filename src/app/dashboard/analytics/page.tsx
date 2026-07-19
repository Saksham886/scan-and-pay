"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { StatusBadge } from "@/frontend/components/ui/status-badge";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import type { OrderStatus } from "@/generated/prisma";

interface AnalyticsData {
  orders: number;
  revenue: number;
  range: string;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalPaise: number;
    customerName: string | null;
    createdAt: string;
  }[];
}

type TimeRange = "today" | "week" | "month" | "year" | "all";

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export default function OwnerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<TimeRange>("today");
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (r: TimeRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/analytics?range=${r}`);
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted mt-1">Track your revenue and orders</p>
        </div>
      </div>

      {/* Time Range Picker */}
      <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 mb-6 overflow-x-auto">
        {timeRanges.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-100",
              range === tr.value
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <DollarSign size={24} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Revenue
              </p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-24 h-7 bg-surface-hover rounded animate-pulse" />
                ) : (
                  paiseToCurrencyShort(analytics?.revenue || 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
              <ShoppingBag size={24} className="text-info" />
            </div>
            <div>
              <p className="text-sm text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Orders
              </p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-surface-hover rounded animate-pulse" />
                ) : (
                  (analytics?.orders || 0).toLocaleString()
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Order Value */}
      {analytics && analytics.orders > 0 && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {paiseToCurrencyShort(Math.round(analytics.revenue / analytics.orders))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Orders */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-muted" />
        <h3 className="font-semibold">Recent Orders</h3>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-muted text-sm">Loading...</div>
        ) : !analytics?.recentOrders.length ? (
          <div className="px-5 py-8 text-center text-muted text-sm">
            No orders in this time period
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {analytics.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="font-medium text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted mt-0.5">{order.customerName || "Guest"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{paiseToCurrencyShort(order.totalPaise)}</p>
                    <div className="mt-0.5 flex justify-end">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Order #</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>
              {analytics.recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  className={cn(
                    "grid grid-cols-4 gap-4 px-5 py-3 text-sm items-center",
                    i < analytics.recentOrders.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted truncate">{order.customerName || "Guest"}</span>
                  <span><StatusBadge status={order.status} /></span>
                  <span className="text-right font-medium">{paiseToCurrencyShort(order.totalPaise)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
