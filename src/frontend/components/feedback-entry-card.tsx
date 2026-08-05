import { Card } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Star, Store, User, UtensilsCrossed } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { FEEDBACK_ANSWER_LABELS, type FeedbackEntry } from "@/shared/types";

/** Answers that read as praise, a warning, or a complaint - drives badge colour. */
const NEGATIVE_ANSWERS = new Set(["NEEDS_IMPROVEMENT", "OFTEN_DIRTY", "NOT_ENOUGH_VARIETY", "POOR"]);
const NEUTRAL_ANSWERS = new Set(["AVERAGE", "MOSTLY_CLEAN", "DECENT", "GOOD"]);

function answerVariant(value: string): "success" | "warning" | "danger" {
  if (NEGATIVE_ANSWERS.has(value)) return "danger";
  if (NEUTRAL_ANSWERS.has(value)) return "warning";
  return "success";
}

function label(value: string): string {
  return FEEDBACK_ANSWER_LABELS[value] ?? value;
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-border"} />
      ))}
    </div>
  );
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Answer({ question, value }: { question: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] text-muted uppercase tracking-wide font-medium w-28 flex-shrink-0">
        {question}
      </span>
      <Badge variant={answerVariant(value)}>{label(value)}</Badge>
    </div>
  );
}

/**
 * One feedback submission, shared by the owner dashboard and the admin console.
 * Renders the cafeteria survey when present and falls back to the star rating
 * for entries left before the survey replaced it.
 */
export function FeedbackEntryCard({ entry, showCafe = false }: { entry: FeedbackEntry; showCafe?: boolean }) {
  const isSurvey = entry.overallExperience !== null;

  return (
    <Card className={cn(entry.comment && "pb-4")}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isSurvey ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground min-w-0">
              <User size={13} className="text-muted flex-shrink-0" />
              <span className="truncate">{entry.customerName || "Anonymous"}</span>
            </span>
          ) : (
            <>
              <StarRow rating={entry.rating} />
              {entry.customerName && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground min-w-0">
                  <User size={13} className="text-muted flex-shrink-0" />
                  <span className="truncate">{entry.customerName}</span>
                </span>
              )}
            </>
          )}
          {entry.mealSession && (
            <span className="inline-flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] text-muted text-[11px] font-semibold px-2 py-0.5 rounded-full">
              <UtensilsCrossed size={10} />
              {label(entry.mealSession)}
            </span>
          )}
          {showCafe && entry.cafeName && (
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
              <Store size={10} />
              {entry.cafeName}
            </span>
          )}
        </div>
        <span className="text-xs text-muted flex-shrink-0">{timeAgo(entry.createdAt)}</span>
      </div>

      {isSurvey && (
        <div className="grid gap-2 sm:grid-cols-2">
          {entry.foodQuality && <Answer question="Food" value={entry.foodQuality} />}
          {entry.cleanliness && <Answer question="Cleanliness" value={entry.cleanliness} />}
          {entry.menuVariety && <Answer question="Menu variety" value={entry.menuVariety} />}
          {entry.overallExperience && <Answer question="Overall" value={entry.overallExperience} />}
        </div>
      )}

      {entry.comment && <p className="text-sm text-foreground mt-2">{entry.comment}</p>}
    </Card>
  );
}
