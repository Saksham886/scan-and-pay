"use client";

import { Button } from "@/frontend/components/ui/button";
import { CheckCircle2, IndianRupee, Gift, Clock, Hand } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface MenuBundleEntry {
  id: string;
  type: string;
  isActive: boolean;
  isSubsidised: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  EVENING_SNACKS: "Evening Snacks",
  DINNER: "Dinner",
};

interface MenuTypeTabsProps {
  menus: MenuBundleEntry[];
  selectedMenuId: string | null;
  onSelect: (menuId: string) => void;
  onSetActive: (menuId: string) => void;
  onToggleSubsidised: (menuId: string, isSubsidised: boolean) => void;
  autoScheduleEnabled: boolean;
  onToggleAutoSchedule: (enabled: boolean) => void;
  busy?: boolean;
}

/** Only one menu can be active (shown to customers) at a time per cafe. */
export function MenuTypeTabs({
  menus,
  selectedMenuId,
  onSelect,
  onSetActive,
  onToggleSubsidised,
  autoScheduleEnabled,
  onToggleAutoSchedule,
  busy,
}: MenuTypeTabsProps) {
  const selected = menus.find((m) => m.id === selectedMenuId);

  return (
    <div className="mb-6">
      {/* Auto-schedule setting */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface rounded-xl border border-border px-4 py-3 mb-3">
        <div className="flex items-center gap-2">
          {autoScheduleEnabled ? <Clock size={15} className="text-primary" /> : <Hand size={15} className="text-muted" />}
          <div>
            <p className="text-sm font-medium">Auto-schedule menus</p>
            <p className="text-xs text-muted">
              {autoScheduleEnabled
                ? "Following the clock — Breakfast till 11:30am, Lunch till 3:30pm, Evening Snacks till 7pm, then Dinner"
                : "Manual — use “Set as Active” below to choose"}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggleAutoSchedule(!autoScheduleEnabled)}
          disabled={busy}
          role="switch"
          aria-checked={autoScheduleEnabled}
          className={cn(
            "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
            autoScheduleEnabled ? "bg-primary" : "bg-border"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              autoScheduleEnabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto menu-scroll pb-1 mb-3">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => onSelect(menu.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-100 border",
              selectedMenuId === menu.id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface text-muted border-border hover:border-primary/30"
            )}
          >
            {TYPE_LABELS[menu.type] ?? menu.type}
            {menu.isActive && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                selectedMenuId === menu.id ? "bg-white/20" : "bg-success/15 text-success"
              )}>
                <CheckCircle2 size={10} />
                Active
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-3 bg-surface rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="text-sm font-medium">{TYPE_LABELS[selected.type] ?? selected.type}</span>
            {selected.isActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} />
                Shown to customers
              </span>
            ) : (
              <span className="text-xs text-muted">Not shown to customers</span>
            )}
          </div>

          {!selected.isActive && !autoScheduleEnabled && (
            <Button size="sm" variant="secondary" onClick={() => onSetActive(selected.id)} loading={busy}>
              <CheckCircle2 size={14} className="mr-1.5" />
              Set as Active
            </Button>
          )}

          <button
            onClick={() => onToggleSubsidised(selected.id, !selected.isSubsidised)}
            disabled={busy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
              selected.isSubsidised
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600"
                : "border-border text-muted hover:border-primary/30"
            )}
            title={selected.isSubsidised ? "Subsidised — no price shown, no payment collected" : "Paid — customers pay via checkout"}
          >
            {selected.isSubsidised ? <Gift size={13} /> : <IndianRupee size={13} />}
            {selected.isSubsidised ? "Subsidised" : "Paid"}
          </button>
        </div>
      )}
    </div>
  );
}
