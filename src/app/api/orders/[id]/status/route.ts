import { NextResponse } from "next/server";
import { orderService } from "@/backend/services/order.service";
import { paymentService } from "@/backend/services/payment.service";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const PENDING_FAIL_AFTER_MS =
  (Number(process.env.PAYMENT_PENDING_FAIL_MINUTES) || 2) * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aggressive rate-limit on this public IDOR-prone endpoint to prevent
    // brute-forcing UUIDs and scraping customer PII.
    const limited = await rateLimitResponse(`order-status:${getClientIp(request)}`, {
      max: 60,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid order id" },
        { status: 400 }
      );
    }

    let order = await orderService.getOrderStatus(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Self-heal a stuck payment: if the order has been PAYMENT_PENDING past the
    // window (a failed/cancelled payment that never sent a terminal signal),
    // actively reconcile it so it resolves to FAILED here instead of lingering
    // as "pending" on the dashboard and the kiosk. Gated on staleness so normal
    // in-flight polls don't hit the gateway on every request; the first such
    // reconcile flips the status, so subsequent polls skip this entirely.
    if (
      order.status === "PAYMENT_PENDING" &&
      Date.now() - new Date(order.createdAt).getTime() > PENDING_FAIL_AFTER_MS
    ) {
      const payments = await paymentRepository.getPaymentsForOrder(id);
      const merchantTxnId = payments[0]?.merchantTxnId;
      if (merchantTxnId) {
        await paymentService.reconcilePayment(merchantTxnId).catch(() => {});
        order = (await orderService.getOrderStatus(id)) ?? order;
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}
