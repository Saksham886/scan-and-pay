import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.cafeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafe = await prisma.cafe.findUnique({
      where: { id: session.user.cafeId },
      select: { id: true, name: true, slug: true },
    });

    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: cafe });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
