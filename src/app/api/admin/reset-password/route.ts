import { NextResponse } from "next/server";
import { prisma } from "@/backend/lib/db";
import { hashPassword, validatePasswordStrength } from "@/backend/lib/utils/password";
import { requireRole, AuthError } from "@/backend/lib/authz";
import { audit } from "@/backend/lib/audit";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";

/**
 * SUPER_ADMIN-only endpoint to reset a user's password.
 * - Enforces strong passwords.
 * - Rate-limited to mitigate abuse.
 * - Audited.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireRole("SUPER_ADMIN");

    const limited = await rateLimitResponse(`reset-password:${getClientIp(request)}`, {
      max: 10,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    const { userId, newPassword } = (body ?? {}) as { userId?: unknown; newPassword?: unknown };

    if (typeof userId !== "string" || userId.length === 0 || typeof newPassword !== "string") {
      return NextResponse.json({ success: false, error: "userId and newPassword are required" }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ success: false, error: strength.error }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Prevent lateral movement: a SUPER_ADMIN cannot reset another SUPER_ADMIN's
    // password (closes the "compromise one admin → take over peers" path).
    // They can still reset their own (recovery flow).
    if (user.role === "SUPER_ADMIN" && user.id !== actor.id) {
      return NextResponse.json(
        { success: false, error: "Cannot reset another SUPER_ADMIN's password" },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await audit({
      entityType: "User",
      entityId: user.id,
      action: "password_reset",
      actorId: actor.id,
      newData: { targetEmail: user.email, targetRole: user.role },
    });

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ success: false, error: "Failed to reset password" }, { status: 500 });
  }
}
