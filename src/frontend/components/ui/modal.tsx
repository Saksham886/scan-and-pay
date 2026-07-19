"use client";

import { cn } from "@/shared/utils/cn";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-md bg-surface",
          "rounded-t-3xl sm:rounded-2xl",
          "shadow-2xl shadow-black/25 ring-1 ring-border/50",
          "max-h-[92vh] flex flex-col",
          "animate-fade-in-up",
          className
        )}
      >
        {/* Accent line */}
        <div className="absolute top-0 inset-x-10 h-[2.5px] rounded-b-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-muted hover:text-foreground hover:bg-border transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-0">{children}</div>
      </div>
    </div>
  );
}
