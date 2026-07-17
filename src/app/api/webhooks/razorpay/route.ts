import { NextResponse } from "next/server";
import { paymentService } from "@/backend/services/payment.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const MAX_WEBHOOK_BODY_BYTES = 32 * 1024; // 32KB hard cap on webhook size
const MAX_HEADER_LEN = 256;

export async function POST(request: Request) {
  try {
    // Limit per-IP webhook spam (Razorpay will retry, but bound it).
    const limited = await rateLimitResponse(`razorpay-webhook:${getClientIp(request)}`, {
      max: 120,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const signature = request.headers.get("X-Razorpay-Signature") || "";
    if (!signature || signature.length > MAX_HEADER_LEN) {
      return NextResponse.json({ success: false, error: "Invalid signature header" }, { status: 400 });
    }

    const body = await request.text();
    if (body.length === 0 || body.length > MAX_WEBHOOK_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "Invalid payload size" }, { status: 400 });
    }

    const result = await paymentService.handleRazorpayWebhook(body, signature);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("[Webhook] razorpay error:", error);
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
