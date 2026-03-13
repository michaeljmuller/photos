import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { createSession, verifySession, verifyCredentials } from "../../web/lib/auth";

describe("createSession / verifySession", () => {
  it("round-trips a username through a JWT", async () => {
    const token = await createSession("alice");
    const session = await verifySession(token);
    expect(session).not.toBeNull();
    expect(session!.username).toBe("alice");
  });

  it("verifySession returns null for a garbage string", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
  });

  it("verifySession returns null for a tampered token", async () => {
    const token = await createSession("alice");
    const [header, payload, sig] = token.split(".");
    const tampered = `${header}.${payload}.${sig.slice(0, -4)}xxxx`;
    expect(await verifySession(tampered)).toBeNull();
  });

  it("verifySession returns null for an empty string", async () => {
    expect(await verifySession("")).toBeNull();
  });
});

describe("verifyCredentials", () => {
  const originalUsername = process.env.ADMIN_USERNAME;
  const originalPassword = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    // Reset env before each test
    process.env.ADMIN_USERNAME = "testuser";
    process.env.ADMIN_PASSWORD = "testpass";
  });

  // Restore original env after the suite so other tests aren't affected
  afterEach(() => {
    process.env.ADMIN_USERNAME = originalUsername;
    process.env.ADMIN_PASSWORD = originalPassword;
  });

  it("accepts the correct plain-text password", async () => {
    expect(await verifyCredentials("testuser", "testpass")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await verifyCredentials("testuser", "wrongpass")).toBe(false);
  });

  it("rejects a wrong username", async () => {
    expect(await verifyCredentials("wronguser", "testpass")).toBe(false);
  });

  it("rejects both wrong username and password", async () => {
    expect(await verifyCredentials("wronguser", "wrongpass")).toBe(false);
  });

  it("accepts a bcrypt-hashed password", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    process.env.ADMIN_PASSWORD = hash;
    expect(await verifyCredentials("testuser", "secret123")).toBe(true);
  });

  it("rejects wrong password against a bcrypt hash", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    process.env.ADMIN_PASSWORD = hash;
    expect(await verifyCredentials("testuser", "wrongpass")).toBe(false);
  });
});
