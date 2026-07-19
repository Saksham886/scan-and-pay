"use client";

import { cn } from "@/shared/utils/cn";

interface CategoryTabsProps {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="sticky top-0 z-20 bg-[#111222] border-b-2 border-[#494454]">
      <div className="flex gap-2.5 px-4 py-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-full border-2 uppercase tracking-wider",
                "transition-all duration-150 active:scale-95",
                isActive
                  ? "bg-[#cdf200] text-black border-black neo-shadow-sm"
                  : "bg-transparent text-[#cbc3d7] border-[#494454] hover:border-[#a078ff] hover:text-[#e2e0f8]"
              )}
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
