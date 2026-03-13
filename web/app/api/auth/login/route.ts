import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSession, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  console.log("[login] POST /api/auth/login");
  try {
    const { username, password } = await request.json();
    console.log("[login] attempting login for user:", username);

    const valid = await verifyCredentials(username, password);
    console.log("[login] credentials valid:", valid);

    if (!valid) {
      console.log("[login] invalid credentials, returning 401");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSession(username);
    console.log("[login] session token created, length:", token.length);
    console.log("[login] JWT_SECRET env var present:", !!process.env.JWT_SECRET);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    console.log("[login] cookie set, returning ok");

    return response;
  } catch (e) {
    console.error("[login] error:", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
