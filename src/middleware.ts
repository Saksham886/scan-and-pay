import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware. We can't decode the NextAuth JWT here without bundling the
 * crypto + secret into the edge runtime, so this is a fast-fail layer:
 *  - Block protected routes when no session cookie present (prevents probing).
 *  - The actual role authorization happens in the API routes / layouts via
 *    requireRole() (see src/backend/lib/authz.ts).
 *  - We also enforce request-size and basic header sanity at the edge.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Reject absurdly large request bodies before they hit the runtime.
  const cl = Number(request.headers.get("content-length") || 0);
  if (cl > 10 * 1024 * 1024) {
    return new NextResponse("Payload too large", { status: 413 });
  }

  const isProtectedPage =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isProtectedApi =
    pathname.startsWith("/api/dashboard") || pathname.startsWith("/api/admin");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};
