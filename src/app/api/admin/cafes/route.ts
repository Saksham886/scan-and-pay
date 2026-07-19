import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { adminRepository } from "@/backend/repositories/admin.repository";
import { hashPassword } from "@/backend/lib/utils/password";

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

    // Derive slug from owner email: "owner@branch-name.com" → "branch-name"
    const normalizedEmail = String(body.ownerEmail).trim().toLowerCase();
    const slugMatch = normalizedEmail.match(/^owner@([a-z0-9][a-z0-9-]*)\./);
    if (!slugMatch) {
      return NextResponse.json(
        { success: false, error: "Owner email must be in the format: owner@branch-name.com" },
        { status: 400 }
      );
    }
    const slug = slugMatch[1];

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
    console.error("Admin create cafe error:", error);
    return NextResponse.json(
      { success: false, error: isDuplicate ? "A user with this email already exists" : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
