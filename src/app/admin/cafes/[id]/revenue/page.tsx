"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import {
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CalendarDays,
  Store,
} from "lucide-react";
import type { OrderStatus } from "@/generated/prisma";

interface CafeAnalytics {
  orders: number;
  revenue: number;
  range: string;
  from: string;
  to: string;
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

const statusColors: Record<string, string> = {
  PAID: "text-info bg-info/20",
  PREPARING: "text-warning bg-warning/10",
  READY: "text-primary bg-primary/10",
  COMPLETED: "text-success bg-success/20",
  CANCELLED: "text-danger bg-danger/10",
  FAILED: "text-danger bg-danger/10",
};

export default function CafeRevenuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cafeName, setCafeName] = useState("");
  const [cafeSlug, setCafeSlug] = useState("");
  const [analytics, setAnalytics] = useState<CafeAnalytics | null>(null);
  const [range, setRange] = useState<TimeRange>("all");
  const [loading, setLoading] = useState(true);

  const fetchCafe = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cafes/${id}`);
      const data = await res.json();
      if (data.success) {
        setCafeName(data.data.name);
        setCafeSlug(data.data.slug);
      }
    } catch {
      console.error("Failed to fetch cafe");
    }
  }, [id]);

  const fetchAnalytics = useCallback(async (r: TimeRange) => {
    try {
      const res = await fetch(`/api/admin/cafes/${id}/analytics?range=${r}`);
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCafe();
    fetchAnalytics(range);
  }, [fetchCafe, fetchAnalytics, range]);

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => router.push(`/admin/cafes/${id}`)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to {cafeName || "Cafe"}
          </button>
          <span className="text-muted">/</span>
          <h1 className="text-xl sm:text-2xl font-bold">Revenue & Orders</h1>
        </div>
        <p className="text-sm text-muted">
          Complete revenue and order history for <strong className="text-foreground">{cafeName}</strong>
        </p>
      </div>

      {/* Time Range Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          Overview
        </h2>
        <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 overflow-x-auto">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => handleRangeChange(tr.value)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100",
                range === tr.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/20 text-success">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Revenue
              </p>
              <p className="text-xl font-bold">
                {loading ? "..." : paiseToCurrencyShort(analytics?.revenue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/20 text-info">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-xs text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Orders
              </p>
              <p className="text-xl font-bold">
                {loading ? "..." : (analytics?.orders || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-muted" />
        <h3 className="font-semibold text-sm">All Orders ({analytics?.orders || 0})</h3>
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
                <div key={order.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{order.orderNumber}</span>
                    <span className="font-medium text-sm">{paiseToCurrencyShort(order.totalPaise)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{order.customerName || "Guest"}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColors[order.status] || "text-muted bg-surface")}>
                        {order.status}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Order #</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Date</span>
              </div>
              {analytics.recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  className={cn(
                    "grid grid-cols-5 gap-4 px-5 py-3 text-sm items-center",
                    i < analytics.recentOrders.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted truncate">{order.customerName || "Guest"}</span>
                  <span>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusColors[order.status] || "text-muted bg-surface")}>
                      {order.status}
                    </span>
                  </span>
                  <span className="text-right font-medium">{paiseToCurrencyShort(order.totalPaise)}</span>
                  <span className="text-right text-muted text-xs">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
