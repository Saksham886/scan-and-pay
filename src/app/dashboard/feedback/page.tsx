"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/frontend/components/ui/button";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { RefreshCw, MessageSquareText } from "lucide-react";
import { FeedbackEntryCard } from "@/frontend/components/feedback-entry-card";
import {
  FEEDBACK_ANSWER_LABELS,
  type FeedbackAnswerCount,
  type FeedbackEntry,
  type FeedbackQuestionKey,
  type FeedbackSessionStats,
} from "@/shared/types";

export default function DashboardFeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [sessionStats, setSessionStats] = useState<FeedbackSessionStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/feedback?limit=100");
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setTotal(data.data.total);
        setSessionStats(data.data.sessionStats ?? []);
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
        </div>
      )}

      {!loading && sessionStats.some((stat) => stat.responses > 0) && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2.5 gap-3">
            <h2 className="text-sm font-semibold text-foreground">By meal session</h2>
            <p className="text-[11px] text-muted">Count and share of each answer</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {sessionStats.map((stat) => (
              <SessionStatCard key={stat.session} stat={stat} />
            ))}
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

/** Short column headings - the customer-facing prompts are full sentences. */
const QUESTION_LABELS: Record<FeedbackQuestionKey, string> = {
  foodQuality: "Food quality",
  cleanliness: "Cleanliness",
  menuVariety: "Menu variety",
  overallExperience: "Overall experience",
};

/** How one meal session answered every question, option by option. */
function SessionStatCard({ stat }: { stat: FeedbackSessionStats }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">
          {FEEDBACK_ANSWER_LABELS[stat.session] ?? stat.session}
        </p>
        <span className="text-[11px] text-muted flex-shrink-0">
          {stat.responses} {stat.responses === 1 ? "response" : "responses"}
        </span>
      </div>

      {stat.responses === 0 ? (
        <p className="text-xs text-muted">No responses yet</p>
      ) : (
        <div className="space-y-3.5">
          {stat.questions.map((question) => (
            <div key={question.key}>
              <p className="text-[11px] text-muted uppercase tracking-wide font-medium mb-1.5">
                {QUESTION_LABELS[question.key]}
              </p>
              <div className="space-y-1">
                {question.options.map((option) => (
                  <AnswerRow key={option.value} option={option} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One option: what it was called, how many picked it, and its share. */
function AnswerRow({ option }: { option: FeedbackAnswerCount }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground flex-1 min-w-0 truncate">
        {FEEDBACK_ANSWER_LABELS[option.value] ?? option.value}
      </span>
      <div className="w-14 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${option.pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-5 text-right flex-shrink-0 tabular-nums">
        {option.count}
      </span>
      <span className="text-[11px] text-muted w-9 text-right flex-shrink-0 tabular-nums">
        {Math.round(option.pct)}%
      </span>
    </div>
  );
}
