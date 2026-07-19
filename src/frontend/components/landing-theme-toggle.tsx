"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/frontend/hooks/use-theme";

export function LandingThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
