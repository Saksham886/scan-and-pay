import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.cafeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findMany({
      where: { cafeId: session.user.cafeId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Dashboard staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch staff" }, { status: 500 });
  }
}
