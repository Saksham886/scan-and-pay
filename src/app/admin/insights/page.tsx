"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/frontend/components/ui/card";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import type { DeepInsightsResponse } from "@/shared/types";
import {
  Sparkles,
  Clock,
  Utensils,
  TrendingUp,
  Store,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
  CafeInsightCard,
  WINDOW_OPTIONS,
  formatHour,
} from "@/frontend/components/dashboard/cafe-insight-card";

export default function DeepInsightsPage() {
  const [data, setData] = useState<DeepInsightsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [selectedCafeId, setSelectedCafeId] = useState<string>("all");

  const loading = !failed && data?.windowDays !== windowDays;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/insights?windowDays=${windowDays}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) {
          setData(d.data);
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const visibleCafes = useMemo(() => {
    if (!data) return [];
    if (selectedCafeId === "all") return data.cafes;
    return data.cafes.filter((c) => c.cafeId === selectedCafeId);
  }, [data, selectedCafeId]);

  const summary = useMemo(() => {
    if (!data) return null;
    const scope = selectedCafeId === "all" ? data.cafes : visibleCafes;
    const total = scope.reduce((acc, c) => acc + c.totalOrders, 0);
    const rev = scope.reduce((acc, c) => acc + c.totalRevenue, 0);
    const activeCafes = scope.filter((c) => c.totalOrders > 0).length;

    const totals = new Array<number>(24).fill(0);
    scope.forEach((c) => c.hourHistogram.forEach((v, i) => (totals[i] += v)));
    let peak = -1;
    let peakCount = 0;
    totals.forEach((v, i) => {
      if (v > peakCount) {
        peak = i;
        peakCount = v;
      }
    });
    return {
      total,
      rev,
      activeCafes,
      totalCafes: data.cafes.length,
      scoped: selectedCafeId !== "all",
      peak: peak < 0 ? null : peak,
      peakCount,
    };
  }, [data, selectedCafeId, visibleCafes]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={22} />
            <h1 className="text-2xl font-bold">Deep Insights</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Business intelligence across every cafe - peak hours, top sellers, repeat customers.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cafe selector */}
          <div className="relative">
            <select
              value={selectedCafeId}
              onChange={(e) => setSelectedCafeId(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-xl pl-3 pr-9 py-2 text-xs font-medium text-foreground hover:border-primary/40 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all">All Cafes</option>
              {data?.cafes.map((c) => (
                <option key={c.cafeId} value={c.cafeId}>
                  {c.cafeName}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
            />
          </div>

          {/* Window toggle */}
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
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border animate-pulse h-64" />
          ))}
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-muted">Failed to load insights.</div>
      ) : (
        <>
          {/* Network summary */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <SummaryTile
                icon={<Store size={18} />}
                label={summary.scoped ? "Selected cafe" : "Cafes with activity"}
                value={
                  summary.scoped
                    ? visibleCafes[0]?.cafeName ?? "-"
                    : `${summary.activeCafes} / ${summary.totalCafes}`
                }
                color="text-purple-600 bg-purple-50 dark:bg-purple-500/10"
              />
              <SummaryTile
                icon={<TrendingUp size={18} />}
                label={summary.scoped ? "Revenue" : "Network revenue"}
                value={paiseToCurrencyShort(summary.rev)}
                color="text-green-600 bg-green-50 dark:bg-green-500/10"
              />
              <SummaryTile
                icon={<Utensils size={18} />}
                label="Orders"
                value={summary.total.toLocaleString()}
                color="text-blue-600 bg-blue-50 dark:bg-blue-500/10"
              />
              <SummaryTile
                icon={<Clock size={18} />}
                label={summary.scoped ? "Busiest hour" : "Busiest hour (network)"}
                value={summary.peak !== null ? formatHour(summary.peak) : "-"}
                color="text-primary bg-primary/10"
              />
            </div>
          )}

          {visibleCafes.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border px-5 py-12 text-center text-muted text-sm">
              No cafes to analyze yet.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleCafes.map((cafe) => (
                <CafeInsightCard key={cafe.cafeId} cafe={cafe} />
              ))}
            </div>
          )}
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
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
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
