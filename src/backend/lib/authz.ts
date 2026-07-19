import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import type { UserRole } from "@/generated/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cafeId: string | null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Throws AuthError if no session. */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Unauthenticated", 401);
  }
  return session.user as SessionUser;
}

/** Throws AuthError if user does not have ANY of the allowed roles. */
export async function requireRole(...allowed: UserRole[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!allowed.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/**
 * Cafe-scoped authorization. SUPER_ADMIN passes for any cafe.
 * CAFE_OWNER / CAFE_STAFF must match cafeId.
 */
export async function requireCafeAccess(cafeId: string): Promise<SessionUser> {
  if (typeof cafeId !== "string" || cafeId.length === 0) {
    throw new AuthError("Invalid cafe id", 400);
  }
  const user = await requireSession();
  if (user.role === "SUPER_ADMIN") return user;
  if (!user.cafeId || user.cafeId !== cafeId) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/** Wraps a handler, converting AuthError into a JSON Response. */
export function authGuard<T extends (req: Request, ctx: Record<string, unknown>) => Promise<Response>>(handler: T): T {
  return (async (req: Request, ctx: Record<string, unknown>) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ success: false, error: e.message }, { status: e.status });
      }
      throw e;
    }
  }) as T;
}
