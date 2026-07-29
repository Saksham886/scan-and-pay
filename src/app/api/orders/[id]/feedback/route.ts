import { NextResponse } from "next/server";
import { orderService } from "@/backend/services/order.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";
import { corsPreflightResponse } from "@/backend/lib/cors";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function OPTIONS() {
  return corsPreflightResponse();
}

/**
 * POST /api/orders/[id]/feedback
 * Records a 1-5 star rating for a completed order. Called from the kiosk's
 * post-order review screen.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimitResponse(`order-feedback:${getClientIp(request)}`, {
      max: 20,
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

    const rating =
      body && typeof body === "object" ? (body as Record<string, unknown>).rating : undefined;

    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    try {
      await orderService.submitFeedback(orderId, rating);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit feedback";
      const status = message === "Order not found" ? 404 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }

    return NextResponse.json({ success: true, data: { orderId, rating } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
