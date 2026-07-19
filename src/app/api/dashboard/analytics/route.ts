import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

function getDateRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (range) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
    default:
      from = new Date(2000, 0, 1);
      break;
  }

  return { from, to };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafeId = session.user.cafeId;
    if (!cafeId) {
      return NextResponse.json({ success: false, error: "No cafe associated" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";
    const { from, to } = getDateRange(range);

    const analytics = await adminRepository.getCafeAnalytics(cafeId, from, to);

    return NextResponse.json({ success: true, data: { ...analytics, range } });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
