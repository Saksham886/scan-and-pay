import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";

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
    const { provider, phonepeMerchantId, phonepeSaltKey, phonepeSaltIndex } = body;

    if (provider === "RAZORPAY") {
      const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } = body;

      if (!razorpayKeyId?.trim()) {
        return NextResponse.json(
          { success: false, error: "Razorpay Key ID is required" },
          { status: 400 }
        );
      }

      const cafe = await adminRepository.getCafeById(id);
      if (!cafe) {
        return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
      }

      const keySecret = razorpayKeySecret?.trim();
      const existingCafe = cafe as typeof cafe & {
        razorpayKeySecret?: string | null;
        razorpayWebhookSecret?: string | null;
      };
      if (!keySecret && !existingCafe.razorpayKeySecret) {
        return NextResponse.json(
          { success: false, error: "Razorpay Key Secret is required" },
          { status: 400 }
        );
      }

      // Blank webhook secret means "keep existing", same as Key Secret above -
      // it must NOT be sent through as "" or updateCafeRazorpayCredentials
      // will happily overwrite the existing one (its check is `!== undefined`).
      const webhookSecret = razorpayWebhookSecret?.trim() || existingCafe.razorpayWebhookSecret || undefined;

      const updated = await adminRepository.updateCafeRazorpayCredentials(id, {
        razorpayKeyId: razorpayKeyId.trim(),
        razorpayKeySecret: keySecret || existingCafe.razorpayKeySecret!,
        razorpayWebhookSecret: webhookSecret,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (!phonepeMerchantId?.trim()) {
      return NextResponse.json(
        { success: false, error: "PhonePe Merchant ID is required" },
        { status: 400 }
      );
    }

    const cafe = await adminRepository.getCafeById(id);
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    // If salt key is blank but one already exists, keep the existing one
    const saltKey = phonepeSaltKey?.trim();
    const existingCafe = cafe as typeof cafe & { phonepeSaltKey?: string | null };
    if (!saltKey && !existingCafe.phonepeSaltKey) {
      return NextResponse.json(
        { success: false, error: "PhonePe Salt Key is required" },
        { status: 400 }
      );
    }

    const updated = await adminRepository.updateCafePaymentCredentials(id, {
      phonepeMerchantId: phonepeMerchantId.trim(),
      phonepeSaltKey: saltKey || existingCafe.phonepeSaltKey!,
      phonepeSaltIndex: phonepeSaltIndex?.trim() || "1",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin update payment settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const provider = searchParams.get("provider");

    const cafe = await adminRepository.getCafeById(id);
    if (!cafe) {
      return NextResponse.json({ success: false, error: "Cafe not found" }, { status: 404 });
    }

    if (provider === "razorpay") {
      await adminRepository.clearCafeRazorpayCredentials(id);
    } else {
      await adminRepository.clearCafePaymentCredentials(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin remove payment settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove payment settings" },
      { status: 500 }
    );
  }
}
