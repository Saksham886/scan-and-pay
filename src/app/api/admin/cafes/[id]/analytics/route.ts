import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

function getDateRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);

  switch (range) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "week": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "month": {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "year": {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "all":
    default: {
      const from = new Date(0); // epoch
      return { from, to };
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    const { from, to } = getDateRange(range);
    const analytics = await adminRepository.getCafeAnalytics(id, from, to);

    return NextResponse.json({ success: true, data: { ...analytics, range, from: from.toISOString(), to: to.toISOString() } });
  } catch (error) {
    console.error("Cafe analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
