import { NextResponse } from "next/server";
import { paymentService } from "@/backend/services/payment.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const MAX_FIELD_LEN = 128;

function readString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_FIELD_LEN) return null;
  return value;
}

/**
 * POST /api/payments/razorpay/verify
 *
 * Called by the Standard Checkout success handler. Unauthenticated by design
 * — the razorpay_signature is the credential, and it can only be produced by
 * Razorpay using the cafe's key secret.
 */
export async function POST(request: Request) {
  try {
    const limited = await rateLimitResponse(`razorpay-verify:${getClientIp(request)}`, {
      max: 30,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
    }

    const body = raw as Record<string, unknown>;
    const merchantTxnId = readString(body, "merchantTransactionId");
    const razorpayOrderId = readString(body, "razorpayOrderId");
    const razorpayPaymentId = readString(body, "razorpayPaymentId");
    const signature = readString(body, "razorpaySignature");

    if (!merchantTxnId || !razorpayOrderId || !razorpayPaymentId || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    const result = await paymentService.verifyCheckoutPayment({
      merchantTxnId,
      razorpayOrderId,
      razorpayPaymentId,
      signature,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("[Payments] razorpay verify error:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
