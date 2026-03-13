import { SignJWT, jwtVerify } from "jose";

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret-32-chars-min!!"
);

export const COOKIE_NAME = "bsa_session";

export async function createSession(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { username: payload.username as string };
  } catch {
    return null;
  }
}
