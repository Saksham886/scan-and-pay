import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { prisma } from "@/backend/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const staff = await prisma.staff.findMany({
      where: { cafeId: id, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Get staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, age, mobileNumber } = body;

    if (!name?.trim()) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 80) {
      return NextResponse.json({ success: false, error: "Age must be between 18 and 80" }, { status: 400 });
    }
    if (!mobileNumber?.trim() || !/^\+?[\d\s-]{10,}$/.test(mobileNumber.trim())) {
      return NextResponse.json({ success: false, error: "Valid mobile number is required" }, { status: 400 });
    }

    const cafe = await prisma.cafe.findUnique({ where: { id } });
    if (!cafe) return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });

    const staff = await prisma.staff.create({
      data: {
        cafeId: id,
        name: name.trim(),
        age: Number(age),
        mobileNumber: mobileNumber.trim(),
      },
    });

    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ success: false, error: "Failed to add staff" }, { status: 500 });
  }
}
