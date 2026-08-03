"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/frontend/components/ui/button";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { RefreshCw, MessageSquareText } from "lucide-react";
import { FeedbackEntryCard, StarRow } from "@/frontend/components/feedback-entry-card";
import type { FeedbackEntry } from "@/shared/types";

export default function DashboardFeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/feedback?limit=100");
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
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Feedback</h1>
          <p className="text-sm text-muted mt-0.5">Cafeteria survey responses left from the home screen</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchFeedback} className="self-start sm:self-auto">
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
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
          description="Ratings submitted from the customer home screen will appear here"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <FeedbackEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
