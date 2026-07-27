import { paiseToCurrencyShort } from "@/shared/utils/currency";
import type { OrderSummary } from "@/shared/types";

const LINE = "--------------------------------";

/**
 * Plain-text receipt for handoff to a kiosk-paired printer app (e.g. via the
 * Web Share API). Plain text over PDF/HTML — thermal receipt printers render
 * it the most predictably with no layout engine involved. Deliberately
 * avoids fixed-width column alignment: the actual printer's character width
 * (32 vs 42 vs other) isn't known here, so name and price are kept on
 * separate lines rather than padded to a guessed width.
 */
export function formatReceiptText(order: OrderSummary): string {
  const lines: string[] = [];

  if (order.cafeName) lines.push(order.cafeName.toUpperCase());
  lines.push(LINE);
  lines.push(`Order #${order.orderNumber}`);
  lines.push(new Date(order.createdAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }));
  if (order.customerName) lines.push(`For: ${order.customerName}`);
  lines.push("");

  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.itemName}`);
    lines.push(item.isSubsidised ? "  Subsidised" : `  ${paiseToCurrencyShort(item.subtotalPaise)}`);
  }

  lines.push(LINE);
  lines.push(order.chargeablePaise === 0 ? "No payment collected" : `Total Paid: ${paiseToCurrencyShort(order.chargeablePaise)}`);
  lines.push(LINE);

  if (order.notes) {
    lines.push(`Note: ${order.notes}`);
    lines.push("");
  }

  lines.push("Thank you for ordering!");

  return lines.join("\n");
}

export function receiptFileName(order: OrderSummary): string {
  return `receipt-${order.orderNumber}.txt`;
}
