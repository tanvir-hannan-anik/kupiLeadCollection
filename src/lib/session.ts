import { jwtVerify, SignJWT } from "jose";

/**
 * Admin sessions: a short-lived HS256 JWT in an httpOnly cookie.
 * No Node-only APIs here, so the proxy can verify tokens too.
 */
export const SESSION_COOKIE = "kupi_admin_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

const ISSUER = "kupi-leads";
const AUDIENCE = "kupi-admin";

function secretKey(): Uint8Array | null {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function isSessionConfigured(): boolean {
  return secretKey() !== null;
}

export async function signSession(email: string): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("ADMIN_JWT_SECRET is missing or shorter than 32 characters.");
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/** Returns the admin email from a valid token, or null. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.role === "admin" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
