import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

// Report boundaries follow the cafe's local clock, not the server's (UTC on
// Vercel) — otherwise "Today" starts at ~5:30am IST and periods roll over at
// the wrong time. 330 = IST (UTC+5:30); override with REPORTING_TZ_OFFSET_MINUTES.
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

  let from: Date;
  switch (range) {
    case "today":
      from = localMidnight(y, m, d);
      break;
    case "week":
      from = localMidnight(y, m, d - local.getUTCDay()); // start of local week (Sun)
      break;
    case "month":
      from = localMidnight(y, m, 1);
      break;
    case "year":
      from = localMidnight(y, 0, 1);
      break;
    case "all":
    default:
      from = new Date(0);
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
