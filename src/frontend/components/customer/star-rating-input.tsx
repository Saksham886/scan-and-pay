"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center justify-center gap-2" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          className="p-1 transition-transform active:scale-90"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={38}
            strokeWidth={1.5}
            className={cn(
              "transition-colors",
              n <= display ? "fill-[#cdf200] text-[#cdf200]" : "fill-transparent text-[#494454]"
            )}
          />
        </button>
      ))}
    </div>
  );
}
