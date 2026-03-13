import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "./auth";

export async function getSessionFromCookies(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
