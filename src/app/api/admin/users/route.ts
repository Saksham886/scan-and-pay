import { NextResponse } from "next/server";
import { adminRepository } from "@/backend/repositories/admin.repository";
import { hashPassword, validatePasswordStrength } from "@/backend/lib/utils/password";
import { requireRole, AuthError } from "@/backend/lib/authz";
import { audit } from "@/backend/lib/audit";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";
import { validateEmail, validateName } from "@/shared/utils/validation";
import { prisma } from "@/backend/lib/db";
import type { UserRole } from "@/generated/prisma";

const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "CAFE_OWNER", "CAFE_STAFF"];

export async function GET(request: Request) {
  try {
    await requireRole("SUPER_ADMIN");

    const limited = await rateLimitResponse(`admin-users-list:${getClientIp(request)}`, {
      max: 60,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const users = await adminRepository.getAllUsers();
    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      cafeId: u.cafeId,
      cafeName: u.cafe?.name,
      isActive: u.isActive,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole("SUPER_ADMIN");

    const limited = await rateLimitResponse(`admin-users-create:${getClientIp(request)}`, {
      max: 20,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
    }

    // Whitelist fields (mass-assignment defence)
    const { email, password, name, role, cafeId } = body as Record<string, unknown>;

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || typeof role !== "string") {
      return NextResponse.json({ success: false, error: "email, password, name, role are required strings" }, { status: 400 });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ success: false, error: emailCheck.error }, { status: 400 });
    }
    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
      return NextResponse.json({ success: false, error: nameCheck.error }, { status: 400 });
    }
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ success: false, error: passwordCheck.error }, { status: 400 });
    }

    if (!ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    // CAFE_OWNER / CAFE_STAFF require a cafeId; SUPER_ADMIN must NOT have one
    let normalizedCafeId: string | null = null;
    if (role === "CAFE_OWNER" || role === "CAFE_STAFF") {
      if (typeof cafeId !== "string" || cafeId.length === 0) {
        return NextResponse.json({ success: false, error: "cafeId is required for cafe roles" }, { status: 400 });
      }
      const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true } });
      if (!cafe) {
        return NextResponse.json({ success: false, error: "cafe not found" }, { status: 404 });
      }
      normalizedCafeId = cafe.id;
    } else if (role === "SUPER_ADMIN" && cafeId !== undefined && cafeId !== null && cafeId !== "") {
      return NextResponse.json({ success: false, error: "SUPER_ADMIN cannot be scoped to a cafe" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await adminRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: role as UserRole,
      cafeId: normalizedCafeId ?? undefined,
    });

    await audit({
      entityType: "User",
      entityId: user.id,
      action: "create",
      actorId: actor.id,
      newData: { email: user.email, role: user.role, cafeId: user.cafeId },
    });

    return NextResponse.json(
      { success: true, data: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
  }
}
