import { cn } from "@/shared/utils/cn";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "veg" | "nonveg";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default: "bg-white/[0.06] text-muted border border-white/[0.08]",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  danger: "bg-danger/10 text-danger border border-danger/20",
  info: "bg-info/10 text-info border border-info/20",
  veg: "bg-success/10 text-success border border-success/25",
  nonveg: "bg-danger/10 text-danger border border-danger/25",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
