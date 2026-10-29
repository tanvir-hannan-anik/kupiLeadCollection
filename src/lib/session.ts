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

/** `version` must match admins.session_version, so bumping it revokes old tokens. */
export async function signSession(email: string, version: number): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("ADMIN_JWT_SECRET is missing or shorter than 32 characters.");
  return new SignJWT({ role: "admin", ver: version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

export type SessionClaims = { email: string; version: number };

/** Returns the admin email and session version from a valid token, or null. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.role === "admin" && typeof payload.sub === "string" && typeof payload.ver === "number"
      ? { email: payload.sub, version: payload.ver }
      : null;
  } catch {
    return null;
  }
}
