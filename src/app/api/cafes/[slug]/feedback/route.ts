import { NextResponse } from "next/server";
import { feedbackService } from "@/backend/services/feedback.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

/**
 * POST /api/cafes/[slug]/feedback
 * Standalone star-rating feedback from the customer home screen, decoupled
 * from any specific order.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(request);
    const burst = await rateLimitResponse(`cafe-feedback-burst:${ip}`, { max: 10, windowMs: 60 * 1000 });
    if (burst) return burst;
    const sustained = await rateLimitResponse(`cafe-feedback-hour:${ip}`, { max: 60, windowMs: 60 * 60 * 1000 });
    if (sustained) return sustained;

    const { slug } = await params;
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ success: false, error: "Invalid cafe slug" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
    }

    const { rating, comment } = body as Record<string, unknown>;
    if (typeof rating !== "number") {
      return NextResponse.json({ success: false, error: "rating is required" }, { status: 400 });
    }
    if (comment !== undefined && typeof comment !== "string") {
      return NextResponse.json({ success: false, error: "comment must be a string" }, { status: 400 });
    }

    const result = await feedbackService.createFeedback(slug, rating, comment as string | undefined);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit feedback";
    const status = message.includes("not found") || message.includes("inactive") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
