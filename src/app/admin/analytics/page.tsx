"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import type { AnalyticsOverview } from "@/shared/types";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Store,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="bg-surface rounded-2xl border border-border animate-pulse h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted">
        Failed to load analytics data.
      </div>
    );
  }

  const topCards = [
    {
      label: "Total Revenue",
      value: paiseToCurrencyShort(data.totalRevenue),
      icon: <DollarSign size={20} />,
      color: "text-success bg-success/20",
    },
    {
      label: "Today's Revenue",
      value: paiseToCurrencyShort(data.todayRevenue),
      icon: <TrendingUp size={20} />,
      color: "text-primary bg-primary/20",
    },
    {
      label: "Total Orders",
      value: data.totalOrders.toLocaleString(),
      icon: <ShoppingBag size={20} />,
      color: "text-info bg-info/20",
    },
    {
      label: "Active Cafes",
      value: String(data.activeCafes),
      icon: <Store size={20} />,
      color: "text-primary-light bg-primary/20",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {topCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-muted">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-Cafe Breakdown */}
      <h2 className="text-lg font-semibold mb-4">Per-Cafe Breakdown</h2>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {data.cafeStats.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted text-sm">No cafe data available</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {data.cafeStats.map((cafe) => (
                <div key={cafe.cafeId} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{cafe.cafeName}</p>
                      <p className="text-xs text-muted">/{cafe.cafeSlug}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success text-sm flex items-center gap-0.5">
                        {paiseToCurrencyShort(cafe.totalRevenue)}<ArrowUpRight size={12} className="text-success" />
                      </p>
                      <p className="text-xs text-muted">{cafe.totalOrders} orders total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Today Orders</p>
                      <p className="font-medium text-sm flex items-center gap-0.5"><Activity size={11} className="text-muted" />{cafe.todayOrders}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wide">Today Revenue</p>
                      <p className="font-medium text-sm text-primary">{paiseToCurrencyShort(cafe.todayRevenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Cafe</span>
                <span className="text-right">Today Orders</span>
                <span className="text-right">Today Revenue</span>
                <span className="text-right">Total Orders</span>
                <span className="text-right">Total Revenue</span>
              </div>
              {data.cafeStats.map((cafe, i) => (
                <div
                  key={cafe.cafeId}
                  className={cn(
                    "grid grid-cols-5 gap-3 px-4 py-4 text-sm items-center",
                    i < data.cafeStats.length - 1 && "border-b border-border"
                  )}
                >
                  <div>
                    <p className="font-semibold text-sm">{cafe.cafeName}</p>
                    <p className="text-xs text-muted">/{cafe.cafeSlug}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Activity size={13} className="text-muted" />
                      <span className="font-medium">{cafe.todayOrders}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-primary">{paiseToCurrencyShort(cafe.todayRevenue)}</span>
                  </div>
                  <div className="text-right font-medium">{cafe.totalOrders.toLocaleString()}</div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-bold text-success">{paiseToCurrencyShort(cafe.totalRevenue)}</span>
                      <ArrowUpRight size={13} className="text-success" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
