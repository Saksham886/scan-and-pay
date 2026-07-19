import { NextResponse } from "next/server";
import { orderService } from "@/backend/services/order.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

    const order = await orderService.getOrderStatus(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}
