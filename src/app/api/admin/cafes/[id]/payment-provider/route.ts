import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

/**
 * PATCH /api/admin/cafes/[id]/payment-provider
 * Switches which configured gateway (PhonePe/Razorpay) a cafe's orders use,
 * independent of editing either gateway's saved credentials.
 */
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
    const { provider } = body;

    if (provider !== "PHONEPE" && provider !== "RAZORPAY") {
      return NextResponse.json(
        { success: false, error: "provider must be PHONEPE or RAZORPAY" },
        { status: 400 }
      );
    }

    const cafe = await adminRepository.getCafeById(id);
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    const updated = await adminRepository.setCafePaymentProvider(id, provider);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin switch payment provider error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to switch payment provider" },
      { status: 500 }
    );
  }
}
