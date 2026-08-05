"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Star } from "lucide-react";

interface WrittenFeedbackScreenProps {
  cafeSlug: string;
  cafeName: string;
}

const AUTO_REDIRECT_SECONDS = 5;
const MAX_COMMENT_LEN = 1000;
const MONO = { fontFamily: "var(--font-jb-mono), monospace" };
const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

/**
 * Free-text feedback for customers who want to say more than the quick survey
 * asks. Submits the older `{ rating, comment }` shape to the same feedback
 * endpoint, so it lands in the feedback section alongside survey responses and
 * renders as a star rating plus the written note.
 */
export function WrittenFeedbackScreen({ cafeSlug, cafeName }: WrittenFeedbackScreenProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);

  const complete = rating >= 1 && comment.trim().length > 0;

  useEffect(() => {
    if (!submitted) return;
    if (countdown <= 0) {
      router.push(`/${cafeSlug}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [submitted, countdown, router, cafeSlug]);

  const handleSubmit = async () => {
    if (!complete) {
      setError("Please give a rating and write your feedback.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cafes/${cafeSlug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          ...(name.trim() && { customerName: name.trim() }),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to submit feedback");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="customer-app min-h-screen flex flex-col"
      style={{
        background: "#111222",
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(160,120,255,0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(205,242,0,0.04) 0px, transparent 50%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div
        className="bg-[#0c0d1d] border-b-2 border-[#494454] sticky top-0 z-10"
        style={{ boxShadow: "0 4px 0px 0px rgba(0,0,0,1)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.push(`/${cafeSlug}/feedback`)}
            className="w-9 h-9 border-2 border-[#494454] flex items-center justify-center text-[#cbc3d7] hover:border-[#e2e0f8] hover:text-[#e2e0f8] transition-colors duration-75"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold leading-tight text-[#e2e0f8] uppercase" style={DISPLAY}>
              Write Feedback
            </h1>
            <p className="text-xs text-[#cbc3d7]" style={MONO}>
              {cafeName}
            </p>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-in-up">
          <div className="w-20 h-20 border-2 border-[#cdf200]/60 flex items-center justify-center mb-5">
            <CheckCircle2 size={40} className="text-[#cdf200]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#e2e0f8] mb-2 uppercase" style={DISPLAY}>
            Thank You!
          </h2>
          <p className="text-sm text-[#cbc3d7] mb-6" style={MONO}>
            Your feedback helps us improve.
          </p>
          <p className="text-xs text-[#494454] mb-6" style={MONO}>
            Back to home in <span className="text-[#cdf200] font-semibold">{countdown}s</span>
          </p>
          <button
            onClick={() => router.push(`/${cafeSlug}`)}
            className="bg-[#cdf200] text-black border-2 border-black px-8 py-3 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 rounded-full"
            style={MONO}
          >
            Back to Home
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full animate-fade-in-up">
          <p className="text-center text-[#e2e0f8] font-bold uppercase" style={DISPLAY}>
            Tell us in your own words
          </p>
          <p className="text-center text-xs text-[#cbc3d7] mt-2" style={MONO}>
            Rate your experience and share whatever you&apos;d like.
          </p>

          {/* Name (optional) */}
          <div className="mt-8">
            <p className="text-sm font-bold text-[#e2e0f8]" style={MONO}>
              Name <span className="text-[#494454]">(optional)</span>
            </p>
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full mt-2.5 border-2 border-[#494454] bg-[#1e1e2f] px-4 py-3 text-[#e2e0f8] placeholder:text-[#494454] focus:outline-none focus:border-[#cdf200] text-sm transition-colors"
              style={{ borderRadius: 0, ...MONO }}
            />
          </div>

          {/* Star rating */}
          <div className="mt-7">
            <p className="text-sm font-bold text-[#e2e0f8]" style={MONO}>
              Your rating <span className="text-[#ffb4ab]">*</span>
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="p-1"
                >
                  <Star
                    size={34}
                    className={
                      (hover || rating) >= n
                        ? "fill-[#cdf200] text-[#cdf200]"
                        : "text-[#494454]"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mt-7">
            <p className="text-sm font-bold text-[#e2e0f8]" style={MONO}>
              Your feedback <span className="text-[#ffb4ab]">*</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_COMMENT_LEN}
              rows={6}
              placeholder="Tell us what you loved or what we can improve..."
              className="w-full mt-2.5 border-2 border-[#494454] bg-[#1e1e2f] px-4 py-3 text-[#e2e0f8] placeholder:text-[#494454] focus:outline-none focus:border-[#cdf200] text-sm transition-colors resize-none"
              style={{ borderRadius: 0, ...MONO }}
            />
            <p className="text-right text-[11px] text-[#494454] mt-1" style={MONO}>
              {comment.length}/{MAX_COMMENT_LEN}
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-[#ffb4ab]/10 text-[#ffb4ab] text-sm p-3.5 border-2 border-[#ffb4ab]/40" style={MONO}>
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={submitting || !complete}
            onClick={handleSubmit}
            className="w-full mt-7 bg-[#cdf200] disabled:bg-[#333345] disabled:text-[#cbc3d7] disabled:shadow-none text-black border-2 border-black py-4 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 rounded-full"
            style={MONO}
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
