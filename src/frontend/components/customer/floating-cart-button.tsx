"use client";

import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/frontend/stores/cart";
import { paiseToCurrencyShort } from "@/shared/utils/currency";

interface FloatingCartButtonProps {
  onClick: () => void;
}

export function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const totalItems = useCartStore((s) => s.getTotalItems());
  const totalPaise = useCartStore((s) => s.getTotalPaise());

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 z-30 animate-slide-up">
      <button
        onClick={onClick}
        className="relative w-full flex items-center justify-between overflow-hidden bg-[#cdf200] text-black border-2 border-black py-3.5 px-5 rounded-full neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 uppercase"
        style={{ fontFamily: "var(--font-jb-mono), monospace" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag size={20} />
            <span
              key={totalItems}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#a078ff] text-white rounded-full text-[11px] font-bold flex items-center justify-center animate-pop border-2 border-black"
            >
              {totalItems}
            </span>
          </div>
          <div className="text-left">
            <span className="font-bold text-sm block leading-tight">
              {totalItems} {totalItems === 1 ? "item" : "items"} added
            </span>
            <span className="text-[10px] text-black/60 block leading-tight">
              Tap to view cart
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span key={totalPaise} className="font-bold text-lg animate-pop">
            {paiseToCurrencyShort(totalPaise)}
          </span>
          <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center">
            <ArrowRight size={14} />
          </div>
        </div>
      </button>
    </div>
  );
}
