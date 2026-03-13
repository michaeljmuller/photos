import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

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

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "changeme";

  if (username !== expectedUsername) return false;

  // Support both plain text and bcrypt hashes
  if (expectedPassword.startsWith("$2")) {
    return bcrypt.compare(password, expectedPassword);
  }
  return password === expectedPassword;
}
