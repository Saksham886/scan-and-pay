import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";
import { hashPassword } from "@/backend/lib/utils/password";
import { validateEmail } from "@/shared/utils/validation";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cafes = await adminRepository.getAllCafes();
    // Strip secrets — never expose them to the client
    const safeCafes = cafes.map((c) => {
      const { phonepeSaltKey: _sk, razorpayKeySecret: _rks, razorpayWebhookSecret: _rws, ...rest } = c as typeof c & {
        phonepeSaltKey?: string | null;
        razorpayKeySecret?: string | null;
        razorpayWebhookSecret?: string | null;
      };
      return rest;
    });
    return NextResponse.json({ success: true, data: safeCafes });
  } catch (error) {
    console.error("Admin cafes error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch cafes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Cafe name is required" },
        { status: 400 }
      );
    }

    if (!body.address || !String(body.address).trim()) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    if (!body.phone || !String(body.phone).trim()) {
      return NextResponse.json(
        { success: false, error: "Phone is required" },
        { status: 400 }
      );
    }

    // Owner credentials are required when creating a cafe
    if (!body.ownerName || !body.ownerEmail || !body.ownerPassword) {
      return NextResponse.json(
        { success: false, error: "Owner name, email, and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(body.ownerEmail).trim().toLowerCase();
    const emailCheck = validateEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return NextResponse.json({ success: false, error: emailCheck.error }, { status: 400 });
    }

    // Cafe URL slug is its own field now — no longer derived from the
    // owner's email, so any email address works.
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json(
        { success: false, error: "URL slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    const cafe = await adminRepository.createCafe({
      name: body.name,
      slug,
      address: String(body.address).trim(),
      phone: String(body.phone).trim(),
      imageUrl: body.imageUrl,
    });

    // Create the owner user for this cafe
    const passwordHash = await hashPassword(body.ownerPassword);
    const owner = await adminRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      name: body.ownerName,
      role: "CAFE_OWNER",
      cafeId: cafe.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...cafe,
        owner: { id: owner.id, email: owner.email, name: owner.name },
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create cafe";
    const isDuplicate = message.includes("Unique constraint");
    // The driver adapter nests the violated constraint's field names
    // differently than the classic engine (see order.service.ts's
    // isIdempotencyKeyConflict) — match broadly against the serialized error
    // instead of one fixed property path to tell slug vs email conflicts apart.
    const errBlob = JSON.stringify((error as { meta?: unknown })?.meta ?? {}).toLowerCase() + message.toLowerCase();
    const duplicateField = errBlob.includes("slug") ? "slug" : errBlob.includes("email") ? "email" : null;
    console.error("Admin create cafe error:", error);
    return NextResponse.json(
      {
        success: false,
        error: isDuplicate
          ? duplicateField === "slug"
            ? "This URL is already taken by another cafe"
            : "A user with this email already exists"
          : message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
