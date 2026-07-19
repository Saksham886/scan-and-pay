"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/frontend/hooks/use-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors ${className ?? ""}`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
