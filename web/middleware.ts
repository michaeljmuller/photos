import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PATHS = ["/admin", "/api/upload", "/api/tags"];
const PHOTO_SUBPATH_RE = /^\/api\/photos\/[^/]+\/(meta|tags)$/;
const PHOTO_DELETE_RE = /^\/api\/photos\/[^/]+$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) ||
    PHOTO_SUBPATH_RE.test(pathname) ||
    (PHOTO_DELETE_RE.test(pathname) && request.method === "DELETE");

  if (!isProtected) return NextResponse.next();

  // Allow login page through
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  console.log("[middleware] checking auth for:", pathname);

  const token = request.cookies.get("bsa_session")?.value;
  console.log("[middleware] token present:", !!token);

  if (!token) {
    console.log("[middleware] no token, redirecting to login");
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const jwtSecretEnv = process.env.JWT_SECRET;
  console.log("[middleware] JWT_SECRET env var present:", !!jwtSecretEnv);

  const secret = new TextEncoder().encode(
    jwtSecretEnv || "change-this-secret-32-chars-min!!"
  );

  try {
    await jwtVerify(token, secret);
    console.log("[middleware] token verified ok");
    return NextResponse.next();
  } catch (e) {
    console.error("[middleware] token verification failed:", e);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/upload", "/api/tags/:path*", "/api/photos/:filename", "/api/photos/:path*/meta", "/api/photos/:path*/tags"],
};
