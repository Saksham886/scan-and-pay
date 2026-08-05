import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

// Rolling windows anchored to the cafe's local clock (UTC on Vercel would make
// "today" start at ~5:30am IST). 330 = IST; override REPORTING_TZ_OFFSET_MINUTES.
const TZ_OFFSET_MS =
  (Number(process.env.REPORTING_TZ_OFFSET_MINUTES) || 330) * 60 * 1000;

/** Local (offset) wall-clock midnight of the given day, as a real UTC instant. */
function localMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - TZ_OFFSET_MS);
}

function getDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  // "Now" shifted so its UTC fields read as the local (IST) wall clock.
  const local = new Date(Date.now() + TZ_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  switch (range) {
    case "today":
      return { from: localMidnight(y, m, d), to };
    case "week":
      return { from: localMidnight(y, m, d - 7), to };
    case "month":
      return { from: localMidnight(y, m - 1, d), to };
    case "year":
      return { from: localMidnight(y - 1, m, d), to };
    case "all":
    default:
      return { from: new Date(0), to };
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
