import { Badge } from "./badge";
import type { OrderStatus } from "@/generated/prisma";

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }
> = {
  CREATED: { label: "Created", variant: "default" },
  PAYMENT_PENDING: { label: "Payment Pending", variant: "warning" },
  PAID: { label: "Paid", variant: "info" },
  PREPARING: { label: "Preparing", variant: "warning" },
  READY: { label: "Ready", variant: "success" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
  FAILED: { label: "Failed", variant: "danger" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
