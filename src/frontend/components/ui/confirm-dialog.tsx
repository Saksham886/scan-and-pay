"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/shared/utils/cn";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-2xl shadow-black/25 ring-1 ring-border/50 animate-fade-in-up overflow-hidden">
        {/* Danger accent */}
        <div className={cn(
          "absolute top-0 inset-x-0 h-[3px]",
          variant === "danger"
            ? "bg-gradient-to-r from-transparent via-danger to-transparent"
            : "bg-gradient-to-r from-transparent via-primary to-transparent"
        )} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          {/* Icon */}
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4",
            variant === "danger" ? "bg-red-50 text-danger" : "bg-primary/10 text-primary"
          )}>
            <AlertTriangle size={26} />
          </div>

          <h2 className="text-lg font-bold mb-2">{title}</h2>
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            className="flex-1"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
