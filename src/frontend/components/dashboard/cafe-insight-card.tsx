"use client";

import { useState } from "react";
import { Card } from "@/frontend/components/ui/card";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import type { CafeInsights } from "@/shared/types";
import {
  Clock,
  Calendar,
  Trophy,
  Users2,
  Repeat,
  Armchair,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";

export const WINDOW_OPTIONS = [7, 30, 90] as const;
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatHour(h: number | null): string {
  if (h === null) return "-";
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  const nextHour = (h + 1) % 24;
  const nextSuffix = nextHour < 12 ? "AM" : "PM";
  const nextDisplay = nextHour % 12 === 0 ? 12 : nextHour % 12;
  return `${display}${suffix} – ${nextDisplay}${nextSuffix}`;
}

export function CafeInsightCard({
  cafe,
  hideHeader,
}: {
  cafe: CafeInsights;
  hideHeader?: boolean;
}) {
  const hasData = cafe.totalOrders > 0;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  return (
    <Card className="!p-0 overflow-hidden">
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-border bg-background/60">
          <div>
            <h3 className="font-semibold text-base">{cafe.cafeName}</h3>
            <p className="text-xs text-muted">/{cafe.cafeSlug}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <KpiInline label="Orders" value={cafe.totalOrders.toLocaleString()} />
            <KpiInline label="Revenue" value={paiseToCurrencyShort(cafe.totalRevenue)} />
            <KpiInline label="Avg order" value={paiseToCurrencyShort(cafe.avgOrderValuePaise)} />
          </div>
        </div>
      )}

      {!hasData ? (
        <div className="px-5 py-10 text-center text-sm text-muted">
          No orders yet in this window.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <div className="p-5 space-y-5">
            <InsightRow
              icon={<Clock size={16} className="text-primary" />}
              label="Peak footfall hour"
              value={formatHour(cafe.peakHour)}
              sub={`${cafe.peakHourOrders} orders`}
            />
            <InsightRow
              icon={<Calendar size={16} className="text-muted" />}
              label="Busiest day of week"
              value={cafe.peakDayOfWeek !== null ? DAY_NAMES[cafe.peakDayOfWeek] : "-"}
              sub={`${cafe.peakDayOrders} orders`}
            />

            <InteractiveBars
              title="Orders by hour of day"
              color="primary"
              values={cafe.hourHistogram.map((v, i) => ({
                key: String(i),
                value: v,
                label: formatHour(i),
                sub: `${v} order${v === 1 ? "" : "s"}`,
              }))}
              axisLabels={["12AM", "6AM", "12PM", "6PM", "11PM"]}
              height={64}
              minBarPct={4}
              thin
            />

            <InteractiveBars
              title="Orders by day of week"
              color="blue"
              values={cafe.dayHistogram.map((v, i) => ({
                key: String(i),
                value: v,
                label: DAY_NAMES[i],
                sub: `${v} order${v === 1 ? "" : "s"}`,
              }))}
              inlineLabels
              height={48}
              minBarPct={6}
            />

            <InteractiveBars
              title="Revenue - last 7 days"
              color="green"
              values={cafe.last7DaysRevenue.map((d) => ({
                key: d.date,
                value: d.revenuePaise,
                label: new Date(d.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }),
                sub: `${paiseToCurrencyShort(d.revenuePaise)} · ${d.orders} order${d.orders === 1 ? "" : "s"}`,
              }))}
              height={56}
              minBarPct={4}
            />
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-amber-500" />
                <p className="text-sm font-semibold">Top sellers</p>
              </div>
              {cafe.topItemsByQuantity.length === 0 ? (
                <p className="text-xs text-muted">No items sold yet.</p>
              ) : (
                <ol className="space-y-1">
                  {cafe.topItemsByQuantity.map((item, idx) => {
                    const active = selectedItemId === item.menuItemId;
                    const maxQty = cafe.topItemsByQuantity[0]?.quantitySold || 1;
                    const pct = (item.quantitySold / maxQty) * 100;
                    return (
                      <li key={item.menuItemId}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedItemId(active ? null : item.menuItemId)
                          }
                          className={cn(
                            "relative w-full flex items-center gap-3 text-sm px-2 py-1.5 rounded-lg text-left overflow-hidden transition-colors group",
                            active ? "bg-primary/10" : "hover:bg-surface-hover"
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-y-0 left-0 transition-[width] duration-300 ease-out rounded-lg",
                              active
                                ? "bg-primary/15"
                                : "bg-surface-hover/60 group-hover:bg-surface-hover"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                          <span
                            className={cn(
                              "relative w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                              idx === 0
                                ? "bg-amber-500 text-white"
                                : idx === 1
                                  ? "bg-zinc-400 text-white"
                                  : idx === 2
                                    ? "bg-amber-700 text-white"
                                    : "bg-surface text-muted border border-border"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="relative flex-1 truncate font-medium">
                            {item.name}
                          </span>
                          <span className="relative text-xs text-muted whitespace-nowrap">
                            {item.quantitySold} sold
                          </span>
                          <span className="relative text-xs font-semibold text-green-600 w-16 text-right">
                            {paiseToCurrencyShort(item.revenuePaise)}
                          </span>
                        </button>
                        {active && (
                          <div className="mx-2 mt-1 mb-2 text-[11px] text-muted border-l-2 border-primary/40 pl-2">
                            {item.quantitySold} units generated{" "}
                            <span className="text-foreground font-medium">
                              {paiseToCurrencyShort(item.revenuePaise)}
                            </span>{" "}
                            - avg{" "}
                            {paiseToCurrencyShort(
                              Math.round(item.revenuePaise / Math.max(1, item.quantitySold))
                            )}{" "}
                            per unit
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {cafe.topItemByRevenue && (
              <InsightRow
                icon={<TrendingUp size={16} className="text-green-600" />}
                label="Highest-grossing item"
                value={cafe.topItemByRevenue.name}
                sub={paiseToCurrencyShort(cafe.topItemByRevenue.revenuePaise)}
              />
            )}

            <InsightRow
              icon={<Users2 size={16} className="text-purple-500" />}
              label="Unique customers"
              value={cafe.uniqueCustomers.toLocaleString()}
              sub="identified by phone"
            />

            <InsightRow
              icon={<Repeat size={16} className="text-pink-500" />}
              label="Repeat customer rate"
              value={`${Math.round(cafe.repeatRate * 100)}%`}
              sub={`${cafe.repeatCustomers} repeat / ${cafe.uniqueCustomers} total`}
            />

            {cafe.mostUsedTable && (
              <InsightRow
                icon={<Armchair size={16} className="text-muted" />}
                label="Most-used table"
                value={`Table ${cafe.mostUsedTable.tableNumber}`}
                sub={`${cafe.mostUsedTable.orders} orders`}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function InsightRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

export function KpiInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

interface BarDatum {
  key: string;
  value: number;
  label: string;
  sub: string;
}

const BAR_COLORS = {
  primary: { idle: "bg-primary/60", hover: "bg-primary", empty: "bg-border/40" },
  blue: { idle: "bg-primary/40", hover: "bg-primary/70", empty: "bg-border/40" },
  green: { idle: "bg-green-500/60", hover: "bg-green-500", empty: "bg-border/40" },
} as const;

function InteractiveBars({
  title,
  values,
  color,
  height,
  minBarPct,
  axisLabels,
  inlineLabels,
  thin,
}: {
  title: string;
  values: BarDatum[];
  color: keyof typeof BAR_COLORS;
  height: number;
  minBarPct: number;
  axisLabels?: string[];
  inlineLabels?: boolean;
  thin?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(1, ...values.map((v) => v.value));
  const active = hoverIdx !== null ? values[hoverIdx] : null;
  const palette = BAR_COLORS[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-[18px]">
        <p className="text-xs font-medium text-muted">{title}</p>
        {active ? (
          <p className="text-[11px] font-medium text-foreground">
            <span className="text-muted">{active.label}</span>
            <span className="mx-1 text-border">·</span>
            {active.sub}
          </p>
        ) : null}
      </div>

      <div
        className={cn("flex items-end", thin ? "gap-0.5" : "gap-1")}
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {values.map((v, i) => {
          const pct = v.value === 0 ? 0 : (v.value / max) * 100;
          const isHover = hoverIdx === i;
          return (
            <div key={v.key} className="flex-1 h-full flex flex-col items-center justify-end">
              <div
                role="img"
                aria-label={`${v.label}: ${v.sub}`}
                onMouseEnter={() => setHoverIdx(i)}
                onFocus={() => setHoverIdx(i)}
                tabIndex={0}
                className={cn(
                  "w-full rounded-sm transition-all duration-200 ease-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  v.value === 0 ? palette.empty : isHover ? palette.hover : palette.idle,
                  isHover && "scale-y-[1.03] origin-bottom"
                )}
                style={{ height: `${Math.max(minBarPct, pct)}%` }}
              />
              {inlineLabels && (
                <span
                  className={cn(
                    "text-[10px] mt-1 transition-colors",
                    isHover ? "text-foreground font-medium" : "text-muted"
                  )}
                >
                  {v.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {axisLabels && (
        <div className="flex justify-between text-[10px] text-muted mt-1">
          {axisLabels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
