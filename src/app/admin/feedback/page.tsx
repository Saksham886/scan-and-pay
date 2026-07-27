"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { Star, RefreshCw, MessageSquareText, ChevronDown, Store } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import type { FeedbackEntry } from "@/shared/types";

interface Cafe {
  id: string;
  name: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-border"} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminFeedbackPage() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [cafeId, setCafeId] = useState<string>("all");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/cafes")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCafes(d.data); })
      .catch(() => {});
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (cafeId !== "all") params.set("cafeId", cafeId);
      const res = await fetch(`/api/admin/feedback?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setTotal(data.data.total);
        setAverageRating(data.data.averageRating);
      }
    } catch {
      console.error("Failed to fetch feedback");
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Feedback</h1>
          <p className="text-sm text-muted mt-0.5">Star ratings and comments across every cafe</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <select
              value={cafeId}
              onChange={(e) => setCafeId(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-xl pl-8 pr-9 py-2 text-xs font-medium text-foreground hover:border-primary/40 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all">All Cafes</option>
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Store size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchFeedback}>
            <RefreshCw size={14} className="mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center gap-6 bg-surface rounded-xl border border-border px-5 py-3 mb-5 shadow-sm">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide font-medium">Responses</p>
            <p className="text-lg font-bold">{total}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide font-medium">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{averageRating?.toFixed(1) ?? "-"}</p>
              {averageRating !== null && <StarRow rating={Math.round(averageRating)} />}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-surface-hover rounded w-24 mb-2" />
              <div className="h-3 bg-surface-hover rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText size={48} />}
          title="No feedback yet"
          description="Ratings submitted from cafe home screens will appear here"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className={cn(entry.comment && "pb-4")}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <StarRow rating={entry.rating} />
                  {entry.cafeName && (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      <Store size={10} />
                      {entry.cafeName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">{timeAgo(entry.createdAt)}</span>
              </div>
              {entry.comment && <p className="text-sm text-foreground">{entry.comment}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
