import bcrypt from "bcryptjs";

export { JWT_SECRET, COOKIE_NAME, createSession, verifySession } from "./jwt";

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
