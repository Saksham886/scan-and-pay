"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  FEEDBACK_ANSWER_LABELS,
  FEEDBACK_SURVEY_QUESTIONS,
  type SubmitFeedbackSurveyRequest,
} from "@/shared/types";

interface FeedbackScreenProps {
  cafeSlug: string;
  cafeName: string;
}

const AUTO_REDIRECT_SECONDS = 5;

const MONO = { fontFamily: "var(--font-jb-mono), monospace" };

export function FeedbackScreen({ cafeSlug, cafeName }: FeedbackScreenProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);

  const complete =
    name.trim().length > 0 && FEEDBACK_SURVEY_QUESTIONS.every((q) => answers[q.key]);

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
      setError("Please enter your name and answer every question.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        customerName: name.trim(),
        ...answers,
      } as unknown as SubmitFeedbackSurveyRequest;
      const res = await fetch(`/api/cafes/${cafeSlug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="bg-[#0c0d1d] border-b-2 border-[#494454] sticky top-0 z-10" style={{ boxShadow: "0 4px 0px 0px rgba(0,0,0,1)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.push(`/${cafeSlug}`)}
            className="w-9 h-9 border-2 border-[#494454] flex items-center justify-center text-[#cbc3d7] hover:border-[#e2e0f8] hover:text-[#e2e0f8] transition-colors duration-75"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold leading-tight text-[#e2e0f8] uppercase" style={{ fontFamily: "var(--font-display), sans-serif" }}>
              Feedback
            </h1>
            <p className="text-xs text-[#cbc3d7]" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
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
          <h2 className="text-2xl font-extrabold text-[#e2e0f8] mb-2 uppercase" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Thank You!
          </h2>
          <p className="text-sm text-[#cbc3d7] mb-6" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Your feedback helps us improve.
          </p>
          <p className="text-xs text-[#494454] mb-6" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Back to home in <span className="text-[#cdf200] font-semibold">{countdown}s</span>
          </p>
          <button
            onClick={() => router.push(`/${cafeSlug}`)}
            className="bg-[#cdf200] text-black border-2 border-black px-8 py-3 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 rounded-full"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            Back to Home
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full animate-fade-in-up">
          <p
            className="text-center text-[#e2e0f8] font-bold uppercase"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            How was your experience?
          </p>
          <p className="text-center text-xs text-[#cbc3d7] mt-2" style={MONO}>
            A few quick questions - it takes under a minute.
          </p>

          <div className="mt-8">
            <Prompt text="Name" />
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

          {FEEDBACK_SURVEY_QUESTIONS.map((question) => (
            <div key={question.key} className="mt-7">
              <Prompt text={question.prompt} />
              <div className="mt-2.5 flex flex-col gap-2.5">
                {question.options.map((option) => (
                  <OptionButton
                    key={option}
                    label={FEEDBACK_ANSWER_LABELS[option] ?? option}
                    selected={answers[question.key] === option}
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.key]: option }))}
                  />
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div
              className="mt-6 bg-[#ffb4ab]/10 text-[#ffb4ab] text-sm p-3.5 border-2 border-[#ffb4ab]/40"
              style={MONO}
            >
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

          {!complete && (
            <p className="text-center text-xs text-[#cbc3d7] mt-3" style={MONO}>
              Please answer every question to submit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Question label with the required marker every survey field carries. */
function Prompt({ text }: { text: string }) {
  return (
    <p className="text-sm font-bold text-[#e2e0f8]" style={MONO}>
      {text} <span className="text-[#ffb4ab]">*</span>
    </p>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 border-2 px-4 py-3.5 text-left text-sm transition-all duration-75 ${
        selected
          ? "bg-[#cdf200] border-black text-black font-bold neo-shadow-sm"
          : "bg-[#1e1e2f] border-[#494454] text-[#e2e0f8] hover:border-[#e2e0f8]"
      }`}
      style={{ borderRadius: 0, ...MONO }}
    >
      <span
        className={`w-4 h-4 flex-shrink-0 rounded-full border-2 ${
          selected ? "border-black bg-black/20" : "border-[#494454]"
        }`}
      >
        {selected && <span className="block w-full h-full rounded-full bg-black scale-50" />}
      </span>
      {label}
    </button>
  );
}
