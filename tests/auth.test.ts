import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession, verifySession } from "@/lib/session";

beforeAll(() => {
  process.env.ADMIN_JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery!", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects missing or malformed hashes", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("JWT sessions", () => {
  it("round-trips the admin email", async () => {
    const token = await signSession("admin@example.com");
    expect(await verifySession(token)).toBe("admin@example.com");
  });

  it("rejects tampered, foreign and expired tokens", async () => {
    const token = await signSession("admin@example.com");
    const [h, , s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "attacker@example.com", role: "admin" })).toString("base64url");
    expect(await verifySession(`${h}.${forgedPayload}.${s}`)).toBeNull();

    const otherKey = new TextEncoder().encode("a-completely-different-secret-of-32+-chars");
    const foreign = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" }).setSubject("admin@example.com")
      .setIssuer("kupi-leads").setAudience("kupi-admin").setExpirationTime("1h").sign(otherKey);
    expect(await verifySession(foreign)).toBeNull();

    const key = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
    const expired = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" }).setSubject("admin@example.com")
      .setIssuer("kupi-leads").setAudience("kupi-admin")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200).setExpirationTime(Math.floor(Date.now() / 1000) - 3600).sign(key);
    expect(await verifySession(expired)).toBeNull();

    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
  });
});
