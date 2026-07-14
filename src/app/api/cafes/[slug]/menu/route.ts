import { NextResponse } from "next/server";
import { menuService } from "@/backend/services/menu.service";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await rateLimitResponse(`menu-fetch:${getClientIp(request)}`, {
      max: 120,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const { slug } = await params;
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ success: false, error: "Invalid cafe slug" }, { status: 400 });
    }

    const result = await menuService.getCafeMenu(slug);
    if (!result) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
