import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

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
    const cafe = await adminRepository.getCafeById(id);

    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    // Strip secrets — never expose them to the client
    const {
      phonepeSaltKey: _saltKey,
      razorpayKeySecret: _razorpaySecret,
      razorpayWebhookSecret: _razorpayWebhookSecret,
      ...safeData
    } = cafe as typeof cafe & {
      phonepeSaltKey?: string;
      razorpayKeySecret?: string;
      razorpayWebhookSecret?: string;
    };
    return NextResponse.json({ success: true, data: safeData });
  } catch (error) {
    console.error("Admin cafe detail error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch cafe" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { name, address, phone, openingTime, closingTime } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Cafe name is required" }, { status: 400 });
    }

    const updated = await adminRepository.updateCafe(id, {
      name: name.trim(),
      address: address?.trim() || undefined,
      phone: phone?.trim() || undefined,
      openingTime: openingTime?.trim() || undefined,
      closingTime: closingTime?.trim() || undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin update cafe error:", error);
    return NextResponse.json({ success: false, error: "Failed to update cafe" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const cafe = await adminRepository.getCafeById(id);
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    // If cafe has orders, soft-delete (deactivate). Otherwise hard-delete.
    if (cafe._count.orders > 0) {
      await adminRepository.deleteCafe(id);
    } else {
      await adminRepository.hardDeleteCafe(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete cafe error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete cafe" }, { status: 500 });
  }
}
