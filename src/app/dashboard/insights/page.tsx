"use client";

import { useEffect, useState } from "react";
import { Card } from "@/frontend/components/ui/card";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import type { CafeInsights } from "@/shared/types";
import {
  Sparkles,
  Clock,
  Utensils,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
  CafeInsightCard,
  WINDOW_OPTIONS,
  formatHour,
} from "@/frontend/components/dashboard/cafe-insight-card";

interface OwnerInsightsResponse {
  windowDays: number;
  generatedAt: string;
  cafe: CafeInsights;
}

export default function OwnerDeepInsightsPage() {
  const [data, setData] = useState<OwnerInsightsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [failMessage, setFailMessage] = useState<string>("Failed to load insights.");
  const [windowDays, setWindowDays] = useState<number>(30);

  const loading = !failed && data?.windowDays !== windowDays;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/insights?windowDays=${windowDays}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (ok && body.success) {
          setData(body.data);
          setFailed(false);
        } else {
          setFailed(true);
          setFailMessage(body?.error || "Failed to load insights.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setFailMessage("Network error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const cafe = data?.cafe;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={22} />
            <h1 className="text-2xl font-bold">Deep Insights</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Peak hours, best sellers and repeat customers for your café.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
          {WINDOW_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setWindowDays(n)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                windowDays === n
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              )}
            >
              Last {n}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded-2xl border border-border animate-pulse h-20"
              />
            ))}
          </div>
          <div className="bg-surface rounded-2xl border border-border animate-pulse h-64" />
        </div>
      ) : failed || !cafe ? (
        <div className="text-center py-12 text-muted">{failMessage}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SummaryTile
              icon={<Receipt size={18} />}
              label="Orders"
              value={cafe.totalOrders.toLocaleString()}
              color="text-foreground bg-surface"
            />
            <SummaryTile
              icon={<TrendingUp size={18} />}
              label="Revenue"
              value={paiseToCurrencyShort(cafe.totalRevenue)}
              color="text-green-600 bg-green-50 dark:bg-green-500/10"
            />
            <SummaryTile
              icon={<Utensils size={18} />}
              label="Avg order value"
              value={paiseToCurrencyShort(cafe.avgOrderValuePaise)}
              color="text-purple-600 bg-purple-50 dark:bg-purple-500/10"
            />
            <SummaryTile
              icon={<Clock size={18} />}
              label="Busiest hour"
              value={cafe.peakHour !== null ? formatHour(cafe.peakHour) : "-"}
              color="text-primary bg-primary/10"
            />
          </div>

          <CafeInsightCard cafe={cafe} hideHeader />
        </>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            color
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted truncate">{label}</p>
          <p className="text-base font-bold truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}
