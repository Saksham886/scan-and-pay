import { NextResponse } from "next/server";
import { paymentService } from "@/backend/services/payment.service";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import { orderService } from "@/backend/services/order.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * POST /api/orders/[id]/reconcile
 * Triggers a server-side payment status check with PhonePe.
 * Called by the payment-return page when the user comes back from PhonePe.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`reconcile:${getClientIp(request)}`, {
      max: 30,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const { id: orderId } = await params;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ success: false, error: "Invalid order id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    const merchantTxnId =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).merchantTransactionId === "string"
        ? ((body as Record<string, unknown>).merchantTransactionId as string)
        : null;

    if (!merchantTxnId || merchantTxnId.length === 0 || merchantTxnId.length > 64) {
      return NextResponse.json(
        { success: false, error: "merchantTransactionId is required" },
        { status: 400 }
      );
    }

    // Verify the txn belongs to this order (BOLA / IDOR defence)
    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment || payment.orderId !== orderId) {
      return NextResponse.json(
        { success: false, error: "Payment not found for this order" },
        { status: 404 }
      );
    }

    if (payment.status === "SUCCESS") {
      const order = await orderService.getOrderStatus(orderId);
      return NextResponse.json({ success: true, data: order });
    }

    const reconcileResult = await paymentService.reconcilePayment(merchantTxnId);
    const order = await orderService.getOrderStatus(orderId);

    if (reconcileResult === "pending") {
      return NextResponse.json({ success: false, error: "Payment still pending" }, { status: 202 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reconcile payment" },
      { status: 500 }
    );
  }
}
